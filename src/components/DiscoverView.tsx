import React, { useState, useEffect } from 'react';
import {
  Play,
  Zap,
  Flame,
  Search,
  Plus,
  Radio,
  Loader2,
  Bookmark,
} from 'lucide-react';
import { RobloxGame } from '../types/launcher';
import { GameCard } from './GameCard';
import { searchRobloxGames, lookupPlaceId } from '../utils/robloxApi';
import heroShowcaseFallback from '../assets/images/roblox_hero_showcase_1793251365201.jpg';

interface DiscoverViewProps {
  games: RobloxGame[];
  bookmarkedPlaceIds?: string[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenInApp?: (game: RobloxGame) => void;
  onLaunchGame: (game: RobloxGame) => void;
  onToggleFavorite: (gameId: string) => void;
  onToggleBookmark?: (game: RobloxGame) => void;
  onInspectServers: (game: RobloxGame) => void;
  onQuickAddCustomGame: (game: RobloxGame) => void;
  onSelectGenreOrSort: (genreOrSort: string) => void;
  isLiveLoading: boolean;
  activeFilter: string;
  onOpenConnectionModal?: () => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  games,
  bookmarkedPlaceIds = [],
  searchQuery,
  onSearchChange,
  onOpenInApp,
  onLaunchGame,
  onToggleFavorite,
  onToggleBookmark,
  onInspectServers,
  onQuickAddCustomGame,
  onSelectGenreOrSort,
  isLiveLoading,
  activeFilter,
  onOpenConnectionModal,
}) => {
  const [placeIdOrUrl, setPlaceIdOrUrl] = useState('');
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // Search results from live Roblox Omni-Search API
  const [liveSearchResults, setLiveSearchResults] = useState<RobloxGame[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  const filters = [
    { id: 'top-playing-now', label: 'Top Playing Now' },
    { id: 'top-trending', label: 'Trending' },
    { id: 'up-and-coming', label: 'Up & Coming' },
    { id: 'fun-with-friends', label: 'With Friends' },
    { id: 'Anime', label: 'Anime' },
    { id: 'Horror', label: 'Horror' },
    { id: 'Tycoon', label: 'Tycoon' },
    { id: 'Simulator', label: 'Simulator' },
    { id: 'PvP', label: 'PvP Combat' },
    { id: 'Roleplay', label: 'Roleplay' },
    { id: 'Survival', label: 'Survival' },
    { id: 'Obby', label: 'Obby' },
  ];

  // Handle live search when searchQuery is typed
  useEffect(() => {
    if (!searchQuery.trim()) {
      setLiveSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLive(true);
      try {
        const results = await searchRobloxGames(searchQuery.trim());
        setLiveSearchResults(results);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearchingLive(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Extract place ID from either raw digits or full roblox.com URL
  const extractPlaceId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/games\/(\d+)/i) || trimmed.match(/placeId=(\d+)/i) || trimmed.match(/^(\d+)$/);
    return match ? match[1] : trimmed;
  };

  const handleResolveAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedId = extractPlaceId(placeIdOrUrl);
    if (!parsedId || !/^\d+$/.test(parsedId)) {
      setResolveError('Please enter a valid numeric Place ID or Roblox game URL.');
      return;
    }

    setIsResolvingPlace(true);
    setResolveError(null);
    try {
      const realGame = await lookupPlaceId(parsedId);
      onQuickAddCustomGame(realGame);
      setPlaceIdOrUrl('');
      setIsAddingCustom(false);
    } catch (err: any) {
      setResolveError(err.message || 'Could not fetch Roblox experience details.');
    } finally {
      setIsResolvingPlace(false);
    }
  };

  // Active game display list (keep bookmark state synced on live search results too)
  const bookmarkedSet = new Set([
    ...bookmarkedPlaceIds,
    ...games.filter((g) => g.isBookmarked).map((g) => g.placeId),
  ]);
  const rawDisplayGames = searchQuery.trim()
    ? liveSearchResults.length > 0
      ? liveSearchResults
      : games.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : games;
  const displayGames = rawDisplayGames.map((g) => ({
    ...g,
    isBookmarked: bookmarkedSet.has(g.placeId),
  }));

  const featuredGame = displayGames[0] || null;

  return (
    <div className="space-y-6">
      {/* Live Roblox Network Connection Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#282a2d] rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-neutral-100">
              <span>Connected to Every Game on Roblox</span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                Omni-Search & Explore APIs Active
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Live streaming 50,000,000+ experiences directly from official Roblox servers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenConnectionModal && (
            <button
              onClick={onOpenConnectionModal}
              className="px-2.5 py-1 text-[11px] font-semibold text-[#1a73e8] dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors whitespace-nowrap"
            >
              Inspect API & Endpoints
            </button>
          )}

          {isLiveLoading && (
            <div className="flex items-center gap-1.5 text-xs text-[#1a73e8] dark:text-[#8ab4f8] font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading Roblox experiences...</span>
            </div>
          )}
        </div>
      </div>

      {/* Hero Showcase Split */}
      {!searchQuery && featuredGame && (
        <div className="relative rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-900 shadow-sm">
          <div className="absolute inset-0">
            <img
              src={featuredGame.bannerImage || featuredGame.thumbnail || heroShowcaseFallback}
              alt={featuredGame.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-40 blur-xs scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
          </div>

          <div className="relative z-10 p-6 md:p-8 max-w-2xl flex flex-col justify-end min-h-[290px]">
            <div className="flex items-start gap-4 mb-4">
              {(featuredGame.iconUrl || featuredGame.thumbnail) && (
                <img
                  src={featuredGame.iconUrl || featuredGame.thumbnail}
                  alt={`${featuredGame.name} Icon`}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover shrink-0 border-2 border-white/25 shadow-xl bg-neutral-800"
                />
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs font-semibold text-neutral-300">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Flame className="w-4 h-4 fill-current" />
                    Featured Experience
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 font-mono tabular-nums">
                    {featuredGame.activePlayers.toLocaleString()} Playing Live
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-blue-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    Official Client Ready
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {featuredGame.name}
                </h1>
              </div>
            </div>

            <p className="text-xs md:text-sm text-neutral-300 line-clamp-2 mb-5 leading-relaxed">
              {featuredGame.description}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => (onOpenInApp ? onOpenInApp(featuredGame) : onLaunchGame(featuredGame))}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-full transition-all shadow-md active:scale-95 whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Open Game in App (Place #{featuredGame.placeId})</span>
              </button>

              <button
                onClick={() => onInspectServers(featuredGame)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-medium rounded-full transition-all border border-white/20 whitespace-nowrap"
              >
                <span>Live Server Cluster & Ping</span>
              </button>

              {onToggleBookmark && (
                <button
                  onClick={() => onToggleBookmark(featuredGame)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 backdrop-blur-md text-xs font-semibold rounded-full transition-all border whitespace-nowrap ${
                    featuredGame.isBookmarked
                      ? 'bg-amber-500/25 border-amber-400/50 text-amber-200'
                      : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${featuredGame.isBookmarked ? 'fill-current' : ''}`} />
                  <span>{featuredGame.isBookmarked ? 'Pinned to Sidebar' : 'Bookmark'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Universal Place ID & URL Connector */}
      <div className="p-4 bg-white dark:bg-[#282a2d] rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#1a73e8] dark:text-[#8ab4f8]" />
              Connect Any Place ID or Game URL from Roblox
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Enter ANY experience Place ID (e.g. <code className="font-mono">189707</code> or <code className="font-mono">roblox.com/games/2753915549</code>) to load its real-time data and launch.
            </p>
          </div>

          {isAddingCustom ? (
            <form onSubmit={handleResolveAndAdd} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Place ID or roblox.com/games/... link"
                value={placeIdOrUrl}
                onChange={(e) => setPlaceIdOrUrl(e.target.value)}
                className="h-8 px-3 text-xs bg-neutral-100 dark:bg-[#303134] rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#1a73e8] w-64"
                autoFocus
                disabled={isResolvingPlace}
              />
              <button
                type="submit"
                disabled={isResolvingPlace || !placeIdOrUrl.trim()}
                className="h-8 px-3.5 text-xs font-semibold bg-[#1a73e8] disabled:bg-neutral-400 text-white rounded-xl hover:bg-[#1557b0] transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                {isResolvingPlace ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Resolving...</span>
                  </>
                ) : (
                  <span>Fetch & Add</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCustom(false);
                  setResolveError(null);
                }}
                className="h-8 px-2.5 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingCustom(true)}
              className="h-8 px-3.5 text-xs font-medium text-[#1a73e8] dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-colors whitespace-nowrap self-start md:self-auto"
            >
              + Enter Place ID / URL
            </button>
          )}
        </div>

        {resolveError && (
          <div className="mt-2.5 p-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-lg border border-red-200 dark:border-red-900">
            {resolveError}
          </div>
        )}
      </div>

      {/* Category / Genre Filter Chips (Interactive Segmented Buttons) */}
      {!searchQuery && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filters.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectGenreOrSort(f.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs font-semibold'
                    : 'bg-neutral-100 dark:bg-[#303134] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#3c4043]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Game Catalog Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {searchQuery ? `Searching Every Game on Roblox for "${searchQuery}"` : `Roblox Experiences (${filters.find(f => f.id === activeFilter)?.label || 'Live'})`}
            </span>
            <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500 tabular-nums">
              ({displayGames.length} games)
            </span>
            {isSearchingLive && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a73e8]" />}
          </div>
        </div>

        {displayGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onOpenInApp={onOpenInApp}
                onLaunch={onLaunchGame}
                onToggleFavorite={onToggleFavorite}
                onToggleBookmark={onToggleBookmark}
                onInspectServers={onInspectServers}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-[#282a2d] rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <Search className="w-8 h-8 text-neutral-400 mb-2" />
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">
              No matching games found
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mb-4">
              Try searching with another game title (e.g. "Blox Fruits", "Arsenal", "Dress to Impress", "Blade Ball") or enter a Place ID.
            </p>
            <button
              onClick={() => setIsAddingCustom(true)}
              className="px-4 py-2 text-xs font-semibold bg-[#1a73e8] text-white rounded-xl hover:bg-[#1557b0] transition-colors"
            >
              Enter Place ID Directly
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
