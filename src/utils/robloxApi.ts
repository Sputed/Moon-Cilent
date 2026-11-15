import { RobloxGame, ServerInstance, RobloxAccount } from '../types/launcher';

/**
 * Client API services communicating with Roblox proxy backend & self-hosted Moon OAuth
 */

export async function fetchLiveRobloxGames(
  sort: string = 'top-playing-now',
  genre?: string
): Promise<RobloxGame[]> {
  try {
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort);
    if (genre && genre !== 'All') params.set('genre', genre);

    const res = await fetch(`/api/roblox/games/live?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch live games');
    return await res.json();
  } catch (err) {
    console.warn('API error, falling back:', err);
    return [];
  }
}

export async function searchRobloxGames(query: string): Promise<RobloxGame[]> {
  try {
    const res = await fetch(`/api/roblox/games/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    return await res.json();
  } catch (err) {
    console.warn('Search API error:', err);
    return [];
  }
}

export async function lookupPlaceId(placeId: string): Promise<RobloxGame> {
  const res = await fetch(`/api/roblox/games/place/${encodeURIComponent(placeId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Place not found' }));
    throw new Error(err.error || 'Failed to lookup Place ID');
  }
  return await res.json();
}

export async function fetchLiveServers(placeId: string): Promise<ServerInstance[]> {
  try {
    const res = await fetch(`/api/roblox/games/${encodeURIComponent(placeId)}/servers`);
    if (!res.ok) throw new Error('Servers fetch failed');
    return await res.json();
  } catch (err) {
    console.warn('Server fetch error:', err);
    return [];
  }
}

export async function fetchFullRobloxAccount(username: string): Promise<RobloxAccount> {
  const res = await fetch(`/api/roblox/users/full?username=${encodeURIComponent(username)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'User not found' }));
    throw new Error(err.error || `Roblox account "${username}" not found.`);
  }
  return await res.json();
}

export async function fetchUnifiedSearch(query: string): Promise<import('../types/launcher').UnifiedSearchResults> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query: '',
      games: [],
      users: [],
      groups: [],
      items: [],
      totalCount: 0,
    };
  }

  try {
    const res = await fetch(`/api/roblox/search/unified?q=${encodeURIComponent(trimmed)}`);
    if (!res.ok) throw new Error('Unified search failed');
    return await res.json();
  } catch (err) {
    console.warn('Unified search API error:', err);
    return {
      query: trimmed,
      games: [],
      users: [],
      groups: [],
      items: [],
      totalCount: 0,
    };
  }
}

export async function fetchRobloxApiStatus(): Promise<import('../types/launcher').RobloxApiStatus> {
  try {
    const res = await fetch('/api/roblox/status');
    if (!res.ok) throw new Error('Status endpoint failed');
    return await res.json();
  } catch (err) {
    console.warn('Roblox status fetch error:', err);
    return {
      connected: false,
      overallStatus: 'offline',
      operationalCount: 0,
      totalServices: 5,
      averageLatencyMs: 0,
      timestamp: Date.now(),
      services: [],
    };
  }
}

