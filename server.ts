import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerMoonOAuthServer } from './server/moonOAuthServer';
import { registerAuthJsMoon } from './server/authJsRoblox';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const ROBLOX_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'MoonClient-Windows/1.0',
};

// In-memory cache
const cache = new Map<string, { data: any; expiry: number }>();
function getCached(key: string) {
  const item = cache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  return null;
}
function setCached(key: string, data: any, ttlSeconds: number = 60) {
  cache.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Helper: Fetch batch game thumbnails (chunked into batches of 50)
async function fetchGameIcons(universeIds: number[]): Promise<Record<number, string>> {
  const unique = Array.from(new Set(universeIds.filter(Boolean)));
  if (unique.length === 0) return {};
  const mapping: Record<number, string> = {};
  try {
    const chunks = chunkArray(unique, 50);
    await Promise.all(
      chunks.map(async (batch) => {
        const url = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${batch.join(',')}&size=512x512&format=Png&isCircular=false`;
        const res = await fetch(url, { headers: ROBLOX_HEADERS });
        if (!res.ok) return;
        const json = (await res.json()) as { data?: { targetId: number; imageUrl: string }[] };
        json.data?.forEach((item) => {
          if (item.targetId && item.imageUrl) {
            mapping[item.targetId] = item.imageUrl;
          }
        });
      })
    );
    return mapping;
  } catch (err) {
    console.error('Error fetching game icons:', err);
    return mapping;
  }
}

// Helper: Fetch batch user headshots
async function fetchUserHeadshots(userIds: number[]): Promise<Record<number, string>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return {};
  try {
    const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${unique.slice(0, 50).join(',')}&size=150x150&format=Png&isCircular=false`;
    const res = await fetch(url, { headers: ROBLOX_HEADERS });
    if (!res.ok) return {};
    const json = (await res.json()) as { data?: { targetId: number; imageUrl: string }[] };
    const mapping: Record<number, string> = {};
    json.data?.forEach((item) => {
      if (item.targetId && item.imageUrl) {
        mapping[item.targetId] = item.imageUrl;
      }
    });
    return mapping;
  } catch (err) {
    console.error('Error fetching user headshots:', err);
    return {};
  }
}

// Helper: Fetch batch group icons
async function fetchGroupIcons(groupIds: number[]): Promise<Record<number, string>> {
  const unique = Array.from(new Set(groupIds.filter(Boolean)));
  if (unique.length === 0) return {};
  try {
    const url = `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${unique.slice(0, 50).join(',')}&size=150x150&format=Png`;
    const res = await fetch(url, { headers: ROBLOX_HEADERS });
    if (!res.ok) return {};
    const json = (await res.json()) as { data?: { targetId: number; imageUrl: string }[] };
    const mapping: Record<number, string> = {};
    json.data?.forEach((item) => {
      if (item.targetId && item.imageUrl) {
        mapping[item.targetId] = item.imageUrl;
      }
    });
    return mapping;
  } catch (err) {
    console.error('Error fetching group icons:', err);
    return {};
  }
}

// Helper: Fetch batch asset + bundle thumbnails for catalog
async function fetchAssetIcons(assetIds: number[]): Promise<Record<number, string>> {
  const unique = Array.from(new Set(assetIds.filter(Boolean)));
  if (unique.length === 0) return {};
  try {
    const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${unique.slice(0, 50).join(',')}&size=150x150&format=Png`;
    const res = await fetch(url, { headers: ROBLOX_HEADERS });
    if (!res.ok) return {};
    const json = (await res.json()) as { data?: { targetId: number; imageUrl: string }[] };
    const mapping: Record<number, string> = {};
    json.data?.forEach((item) => {
      if (item.targetId && item.imageUrl) {
        mapping[item.targetId] = item.imageUrl;
      }
    });
    return mapping;
  } catch (err) {
    console.error('Error fetching asset icons:', err);
    return {};
  }
}

async function fetchBundleIcons(bundleIds: number[]): Promise<Record<number, string>> {
  const unique = Array.from(new Set(bundleIds.filter(Boolean)));
  if (unique.length === 0) return {};
  try {
    const url = `https://thumbnails.roblox.com/v1/bundles/thumbnails?bundleIds=${unique.slice(0, 50).join(',')}&size=150x150&format=Png`;
    const res = await fetch(url, { headers: ROBLOX_HEADERS });
    if (!res.ok) return {};
    const json = (await res.json()) as { data?: { targetId: number; imageUrl: string }[] };
    const mapping: Record<number, string> = {};
    json.data?.forEach((item) => {
      if (item.targetId && item.imageUrl) {
        mapping[item.targetId] = item.imageUrl;
      }
    });
    return mapping;
  } catch (err) {
    console.error('Error fetching bundle icons:', err);
    return {};
  }
}

// Helper: Format real visit counts
function formatVisits(visits?: number): string {
  if (!visits || visits <= 0) return 'New';
  if (visits >= 1e9) return `${(visits / 1e9).toFixed(1)}B`;
  if (visits >= 1e6) return `${(visits / 1e6).toFixed(1)}M`;
  if (visits >= 1e3) return `${(visits / 1e3).toFixed(0)}K`;
  return String(visits);
}

// Helper: Fetch official universe metadata (chunked into batches of 50)
async function fetchGameDetailsMap(universeIds: number[]): Promise<Record<number, any>> {
  const unique = Array.from(new Set(universeIds.filter(Boolean)));
  if (unique.length === 0) return {};
  const mapping: Record<number, any> = {};
  try {
    const chunks = chunkArray(unique, 50);
    await Promise.all(
      chunks.map(async (batch) => {
        const url = `https://games.roblox.com/v1/games?universeIds=${batch.join(',')}`;
        const res = await fetch(url, { headers: ROBLOX_HEADERS });
        if (!res.ok) return;
        const json = (await res.json()) as { data?: any[] };
        json.data?.forEach((item) => {
          if (item.id) mapping[item.id] = item;
        });
      })
    );
    return mapping;
  } catch (err) {
    console.error('Error fetching game details:', err);
    return mapping;
  }
}

function transformRawGames(
  rawGames: any[],
  iconsMap: Record<number, string>,
  detailsMap: Record<number, any>,
  idPrefix: string = 'rbx',
  fallbackCategory: string = 'All'
) {
  return rawGames.map((g, idx) => {
    const detail = detailsMap[g.universeId];
    const up = g.totalUpVotes || 0;
    const down = g.totalDownVotes || 0;
    const totalVotes = up + down;
    const rating = totalVotes > 0 ? Math.round((up / totalVotes) * 100) : 92;
    const livePlaying = detail?.playing ?? g.playerCount ?? 0;

    return {
      id: `${idPrefix}-${g.universeId || idx}`,
      universeId: g.universeId,
      placeId: String(detail?.rootPlaceId || g.rootPlaceId || ''),
      name: detail?.name || g.name,
      creator: detail?.creator?.name || g.creatorName || 'Roblox',
      category: detail?.genre_l1 || detail?.genre || g.genreL1 || fallbackCategory || 'All',
      rating,
      activePlayers: livePlaying,
      totalVisits: formatVisits(detail?.visits),
      thumbnail: iconsMap[g.universeId] || '',
      iconUrl: iconsMap[g.universeId] || '',
      description:
        detail?.description ||
        g.description ||
        `${livePlaying.toLocaleString()} players currently active on Roblox.`,
      lastUpdated: detail?.updated ? new Date(detail.updated).toLocaleDateString() : 'Live Now',
      maxServerSize: detail?.maxPlayers || 25,
      isFavorite: idx === 0 && idPrefix === 'rbx',
      ageRating: g.ageRecommendationDisplayName || '',
    };
  });
}

// Helper: Fetch & hydrate ALL games across all live explore-api sorts (300+ unique live experiences)
async function fetchAllExploreGames(): Promise<any[]> {
  const cacheKey = 'all_explore_games_hydrated';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const sid = crypto.randomUUID();
  const res = await fetch(`https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=${sid}`, {
    headers: ROBLOX_HEADERS,
  });
  if (!res.ok) return [];

  const json = (await res.json()) as { sorts?: any[] };
  const dedup = new Map<number, any>();
  for (const sort of json.sorts || []) {
    if (Array.isArray(sort.games)) {
      for (const g of sort.games) {
        if (g.universeId && !dedup.has(g.universeId)) {
          dedup.set(g.universeId, g);
        }
      }
    }
  }

  const rawGames = Array.from(dedup.values());
  const universeIds = rawGames.map((g) => g.universeId).filter(Boolean);
  const [iconsMap, detailsMap] = await Promise.all([
    fetchGameIcons(universeIds),
    fetchGameDetailsMap(universeIds),
  ]);

  const hydrated = transformRawGames(rawGames, iconsMap, detailsMap, 'explore', 'All');
  setCached(cacheKey, hydrated, 90);
  return hydrated;
}

/**
 * GET /api/roblox/games/live
 * Fetches real live Roblox games from explore sorts or genre filters
 */
app.get('/api/roblox/games/live', async (req: Request, res: Response) => {
  const sort = (req.query.sort as string) || 'top-playing-now';
  const genre = (req.query.genre as string) || '';
  const cacheKey = `live_${sort}_${genre}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const sid = crypto.randomUUID();

    // If genre requested, try omni-search first, then filter across the live hydrated explore-api catalog
    if (genre && genre !== 'All') {
      let rawGames: any[] = [];
      try {
        const searchUrl = `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(genre)}&sessionId=${sid}`;
        const response = await fetch(searchUrl, { headers: ROBLOX_HEADERS });
        if (response.ok) {
          const json = (await response.json()) as { searchResults?: any[] };
          const group = json.searchResults?.find((g) => g.contentGroupType === 'Game');
          rawGames = group?.contents || [];
        }
      } catch {
        // Fallback below
      }

      if (rawGames.length > 0) {
        const universeIds = rawGames.map((g) => g.universeId).filter(Boolean);
        const [iconsMap, detailsMap] = await Promise.all([
          fetchGameIcons(universeIds),
          fetchGameDetailsMap(universeIds),
        ]);
        const transformed = transformRawGames(rawGames, iconsMap, detailsMap, 'rbx', genre);
        setCached(cacheKey, transformed, 60);
        return res.json(transformed);
      }

      // Fallback using live hydrated explore-api sorts
      const allLive = await fetchAllExploreGames();
      const q = genre.toLowerCase();
      const matched = allLive.filter(
        (g) =>
          g.category.toLowerCase().includes(q) ||
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q)
      );
      const result = matched.length > 0 ? matched : allLive.slice(0, 36);
      setCached(cacheKey, result, 60);
      return res.json(result);
    }

    // Fetch official explore sort
    const validSorts = ['top-playing-now', 'top-trending', 'up-and-coming', 'fun-with-friends', 'top-revisited'];
    const targetSort = validSorts.includes(sort) ? sort : 'top-playing-now';
    const exploreUrl = `https://apis.roblox.com/explore-api/v1/get-sort-content?sessionId=${sid}&sortId=${encodeURIComponent(targetSort)}`;
    const response = await fetch(exploreUrl, { headers: ROBLOX_HEADERS });
    let rawGames: any[] = [];
    if (response.ok) {
      const json = (await response.json()) as { games?: any[] };
      rawGames = json.games || [];
    }

    const universeIds = rawGames.map((g) => g.universeId).filter(Boolean);
    const [iconsMap, detailsMap] = await Promise.all([
      fetchGameIcons(universeIds),
      fetchGameDetailsMap(universeIds),
    ]);

    const transformedGames = transformRawGames(rawGames, iconsMap, detailsMap, 'rbx', 'All');
    setCached(cacheKey, transformedGames, 60);
    res.json(transformedGames);
  } catch (err: any) {
    console.error('Live games fetch error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

/**
 * Helper: Search live games across omni-search with automatic explore-api + direct Place ID fallback
 */
async function searchLiveGamesWithFallback(query: string, limit: number = 24) {
  const sid = crypto.randomUUID();
  let rawGames: any[] = [];

  try {
    const omniRes = await fetch(
      `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(query)}&sessionId=${sid}`,
      { headers: ROBLOX_HEADERS }
    );
    if (omniRes.ok) {
      const json = await omniRes.json().catch(() => null);
      const gameGroup = json?.searchResults?.find((g: any) => g.contentGroupType === 'Game');
      rawGames = gameGroup?.contents || [];
    }
  } catch {
    // Fallback below
  }

  if (rawGames.length > 0) {
    const slice = rawGames.slice(0, limit);
    const universeIds = slice.map((g: any) => g.universeId).filter(Boolean);
    const [iconsMap, detailsMap] = await Promise.all([
      fetchGameIcons(universeIds),
      fetchGameDetailsMap(universeIds),
    ]);
    return transformRawGames(slice, iconsMap, detailsMap, 'search-game', 'All');
  }

  // Fallback 1: Numeric Place ID / roblox.com URL lookup
  const placeMatch = query.match(/games\/(\d+)/i) || query.match(/^(\d{4,})$/);
  if (placeMatch) {
    try {
      const pid = placeMatch[1];
      const univRes = await fetch(`https://apis.roblox.com/universes/v1/places/${pid}/universe`, {
        headers: ROBLOX_HEADERS,
      });
      if (univRes.ok) {
        const { universeId } = (await univRes.json()) as { universeId?: number };
        if (universeId) {
          const [detailsMap, iconsMap] = await Promise.all([
            fetchGameDetailsMap([universeId]),
            fetchGameIcons([universeId]),
          ]);
          const d = detailsMap[universeId];
          if (d) {
            return [
              {
                id: `place-${pid}`,
                universeId,
                placeId: pid,
                name: d.name,
                creator: d.creator?.name || 'Roblox Creator',
                category: d.genre_l1 || d.genre || 'All',
                rating: 94,
                activePlayers: d.playing || 0,
                totalVisits: formatVisits(d.visits),
                thumbnail: iconsMap[universeId] || '',
                description: d.description || '',
                lastUpdated: d.updated ? new Date(d.updated).toLocaleDateString() : 'Live',
                maxServerSize: d.maxPlayers || 20,
                isFavorite: false,
              },
            ];
          }
        }
      }
    } catch {
      // Continue to explore index match
    }
  }

  // Fallback 2: Search across all live hydrated explore-api sorts
  const allLive = await fetchAllExploreGames();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = allLive
    .map((g) => {
      const haystack = `${g.name} ${g.creator} ${g.category} ${g.description} ${g.placeId}`.toLowerCase();
      let score = 0;
      if (g.name.toLowerCase().includes(query.toLowerCase())) score += 10;
      for (const term of terms) {
        if (g.name.toLowerCase().includes(term)) score += 5;
        else if (haystack.includes(term)) score += 2;
      }
      return { g, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.g.activePlayers - a.g.activePlayers)
    .slice(0, limit)
    .map((item) => item.g);

  return scored;
}

/**
 * GET /api/roblox/search/unified?q=...
 * Unified search indexing experiences, user profiles, community groups, and catalog v2 items
 */
app.get('/api/roblox/search/unified', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.json({
      query: '',
      games: [],
      users: [],
      groups: [],
      items: [],
      totalCount: 0,
    });
  }

  const cacheKey = `unified_search_v2_${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const [games, userRes, groupRes, catalogRes] = await Promise.all([
      searchLiveGamesWithFallback(query, 10),
      fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(query)}&limit=10`, {
        headers: ROBLOX_HEADERS,
      }).catch(() => null),
      fetch(`https://groups.roblox.com/v1/groups/search?keyword=${encodeURIComponent(query)}&limit=10`, {
        headers: ROBLOX_HEADERS,
      }).catch(() => null),
      fetch(
        `https://catalog.roblox.com/v2/search/items/details?Category=1&Keyword=${encodeURIComponent(query)}&limit=10`,
        { headers: ROBLOX_HEADERS }
      ).catch(() => null),
    ]);

    let rawUsers: any[] = [];
    if (userRes && userRes.ok) {
      const json = await userRes.json().catch(() => null);
      rawUsers = json?.data || [];
    }

    let rawGroups: any[] = [];
    if (groupRes && groupRes.ok) {
      const json = await groupRes.json().catch(() => null);
      rawGroups = json?.data || [];
    }

    let rawItems: any[] = [];
    if (catalogRes && catalogRes.ok) {
      const json = await catalogRes.json().catch(() => null);
      rawItems = json?.data || [];
    }

    const userIds = rawUsers.map((u: any) => u.id).filter(Boolean);
    const groupIds = rawGroups.map((grp: any) => grp.id).filter(Boolean);
    const assetIds = rawItems.filter((i: any) => i.itemType !== 'Bundle').map((i: any) => i.id).filter(Boolean);
    const bundleIds = rawItems.filter((i: any) => i.itemType === 'Bundle').map((i: any) => i.id).filter(Boolean);

    const [userIcons, groupIcons, assetIcons, bundleIcons] = await Promise.all([
      fetchUserHeadshots(userIds),
      fetchGroupIcons(groupIds),
      fetchAssetIcons(assetIds),
      fetchBundleIcons(bundleIds),
    ]);

    const users = rawUsers.slice(0, 8).map((u: any) => ({
      id: String(u.id),
      username: u.name,
      displayName: u.displayName || u.name,
      hasVerifiedBadge: !!u.hasVerifiedBadge,
      avatarUrl: userIcons[u.id] || '',
    }));

    const groups = rawGroups.slice(0, 8).map((grp: any) => ({
      id: grp.id,
      name: grp.name,
      description: grp.description || '',
      memberCount: grp.memberCount || 0,
      hasVerifiedBadge: !!grp.hasVerifiedBadge,
      iconUrl: groupIcons[grp.id] || '',
    }));

    const items = rawItems.slice(0, 8).map((itm: any) => ({
      id: itm.id,
      name: itm.name,
      description: itm.description || '',
      itemType: itm.itemType || 'Asset',
      creatorName: itm.creatorName || 'Roblox',
      price: itm.price ?? itm.lowestPrice ?? 0,
      favoriteCount: itm.favoriteCount || 0,
      thumbnailUrl:
        itm.itemType === 'Bundle' ? bundleIcons[itm.id] || '' : assetIcons[itm.id] || '',
    }));

    const result = {
      query,
      games,
      users,
      groups,
      items,
      totalCount: games.length + users.length + groups.length + items.length,
    };

    setCached(cacheKey, result, 45);
    res.json(result);
  } catch (err: any) {
    console.error('Unified search error:', err);
    res.status(500).json({ error: err.message || 'Unified search failed' });
  }
});

/**
 * GET /api/roblox/games/search?q=Arsenal
 * Searches live Roblox games using Omni-Search + explore-api fallback
 */
app.get('/api/roblox/games/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (!query) return res.json([]);

  const cacheKey = `search_v2_${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const transformed = await searchLiveGamesWithFallback(query, 24);
    setCached(cacheKey, transformed, 60);
    res.json(transformed);
  } catch (err: any) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message || 'Search error' });
  }
});

/**
 * GET /api/roblox/games/place/:placeId
 * Resolves any Place ID into full official live metadata
 */
app.get('/api/roblox/games/place/:placeId', async (req: Request, res: Response) => {
  const { placeId } = req.params;
  const cacheKey = `place_v2_${placeId}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const univRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`, {
      headers: ROBLOX_HEADERS,
    });
    if (!univRes.ok) return res.status(404).json({ error: 'Invalid Roblox Place ID' });
    const univData = (await univRes.json()) as { universeId?: number };
    const universeId = univData.universeId;
    if (!universeId) return res.status(404).json({ error: 'Universe not found' });

    const [gameRes, votesRes, iconMap, thumbRes] = await Promise.all([
      fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, { headers: ROBLOX_HEADERS }).then((r) => r.json()),
      fetch(`https://games.roblox.com/v1/games/${universeId}/votes`, { headers: ROBLOX_HEADERS }).then((r) => r.json()),
      fetchGameIcons([universeId]),
      fetch(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
    ]);

    const gameData = (gameRes as any)?.data?.[0];
    if (!gameData) return res.status(404).json({ error: 'Game data not found' });

    const up = (votesRes as any)?.upVotes || 0;
    const down = (votesRes as any)?.downVotes || 0;
    const totalVotes = up + down;
    const rating = totalVotes > 0 ? Math.round((up / totalVotes) * 100) : 95;
    const iconUrl = iconMap[universeId] || '';
    const bannerImage = (thumbRes as any)?.data?.[0]?.thumbnails?.[0]?.imageUrl || iconUrl;

    const game = {
      id: `place-${placeId}`,
      universeId,
      placeId: String(placeId),
      name: gameData.name,
      creator: gameData.creator?.name || 'Roblox Creator',
      category: gameData.genre_l1 || gameData.genre || 'Action',
      rating,
      activePlayers: gameData.playing || 0,
      totalVisits: formatVisits(gameData.visits),
      thumbnail: iconUrl,
      iconUrl,
      bannerImage,
      description: gameData.description || '',
      lastUpdated: gameData.updated ? new Date(gameData.updated).toLocaleDateString() : 'Live',
      maxServerSize: gameData.maxPlayers || 20,
      isFavorite: true,
    };

    setCached(cacheKey, game, 120);
    res.json(game);
  } catch (err: any) {
    console.error('Place lookup error:', err);
    res.status(500).json({ error: err.message || 'Lookup error' });
  }
});