export async function fetchFullExperienceDetails(
  placeId: string
): Promise<import('../types/launcher').RobloxExperienceDetails> {
  const res = await fetch(`/api/roblox/games/experience/${encodeURIComponent(placeId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to load experience details' }));
    throw new Error(err.error || 'Failed to load experience details');
  }
  return await res.json();
}

export async function fetchWindowsClientVersion(): Promise<import('../types/launcher').RobloxClientVersion | null> {
  try {
    const res = await fetch('/api/roblox/client/version');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface MoonOAuthKeysInfo {
  clientId: string;
  clientSecretMasked: string;
  kid: string;
  algorithm: string;
  keyFingerprint: string;
  jwksUri: string;
  discoveryUri: string;
  createdAt: string;
  rotatedAt: string;
}

export interface MoonOAuthStatusResponse {
  engine: string;
  configured: boolean;
  openCloudConfigured: boolean;
  redirectUri: string;
  keys: MoonOAuthKeysInfo;
}

export interface MoonOAuthAuthRequest {
  reqId: string;
  clientId: string;
  scopes: string[];
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  keys: MoonOAuthKeysInfo;
}

export interface RobloxOAuthSessionResponse {
  authenticated: boolean;
  account: RobloxAccount | null;
  oauthConfigured: boolean;
  openCloudConfigured: boolean;
  scopes?: string[];
  expiresAt?: number;
  hasRefreshToken?: boolean;
}

export async function fetchMoonOAuthStatus(): Promise<MoonOAuthStatusResponse | null> {
  try {
    const res = await fetch('/api/oauth/moon/status', { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function rotateMoonOAuthKeysApi(): Promise<MoonOAuthKeysInfo> {
  const res = await fetch('/api/oauth/moon/keys/rotate', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to rotate Moon OAuth keys.');
  }
  const data = (await res.json()) as { keys: MoonOAuthKeysInfo };
  return data.keys;
}

export async function beginMoonOAuthFlow(): Promise<MoonOAuthAuthRequest> {
  // 1. Fetch Auth.js CSRF token
  const csrfRes = await fetch('/auth/csrf', { credentials: 'include' });
  if (!csrfRes.ok) {
    throw new Error('Failed to obtain Auth.js CSRF token');
  }
  const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
  if (!csrfToken) {
    throw new Error('Auth.js returned an empty CSRF token');
  }

  // 2. Initiate Auth.js Moon OAuth authorization request (sets state & PKCE verifier cookies)
  const signInRes = await fetch('/auth/signin/moon', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl: '/oauth-complete',
    }),
  });

  if (!signInRes.ok) {
    throw new Error(`Auth.js sign-in request failed (${signInRes.status})`);
  }

  const data = (await signInRes.json()) as { url?: string };
  if (!data.url) {
    throw new Error('Auth.js did not return an OAuth authorization URL.');
  }

  // 3. Handshake with Moon OAuth Authorization Server using JSON mode for iframe-safe modal
  const parsed = new URL(data.url, window.location.origin);
  const authParams = new URLSearchParams(parsed.search);
  authParams.set('format', 'json');

  const authReqRes = await fetch(`/oauth/authorize?${authParams.toString()}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!authReqRes.ok) {
    const err = await authReqRes.json().catch(() => ({}));
    throw new Error(err.error_description || err.error || 'Failed to start Moon OAuth request.');
  }

  return await authReqRes.json();
}

export async function submitMoonOAuthDecision(payload: {
  reqId: string;
  decision: 'approve' | 'deny';
  mode: 'moon' | 'roblox';
  moonUsername?: string;
  moonDisplayName?: string;
  robloxUsername?: string;
  robloxId?: string;
  picture?: string;
  isVerified?: boolean;
}): Promise<{ denied?: boolean; session?: RobloxOAuthSessionResponse }> {
  const decisionRes = await fetch('/oauth/authorize/decision', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      isVerified: payload.isVerified ? 'true' : 'false',
    }),
  });

  const decisionData = (await decisionRes.json().catch(() => ({}))) as {
    ok?: boolean;
    denied?: boolean;
    callbackUrl?: string;
    error?: string;
  };

  if (!decisionRes.ok && !decisionData.denied) {
    throw new Error(decisionData.error || 'Failed to process Moon OAuth consent.');
  }

  if (decisionData.denied) {
    return { denied: true };
  }

  if (!decisionData.callbackUrl) {
    throw new Error('Moon OAuth did not return a callback URL.');
  }

  // Complete Auth.js callback exchange (verifies state & PKCE, exchanges code -> RS256 JWT tokens, sets session cookie)
  const cbParsed = new URL(decisionData.callbackUrl, window.location.origin);
  await fetch(`${cbParsed.pathname}${cbParsed.search}`, {
    method: 'GET',
    credentials: 'include',
    redirect: 'manual',
  });

  const session = await fetchRobloxOAuthSession();
  return { denied: false, session };
}

export async function resolveRobloxUserForOAuth(username: string): Promise<{
  id: string;
  username: string;
  displayName: string;
  hasVerifiedBadge: boolean;
  avatarUrl: string;
}> {
  const res = await fetch(`/oauth/resolve-user?username=${encodeURIComponent(username)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Roblox user not found.');
  }
  return data;
}

export async function fetchRobloxOAuthSession(): Promise<RobloxOAuthSessionResponse> {
  try {
    const res = await fetch('/api/oauth/roblox/session', { credentials: 'include' });
    if (!res.ok) {
      return {
        authenticated: false,
        account: null,
        oauthConfigured: true,
        openCloudConfigured: false,
      };
    }
    return await res.json();
  } catch {
    return {
      authenticated: false,
      account: null,
      oauthConfigured: true,
      openCloudConfigured: false,
    };
  }
}

export async function logoutRobloxOAuth(): Promise<void> {
  const csrfRes = await fetch('/auth/csrf', { credentials: 'include' });
  const { csrfToken } = csrfRes.ok
    ? ((await csrfRes.json()) as { csrfToken?: string })
    : { csrfToken: '' };

  await fetch('/auth/signout', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({
      csrfToken: csrfToken || '',
      callbackUrl: '/',
    }),
  });
}