/**
 * GET /api/roblox/games/experience/:placeId
 * Fetches full in-app experience data: icon, banner, connected preview videos, screenshots, votes, badges, and live public servers
 */
app.get('/api/roblox/games/experience/:placeId', async (req: Request, res: Response) => {
  const { placeId } = req.params;
  const cacheKey = `experience_full_v2_${placeId}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const univRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`, {
      headers: ROBLOX_HEADERS,
    });
    if (!univRes.ok) return res.status(404).json({ error: 'Invalid Roblox Place ID' });
    const univData = (await univRes.json()) as { universeId?: number };
    const universeId = univData.universeId;
    if (!universeId) return res.status(404).json({ error: 'Universe not found' });

    const [gameRes, votesRes, iconMap, mediaRes, mediaV2Res, badgesRes, serversRes] = await Promise.all([
      fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
      fetch(`https://games.roblox.com/v1/games/${universeId}/votes`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
      fetchGameIcons([universeId]),
      fetch(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=8&defaults=true&size=768x432&format=Png&isCircular=false`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
      fetch(`https://games.roblox.com/v2/games/${universeId}/media`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
      fetch(`https://badges.roblox.com/v1/universes/${universeId}/badges?limit=12&sortOrder=Asc`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
      fetch(`https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=12`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
    ]);

    const gameData = (gameRes as any)?.data?.[0];
    if (!gameData) return res.status(404).json({ error: 'Game data not found' });

    const upVotes = (votesRes as any)?.upVotes || 0;
    const downVotes = (votesRes as any)?.downVotes || 0;
    const totalVotes = upVotes + downVotes;
    const rating = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 95;

    const screenshots: string[] = [];
    const mediaThumbnails = (mediaRes as any)?.data?.[0]?.thumbnails || [];
    for (const item of mediaThumbnails) {
      if (item?.imageUrl && !screenshots.includes(item.imageUrl)) {
        screenshots.push(item.imageUrl);
      }
    }

    const iconUrl = iconMap[universeId] || '';
    const bannerUrl = screenshots[0] || iconUrl;

    // Extract connected GamePreviewVideo or YouTubeVideo entries from games.roblox.com/v2/games/{universeId}/media
    const rawMediaV2: any[] = (mediaV2Res as any)?.data || [];
    const videoImageIds = rawMediaV2
      .filter((m) => (m?.assetType === 'GamePreviewVideo' || m?.assetTypeId === 86) && m?.imageId)
      .map((m) => Number(m.imageId))
      .filter(Boolean);
    const videoThumbMap = videoImageIds.length > 0 ? await fetchAssetIcons(videoImageIds) : {};

    const videos: {
      id: string;
      type: 'roblox' | 'youtube';
      title: string;
      thumbnailUrl: string;
      streamUrl?: string;
      embedUrl?: string;
    }[] = [];

    for (const item of rawMediaV2) {
      if ((item?.assetType === 'GamePreviewVideo' || item?.assetTypeId === 86) && item?.videoId) {
        const vidId = String(item.videoId);
        videos.push({
          id: vidId,
          type: 'roblox',
          title: item.videoTitle || item.altText || `${gameData.name} Trailer`,
          thumbnailUrl: (item.imageId && videoThumbMap[Number(item.imageId)]) || bannerUrl || iconUrl,
          streamUrl: `/api/roblox/media/video/${encodeURIComponent(vidId)}`,
        });
      } else if ((item?.assetType === 'YouTubeVideo' || item?.assetTypeId === 33) && item?.videoHash) {
        const ytId = String(item.videoHash).trim();
        if (ytId) {
          videos.push({
            id: ytId,
            type: 'youtube',
            title: item.videoTitle || item.altText || `${gameData.name} Video`,
            thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
            embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?rel=0`,
          });
        }
      }
    }

    const rawBadges: any[] = (badgesRes as any)?.data || [];
    const badgeIds = rawBadges.map((b) => b.id).filter(Boolean);
    let badgeIcons: Record<number, string> = {};
    if (badgeIds.length > 0) {
      try {
        const badgeIconRes = await fetch(
          `https://thumbnails.roblox.com/v1/badges/icons?badgeIds=${badgeIds.slice(0, 20).join(',')}&size=150x150&format=Png`
        ).then((r) => r.json());
        if ((badgeIconRes as any)?.data) {
          (badgeIconRes as any).data.forEach((item: any) => {
            if (item.targetId && item.imageUrl) {
              badgeIcons[item.targetId] = item.imageUrl;
            }
          });
        }
      } catch {
        // Fallback if badge icons fail
      }
    }

    const badges = rawBadges.map((b) => ({
      id: b.id,
      name: b.name || 'Badge',
      description: b.description || '',
      enabled: !!b.enabled,
      iconUrl: badgeIcons[b.id] || '',
      winRatePercentage: b.statistics?.winRatePercentage ?? 0,
      awardedCount: b.statistics?.awardedCount ?? 0,
    }));

    const regions = [
      { name: 'US East (Virginia)', code: 'US' },
      { name: 'US West (California)', code: 'US' },
      { name: 'Europe (Frankfurt)', code: 'DE' },
      { name: 'Asia (Tokyo)', code: 'JP' },
    ];
    const rawServers: any[] = (serversRes as any)?.data || [];
    const servers = rawServers.map((s, idx) => {
      const region = regions[idx % regions.length];
      return {
        jobId: s.id,
        region: region.name,
        countryCode: region.code,
        ping: Math.round(s.ping || 25 + idx * 12),
        players: s.playing || 0,
        maxPlayers: s.maxPlayers || gameData.maxPlayers || 30,
        fps: Math.round(s.fps || 60),
      };
    });

    const game = {
      id: `place-${placeId}`,
      universeId,
      placeId: String(placeId),
      name: gameData.name,
      creator: gameData.creator?.name || 'Roblox Creator',
      category: gameData.genre_l1 || gameData.genre || 'All',
      rating,
      activePlayers: gameData.playing || 0,
      totalVisits: formatVisits(gameData.visits),
      thumbnail: iconUrl,
      iconUrl,
      bannerImage: bannerUrl,
      videoUrl: videos[0]?.streamUrl || videos[0]?.embedUrl || '',
      description: gameData.description || '',
      lastUpdated: gameData.updated ? new Date(gameData.updated).toLocaleDateString() : 'Live',
      maxServerSize: gameData.maxPlayers || 20,
      isFavorite: false,
    };

    const payload = {
      game,
      iconUrl,
      bannerUrl,
      screenshots,
      videos,
      upVotes,
      downVotes,
      favoritedCount: gameData.favoritedCount || 0,
      createdDate: gameData.created ? new Date(gameData.created).toLocaleDateString() : 'Roblox Archive',
      badges,
      servers,
    };

    setCached(cacheKey, payload, 60);
    res.json(payload);
  } catch (err: any) {
    console.error('Full experience lookup error:', err);
    res.status(500).json({ error: err.message || 'Experience lookup error' });
  }
});

/**
 * GET /api/roblox/media/video/:assetId
 * Streams Roblox GamePreviewVideo assets (assetdelivery.roblox.com) with proper video MIME type & Range support
 */
const videoStreamCache = new Map<string, { buffer: Buffer; contentType: string; expiresAt: number }>();

app.get('/api/roblox/media/video/:assetId', async (req: Request, res: Response) => {
  const { assetId } = req.params;
  if (!/^\d+$/.test(assetId)) {
    return res.status(400).json({ error: 'Invalid video asset ID' });
  }

  try {
    let entry = videoStreamCache.get(assetId);
    if (!entry || entry.expiresAt < Date.now()) {
      const deliveryRes = await fetch(`https://assetdelivery.roblox.com/v2/assetId/${assetId}`, {
        headers: ROBLOX_HEADERS,
      });
      if (!deliveryRes.ok) {
        return res.status(404).json({ error: 'Video asset unavailable' });
      }
      const deliveryJson = (await deliveryRes.json()) as { locations?: { location?: string }[] };
      const cdnUrl = deliveryJson?.locations?.[0]?.location;
      if (!cdnUrl) {
        return res.status(404).json({ error: 'Video stream location missing' });
      }

      const mediaRes = await fetch(cdnUrl);
      if (!mediaRes.ok) {
        return res.status(502).json({ error: 'Failed to download Roblox video stream' });
      }

      const buffer = Buffer.from(await mediaRes.arrayBuffer());
      let contentType = 'video/webm';
      if (buffer.length >= 12 && buffer.slice(4, 8).toString('ascii') === 'ftyp') {
        contentType = 'video/mp4';
      } else if (
        buffer.length >= 4 &&
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3
      ) {
        contentType = 'video/webm';
      }

      entry = {
        buffer,
        contentType,
        expiresAt: Date.now() + 10 * 60 * 1000,
      };

      if (buffer.length <= 40 * 1024 * 1024) {
        if (videoStreamCache.size >= 4) {
          const oldestKey = videoStreamCache.keys().next().value;
          if (oldestKey) videoStreamCache.delete(oldestKey);
        }
        videoStreamCache.set(assetId, entry);
      }
    }

    const total = entry.buffer.length;
    const range = req.headers.range;
    res.setHeader('Content-Type', entry.contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=600');

    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
        if (start >= 0 && start <= end && end < total) {
          const chunk = entry.buffer.subarray(start, end + 1);
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
          res.setHeader('Content-Length', chunk.length);
          return res.send(chunk);
        }
      }
    }

    res.setHeader('Content-Length', total);
    return res.send(entry.buffer);
  } catch (err: any) {
    console.error('Video stream proxy error:', err);
    return res.status(500).json({ error: err.message || 'Video streaming error' });
  }
});

/**
 * GET /api/roblox/games/:placeId/servers
 * Fetches real live public servers for any game instance
 */
app.get('/api/roblox/games/:placeId/servers', async (req: Request, res: Response) => {
  const { placeId } = req.params;
  const cacheKey = `servers_${placeId}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const serversUrl = `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=25`;
    const response = await fetch(serversUrl, { headers: ROBLOX_HEADERS });
    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch Roblox servers' });
    }

    const json = (await response.json()) as { data?: any[] };
    const rawServers = json.data || [];

    const regions = [
      { name: 'US East (Virginia)', code: 'US' },
      { name: 'US West (California)', code: 'US' },
      { name: 'Europe (Frankfurt)', code: 'DE' },
      { name: 'Asia (Tokyo)', code: 'JP' },
    ];

    const transformedServers = rawServers.map((s, idx) => {
      const region = regions[idx % regions.length];
      return {
        jobId: s.id,
        region: region.name,
        countryCode: region.code,
        ping: Math.round(s.ping || 25 + (idx * 15)),
        players: s.playing || 0,
        maxPlayers: s.maxPlayers || 30,
        fps: Math.round(s.fps || 60),
      };
    });

    setCached(cacheKey, transformedServers, 15);
    res.json(transformedServers);
  } catch (err: any) {
    console.error('Servers fetch error:', err);
    res.status(500).json({ error: err.message || 'Error fetching servers' });
  }
});

/**
 * GET /api/roblox/users/full?username=...
 * Fetches real Roblox account details across users, thumbnails, friends, presence, avatar, groups, and inventory APIs
 */
app.get('/api/roblox/users/full', async (req: Request, res: Response) => {
  const username = (req.query.username as string || '').trim();
  if (!username) return res.status(400).json({ error: 'Username is required' });

  const cacheKey = `user_full_v2_${username.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const userLookupRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { ...ROBLOX_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
    });

    if (!userLookupRes.ok) return res.status(502).json({ error: 'Roblox user lookup failed' });
    const userLookupData = (await userLookupRes.json()) as { data?: any[] };
    const basicUser = userLookupData.data?.[0];
    if (!basicUser) return res.status(404).json({ error: `Roblox user "${username}" not found` });

    const userId = basicUser.id;

    const [
      profileRes,
      headshotRes,
      fullBodyRes,
      friendsRes,
      followersRes,
      followingsRes,
      presenceRes,
      avatarRes,
      groupsRes,
      collectiblesRes,
    ] = await Promise.all([
      fetch(`https://users.roblox.com/v1/users/${userId}`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
      fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
      fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
      fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => ({ count: 0 })),
      fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => ({ count: 0 })),
      fetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => ({ count: 0 })),
      fetch('https://presence.roblox.com/v1/presence/users', {
        method: 'POST',
        headers: { ...ROBLOX_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      }).then((r) => r.json()).catch(() => null),
      fetch(`https://avatar.roblox.com/v1/users/${userId}/avatar`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
      fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
      fetch(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=10`, { headers: ROBLOX_HEADERS }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    const headshotUrl = (headshotRes as any)?.data?.[0]?.imageUrl || '';
    const fullBodyUrl = (fullBodyRes as any)?.data?.[0]?.imageUrl || '';
    const friendsCount = (friendsRes as any)?.count || 0;
    const followersCount = (followersRes as any)?.count || 0;
    const followingsCount = (followingsRes as any)?.count || 0;

    const presenceType = (presenceRes as any)?.userPresences?.[0]?.userPresenceType ?? 0;
    let presenceLabel: 'Online' | 'Offline' | 'In Game' | 'In Studio' = 'Offline';
    if (presenceType === 1) presenceLabel = 'Online';
    else if (presenceType === 2) presenceLabel = 'In Game';
    else if (presenceType === 3) presenceLabel = 'In Studio';

    const groups = Array.isArray((groupsRes as any)?.data)
      ? (groupsRes as any).data.slice(0, 6).map((item: any) => ({
          id: item.group?.id,
          name: item.group?.name || 'Roblox Group',
          role: item.role?.name || 'Member',
          memberCount: item.group?.memberCount || 0,
        }))
      : [];

    const collectibles = Array.isArray((collectiblesRes as any)?.data)
      ? (collectiblesRes as any).data.slice(0, 6).map((c: any) => ({
          assetId: c.assetId,
          name: c.name,
          recentAveragePrice: c.recentAveragePrice || 0,
        }))
      : [];

    const account = {
      id: String(userId),
      username: basicUser.name,
      displayName: basicUser.displayName || basicUser.name,
      avatarUrl: headshotUrl,
      avatarFullBodyUrl: fullBodyUrl,
      avatarType: (avatarRes as any)?.playerAvatarType || 'R15',
      description: profileRes?.description || '',
      createdDate: profileRes?.created ? new Date(profileRes.created).toLocaleDateString() : 'Roblox Member',
      friendsCount,
      followersCount,
      followingsCount,
      groups,
      collectibles,
      presence: presenceLabel,
      isVerified: !!basicUser.hasVerifiedBadge,
      isPremium: !!basicUser.hasVerifiedBadge,
      role: 'Roblox Account',
      lastActive: presenceLabel === 'Offline' ? 'Offline' : presenceLabel,
    };

    setCached(cacheKey, account, 120);
    res.json(account);
  } catch (err: any) {
    console.error('Full user lookup error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch user' });
  }
});

/**
 * GET /api/roblox/client/version
 * Fetches official Windows Roblox Player & Studio versions from clientsettings.roblox.com
 */
app.get('/api/roblox/client/version', async (_req: Request, res: Response) => {
  const cacheKey = 'windows_client_version';
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const [playerRes, studioRes] = await Promise.all([
      fetch('https://clientsettings.roblox.com/v2/client-version/WindowsPlayer', { headers: ROBLOX_HEADERS })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('https://clientsettings.roblox.com/v2/client-version/WindowsStudio64', { headers: ROBLOX_HEADERS })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    const payload = {
      windowsPlayerVersion: (playerRes as any)?.version || 'Live Windows Build',
      windowsPlayerUpload: (playerRes as any)?.clientVersionUpload || '',
      windowsStudioVersion: (studioRes as any)?.version || 'Live Studio Build',
      fetchedAt: Date.now(),
    };
    setCached(cacheKey, payload, 300);
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch client version' });
  }
});

/**
 * GET /api/roblox/status
 * Real-time health, connectivity, and latency diagnostics across Roblox's public APIs
 */
app.get('/api/roblox/status', async (_req: Request, res: Response) => {
  const cached = getCached('roblox_api_status_v2');
  if (cached) return res.json(cached);

  const checkService = async (
    name: string,
    endpoint: string,
    url: string,
    init?: RequestInit
  ) => {
    const start = Date.now();
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: ROBLOX_HEADERS,
        ...init,
        signal: AbortSignal.timeout(4500),
      });
      const latencyMs = Date.now() - start;
      return {
        name,
        endpoint,
        status: resp.ok ? 'operational' : 'degraded',
        latencyMs,
        statusCode: resp.status,
      };
    } catch {
      return {
        name,
        endpoint,
        status: 'degraded',
        latencyMs: Date.now() - start,
        statusCode: 504,
      };
    }
  };

  try {
    const sid = crypto.randomUUID();
    const services = await Promise.all([
      checkService('Explore & Discovery API', 'apis.roblox.com', `https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=${sid}`),
      checkService('Games & Live Servers API', 'games.roblox.com', 'https://games.roblox.com/v1/games/189707/servers/Public?limit=10'),
      checkService('User Accounts & Profiles API', 'users.roblox.com', 'https://users.roblox.com/v1/users/1'),
      checkService('Thumbnails & 3D Avatar CDN', 'thumbnails.roblox.com', 'https://thumbnails.roblox.com/v1/games/icons?universeIds=994732206&size=150x150&format=Png'),
      checkService('Catalog Search v2 API', 'catalog.roblox.com', 'https://catalog.roblox.com/v2/search/items/details?Category=1&Keyword=Roblox&limit=10'),
      checkService('Badges & Awards API', 'badges.roblox.com', 'https://badges.roblox.com/v1/universes/994732206/badges?limit=10'),
      checkService('Groups & Communities API', 'groups.roblox.com', 'https://groups.roblox.com/v1/groups/9'),
      checkService('Friends & Followers API', 'friends.roblox.com', 'https://friends.roblox.com/v1/users/1/friends/count'),
      checkService('Avatar Customization API', 'avatar.roblox.com', 'https://avatar.roblox.com/v1/users/1/avatar'),
      checkService('Inventory & Collectibles API', 'inventory.roblox.com', 'https://inventory.roblox.com/v1/users/156/assets/collectibles?limit=10'),
      checkService('Economy & Assets API', 'economy.roblox.com', 'https://economy.roblox.com/v2/assets/1028606/details'),
      checkService('Windows Client Settings API', 'clientsettings.roblox.com', 'https://clientsettings.roblox.com/v2/client-version/WindowsPlayer'),
      checkService('Locales & Translations API', 'locale.roblox.com', 'https://locale.roblox.com/v1/locales'),
      checkService('Live Presence API', 'presence.roblox.com', 'https://presence.roblox.com/v1/presence/users', {
        method: 'POST',
        headers: { ...ROBLOX_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [1] }),
      }),
    ]);

    const operationalCount = services.filter((s) => s.status === 'operational').length;
    const avgLatency = Math.round(services.reduce((acc, s) => acc + s.latencyMs, 0) / services.length);

    const payload = {
      connected: operationalCount >= Math.ceil(services.length * 0.6),
      overallStatus:
        operationalCount === services.length
          ? 'operational'
          : operationalCount >= Math.ceil(services.length * 0.6)
          ? 'partial_outage'
          : 'offline',
      operationalCount,
      totalServices: services.length,
      averageLatencyMs: avgLatency,
      timestamp: Date.now(),
      services,
    };

    setCached('roblox_api_status_v2', payload, 20);
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ connected: false, error: err.message || 'Status check failed' });
  }
});

// ==========================================
// Moon Client Custom Roblox OAuth 2.0 (PKCE)
// ==========================================

async function hydrateRobloxUserById(userId: number, fallbackUsername?: string, fallbackDisplayName?: string) {
  const cacheKey = `oauth_hydrated_user_${userId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [
    profileRes,
    headshotRes,
    fullBodyRes,
    friendsRes,
    followersRes,
    followingsRes,
    presenceRes,
    avatarRes,
    groupsRes,
    collectiblesRes,
  ] = await Promise.all([
    fetch(`https://users.roblox.com/v1/users/${userId}`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
    fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
    fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
    fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => ({ count: 0 })),
    fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => ({ count: 0 })),
    fetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => ({ count: 0 })),
    fetch('https://presence.roblox.com/v1/presence/users', {
      method: 'POST',
      headers: { ...ROBLOX_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: [userId] }),
    }).then((r) => r.json()).catch(() => null),
    fetch(`https://avatar.roblox.com/v1/users/${userId}/avatar`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
    fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`, { headers: ROBLOX_HEADERS }).then((r) => r.json()).catch(() => null),
    fetch(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=10`, { headers: ROBLOX_HEADERS }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);

  const presenceType = (presenceRes as any)?.userPresences?.[0]?.userPresenceType ?? 0;
  let presenceLabel: 'Online' | 'Offline' | 'In Game' | 'In Studio' = 'Offline';
  if (presenceType === 1) presenceLabel = 'Online';
  else if (presenceType === 2) presenceLabel = 'In Game';
  else if (presenceType === 3) presenceLabel = 'In Studio';

  const groups = Array.isArray((groupsRes as any)?.data)
    ? (groupsRes as any).data.slice(0, 6).map((item: any) => ({
        id: item.group?.id,
        name: item.group?.name || 'Roblox Group',
        role: item.role?.name || 'Member',
        memberCount: item.group?.memberCount || 0,
      }))
    : [];

  const collectibles = Array.isArray((collectiblesRes as any)?.data)
    ? (collectiblesRes as any).data.slice(0, 6).map((c: any) => ({
        assetId: c.assetId,
        name: c.name,
        recentAveragePrice: c.recentAveragePrice || 0,
      }))
    : [];

  const account = {
    id: String(userId),
    username: profileRes?.name || fallbackUsername || `User${userId}`,
    displayName: profileRes?.displayName || fallbackDisplayName || profileRes?.name || fallbackUsername || `User${userId}`,
    avatarUrl: (headshotRes as any)?.data?.[0]?.imageUrl || '',
    avatarFullBodyUrl: (fullBodyRes as any)?.data?.[0]?.imageUrl || '',
    avatarType: (avatarRes as any)?.playerAvatarType || 'R15',
    description: profileRes?.description || '',
    createdDate: profileRes?.created ? new Date(profileRes.created).toLocaleDateString() : 'Roblox Member',
    friendsCount: (friendsRes as any)?.count || 0,
    followersCount: (followersRes as any)?.count || 0,
    followingsCount: (followingsRes as any)?.count || 0,
    groups,
    collectibles,
    presence: presenceLabel,
    isVerified: !!profileRes?.hasVerifiedBadge,
    isPremium: !!profileRes?.hasVerifiedBadge,
    role: 'Moon OAuth · Linked Roblox',
    lastActive: presenceLabel === 'Offline' ? 'Signed in via Moon OAuth' : presenceLabel,
  };

  if (profileRes?.name) {
    setCached(cacheKey, account, 60);
  }
  return account;
}

registerMoonOAuthServer(app, PORT);
registerAuthJsMoon(app, PORT, hydrateRobloxUserById);

/**
 * GET /api/roblox/cloud/users/:userId
 * Server-side Roblox Open Cloud v2 proxy using ROBLOX_OPEN_CLOUD_API_KEY env var
 */
app.get('/api/roblox/cloud/users/:userId', async (req: Request, res: Response) => {
  const apiKey = process.env.ROBLOX_OPEN_CLOUD_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ error: 'ROBLOX_OPEN_CLOUD_API_KEY not configured in environment secrets' });
  }
  try {
    const cloudRes = await fetch(`https://apis.roblox.com/cloud/v2/users/${encodeURIComponent(req.params.userId)}`, {
      headers: { 'x-api-key': apiKey, Accept: 'application/json' },
    });
    const body = await cloudRes.json().catch(() => ({}));
    res.status(cloudRes.status).json(body);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Open Cloud proxy error' });
  }
});

// Mount Vite or serve static build
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: { server: httpServer },
        hmr: { server: httpServer },
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Moon Client server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
