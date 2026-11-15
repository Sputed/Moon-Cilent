import React, { useState, useEffect } from 'react';
import { X, Loader2, Play } from 'lucide-react';
import { RobloxGame, RobloxAccount, ServerInstance, RobloxUserSearchResult, RobloxApiStatus } from './types/launcher';
import { INITIAL_GAMES, INITIAL_ACCOUNTS } from './data/mockData';
import { Header } from './components/Header';
import { Sidebar, TabId } from './components/Sidebar';
import { DiscoverView } from './components/DiscoverView';
import { ServerBrowserView } from './components/ServerBrowserView';
import { AccountView } from './components/AccountView';
import { LaunchModal } from './components/LaunchModal';
import { AccountSwitcherModal, OAuthSetupNotice } from './components/AccountSwitcherModal';
import { RobloxConnectionModal } from './components/RobloxConnectionModal';
import { InstallAppModal } from './components/InstallAppModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InAppGameView } from './components/InAppGameView';
import { MoonOAuthModal } from './components/MoonOAuthModal';
import {
  fetchLiveRobloxGames,
  fetchFullRobloxAccount,
  fetchRobloxApiStatus,
  lookupPlaceId,
  fetchMoonOAuthStatus,
  rotateMoonOAuthKeysApi,
  beginMoonOAuthFlow,
  fetchRobloxOAuthSession,
  logoutRobloxOAuth,
  MoonOAuthAuthRequest,
  MoonOAuthKeysInfo,
  RobloxOAuthSessionResponse,
} from './utils/robloxApi';

export default function App() {
  const [games, setGames] = useState<RobloxGame[]>(INITIAL_GAMES);
  const [accounts, setAccounts] = useState<RobloxAccount[]>(() => {
    try {
      const saved = localStorage.getItem('rbx_launcher_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed.some((a) => a.username === 'PixelVoyager')) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return INITIAL_ACCOUNTS;
  });

  const [currentAccount, setCurrentAccount] = useState<RobloxAccount>(() => {
    try {
      const saved = localStorage.getItem('rbx_launcher_current_acc');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username && parsed.username !== 'PixelVoyager') {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return INITIAL_ACCOUNTS[0];
  });

  const [activeTab, setActiveTab] = useState<TabId>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('top-playing-now');

  // Selected game for server browser tab
  const [selectedServerGame, setSelectedServerGame] = useState<RobloxGame>(INITIAL_GAMES[0]);

  // Selected game displayed directly inside the Moon Client viewport
  const [selectedInAppGame, setSelectedInAppGame] = useState<RobloxGame | null>(null);

  // Persistent bookmarked / pinned games for Sidebar quick access
  const [bookmarkedGames, setBookmarkedGames] = useState<RobloxGame[]>(() => {
    try {
      const saved = localStorage.getItem('moon_client_bookmarked_games');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((g) => ({ ...g, isBookmarked: true }));
        }
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });

  // Install app modal
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Launch modal state
  const [launchModalState, setLaunchModalState] = useState<{
    isOpen: boolean;
    game: RobloxGame | null;
    targetServer?: ServerInstance | null;
    customJobId?: string;
    customPrivateLink?: string;
  }>({
    isOpen: false,
    game: null,
  });

  // Account modal state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Direct Place ID modal state (replaces window.prompt)
  const [isPlaceIdModalOpen, setIsPlaceIdModalOpen] = useState(false);
  const [directPlaceIdInput, setDirectPlaceIdInput] = useState('');
  const [isResolvingDirectPlace, setIsResolvingDirectPlace] = useState(false);
  const [directPlaceError, setDirectPlaceError] = useState<string | null>(null);

  // Roblox API status & connection modal
  const [apiStatus, setApiStatus] = useState<RobloxApiStatus | null>(null);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  const refreshApiStatus = async () => {
    setIsRefreshingStatus(true);
    try {
      const res = await fetchRobloxApiStatus();
      setApiStatus(res);
    } catch {
      // safe
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Moon OAuth 2.0 state
  const [oauthSession, setOauthSession] = useState<RobloxOAuthSessionResponse | null>(null);
  const [oauthNotice, setOauthNotice] = useState<OAuthSetupNotice | null>(null);
  const [isOAuthPending, setIsOAuthPending] = useState(false);
  const [oauthKeys, setOauthKeys] = useState<MoonOAuthKeysInfo | null>(null);
  const [isRotatingKeys, setIsRotatingKeys] = useState(false);
  const [moonOAuthRequest, setMoonOAuthRequest] = useState<MoonOAuthAuthRequest | null>(null);
  const [isMoonOAuthModalOpen, setIsMoonOAuthModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStartRobloxOAuth = async () => {
    setIsOAuthPending(true);
    setOauthNotice(null);
    try {
      const authReq = await beginMoonOAuthFlow();
      setMoonOAuthRequest(authReq);
      setOauthKeys(authReq.keys);
      setIsAccountModalOpen(false);
      setIsMoonOAuthModalOpen(true);
    } catch (err: any) {
      setOauthNotice({
        type: 'error',
        message: err.message || 'Could not initialize Moon OAuth 2.0 flow.',
      });
    } finally {
      setIsOAuthPending(false);
    }
  };

  const handleRotateOAuthKeys = async () => {
    setIsRotatingKeys(true);
    try {
      const nextKeys = await rotateMoonOAuthKeysApi();
      setOauthKeys(nextKeys);
      showToast('Generated new RS256 JWKS signing keypair & OAuth client credentials!');
    } catch (err: any) {
      showToast(err.message || 'Failed to rotate Moon OAuth keys.');
    } finally {
      setIsRotatingKeys(false);
    }
  };

  const handleSignOutRobloxOAuth = async () => {
    try {
      await logoutRobloxOAuth();
      setOauthSession((prev) =>
        prev ? { ...prev, authenticated: false, account: null } : null
      );
      showToast('Signed out of Moon OAuth session.');
    } catch {
      showToast('Failed to clear Moon OAuth session.');
    }
  };

  // Persist accounts
  useEffect(() => {
    try {
      localStorage.setItem('rbx_launcher_accounts', JSON.stringify(accounts));
    } catch {
      // Safe fallback
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem('rbx_launcher_current_acc', JSON.stringify(currentAccount));
    } catch {
      // Safe fallback
    }
  }, [currentAccount]);

  // Persist bookmarked games
  useEffect(() => {
    try {
      localStorage.setItem('moon_client_bookmarked_games', JSON.stringify(bookmarkedGames));
    } catch {
      // Safe fallback
    }
  }, [bookmarkedGames]);

  // Fetch real live games from Roblox network
  const loadLiveGames = async (filterId: string = 'top-playing-now') => {
    setIsLiveLoading(true);
    setActiveFilter(filterId);
    try {
      const isSort = ['top-playing-now', 'top-trending', 'up-and-coming', 'fun-with-friends', 'top-revisited'].includes(filterId);
      const liveGames = await fetchLiveRobloxGames(
        isSort ? filterId : 'top-playing-now',
        !isSort ? filterId : undefined
      );

      if (liveGames && liveGames.length > 0) {
        const bookmarkedIds = new Set(bookmarkedGames.map((b) => b.placeId));
        const synced = liveGames.map((g) => ({
          ...g,
          isBookmarked: bookmarkedIds.has(g.placeId),
        }));
        setGames(synced);
        setSelectedServerGame(synced[0]);
        setSelectedInAppGame((prev) => prev || synced[0]);
        showToast(`Loaded ${liveGames.length} live games from Roblox network!`);
      }
    } catch (err) {
      console.warn('Using baseline games:', err);
    } finally {
      setIsLiveLoading(false);
    }
  };

  useEffect(() => {
    loadLiveGames('top-playing-now');
    refreshApiStatus();

    fetchMoonOAuthStatus().then((status) => {
      if (status?.keys) {
        setOauthKeys(status.keys);
      }
    });

    fetchRobloxOAuthSession().then((session) => {
      setOauthSession(session);
      if (session.authenticated && session.account) {
        const oauthAcc = session.account;
        setAccounts((prev) => [oauthAcc, ...prev.filter((a) => a.id !== oauthAcc.id)]);
        setCurrentAccount(oauthAcc);
      } else if (currentAccount?.username) {
        fetchFullRobloxAccount(currentAccount.username)
          .then((fresh) => {
            setCurrentAccount(fresh);
            setAccounts((prev) => prev.map((a) => (a.id === fresh.id ? fresh : a)));
          })
          .catch(() => {
            // Keep cached profile if transient network issue
          });
      }
    });
  }, []);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin || '';
      if (
        origin !== window.location.origin &&
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost')
      ) {
        return;
      }

      if (event.data?.type === 'ROBLOX_OAUTH_SUCCESS') {
        const directAcc: RobloxAccount | undefined = event.data?.account;
        const session = await fetchRobloxOAuthSession();
        const oauthAccount = session.account || directAcc;

        if (oauthAccount) {
          setOauthSession({
            authenticated: true,
            account: oauthAccount,
            oauthConfigured: true,
            openCloudConfigured: session.openCloudConfigured,
            scopes: session.scopes,
            expiresAt: session.expiresAt,
          });
          setAccounts((prev) => [oauthAccount, ...prev.filter((a) => a.id !== oauthAccount.id)]);
          setCurrentAccount(oauthAccount);
          setOauthNotice(null);
          setIsAccountModalOpen(false);
          showToast(`Signed in via Moon OAuth as @${oauthAccount.username}!`);
        } else {
          setOauthNotice({
            type: 'error',
            message: 'Moon OAuth completed, but the session cookie could not be read in this browser context.',
          });
        }
      } else if (event.data?.type === 'ROBLOX_OAUTH_ERROR') {
        setOauthNotice({
          type: 'error',
          message: event.data.error || 'Moon OAuth authorization failed.',
        });
        showToast(event.data.error || 'Moon OAuth authorization failed.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Toggle favorite game
  const handleToggleFavorite = (gameId: string) => {
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, isFavorite: !g.isFavorite } : g))
    );
  };

  // Toggle bookmark / pin game to Sidebar
  const handleToggleBookmark = (targetGame: RobloxGame) => {
    const exists = bookmarkedGames.some((b) => b.placeId === targetGame.placeId);
    const nextPinnedState = !exists;

    setBookmarkedGames((prev) => {
      if (exists) {
        return prev.filter((b) => b.placeId !== targetGame.placeId);
      }
      return [{ ...targetGame, isBookmarked: true }, ...prev];
    });

    setGames((prev) =>
      prev.map((g) =>
        g.placeId === targetGame.placeId ? { ...g, isBookmarked: nextPinnedState } : g
      )
    );

    if (selectedInAppGame?.placeId === targetGame.placeId) {
      setSelectedInAppGame((prev) => (prev ? { ...prev, isBookmarked: nextPinnedState } : prev));
    }

    showToast(
      nextPinnedState
        ? `Pinned "${targetGame.name}" to Sidebar Bookmarks!`
        : `Removed "${targetGame.name}" from Bookmarks.`
    );
  };

  // Open game directly inside Moon Client viewport
  const handleOpenGameInApp = (game: RobloxGame) => {
    setSelectedInAppGame(game);
    setSelectedServerGame(game);
    setActiveTab('game');
    setSearchQuery('');
  };

  // Launch game handler (protocol modal)
  const handleLaunchGame = (game: RobloxGame, targetServer?: ServerInstance | null) => {
    setSelectedInAppGame(game);
    setLaunchModalState({
      isOpen: true,
      game,
      targetServer,
    });
  };

  // Switch to server inspector for specific game
  const handleInspectServers = (game: RobloxGame) => {
    setSelectedServerGame(game);
    setActiveTab('servers');
  };

  // Quick add custom Place ID
  const handleQuickAddCustomGame = (resolvedGame: RobloxGame) => {
    setGames((prev) => [resolvedGame, ...prev.filter((g) => g.placeId !== resolvedGame.placeId)]);
    setSelectedServerGame(resolvedGame);
    setSelectedInAppGame(resolvedGame);
    setActiveTab('game');
    showToast(`Opened "${resolvedGame.name}" inside Moon Client!`);
  };

  // Resolve real Roblox Place ID & open in-app
  const resolveAndLaunchPlaceId = async (rawId: string) => {
    const cleanId = rawId.trim();
    if (!cleanId) return;
    const existing = games.find((g) => g.placeId === cleanId);
    if (existing) {
      setIsPlaceIdModalOpen(false);
      handleOpenGameInApp(existing);
      return;
    }

    setIsResolvingDirectPlace(true);
    setDirectPlaceError(null);
    try {
      const realGame = await lookupPlaceId(cleanId);
      setGames((prev) => [realGame, ...prev.filter((g) => g.placeId !== realGame.placeId)]);
      setSelectedServerGame(realGame);
      setIsPlaceIdModalOpen(false);
      setDirectPlaceIdInput('');
      handleOpenGameInApp(realGame);
    } catch (err: any) {
      setDirectPlaceError(err.message || `Could not resolve Roblox Place ID #${cleanId}`);
      if (!isPlaceIdModalOpen) {
        showToast(err.message || `Could not find Roblox Place ID #${cleanId}`);
      }
    } finally {
      setIsResolvingDirectPlace(false);
    }
  };

  // Direct quick launch or open Place ID modal
  const handlePromptPlaceId = (directId?: string) => {
    if (directId && directId.trim()) {
      resolveAndLaunchPlaceId(directId);
    } else {
      setDirectPlaceError(null);
      setIsPlaceIdModalOpen(true);
    }
  };

  // Search user profile action from unified search bar
  const handleSelectSearchedUser = async (user: RobloxUserSearchResult) => {
    showToast(`Connecting Roblox profile @${user.username}...`);
    try {
      const fullAcc = await fetchFullRobloxAccount(user.username);
      handleAddAccount(fullAcc);
      setActiveTab('account');
    } catch {
      const fallbackAcc: RobloxAccount = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isPremium: user.hasVerifiedBadge,
        isVerified: user.hasVerifiedBadge,
        role: 'Roblox Account',
        lastActive: 'Active on Roblox',
      };
      handleAddAccount(fallbackAcc);
      setActiveTab('account');
    }
  };

  // Join server instance
  const handleJoinServerInstance = (game: RobloxGame, instance: ServerInstance) => {
    setLaunchModalState({
      isOpen: true,
      game,
      targetServer: instance,
    });
  };

  // Join custom Job ID / Private Link
  const handleJoinCustomJobId = (game: RobloxGame, jobId: string, privateLink?: string) => {
    setLaunchModalState({
      isOpen: true,
      game,
      customJobId: jobId,
      customPrivateLink: privateLink,
    });
  };

  // Account actions
  const handleSelectAccount = (account: RobloxAccount) => {
    setCurrentAccount(account);
    showToast(`Switched active profile to ${account.displayName} (@${account.username})`);
  };

  const handleAddAccount = (newAcc: RobloxAccount) => {
    const updated = [newAcc, ...accounts.filter((a) => a.id !== newAcc.id)];
    setAccounts(updated);
    setCurrentAccount(newAcc);
    showToast(`Linked real Roblox profile @${newAcc.username}`);
  };

  const handleRemoveAccount = (accountId: string) => {
    if (accounts.length <= 1) {
      showToast('Cannot remove the only linked account.');
      return;
    }
    const updated = accounts.filter((a) => a.id !== accountId);
    setAccounts(updated);
    if (currentAccount.id === accountId) {
      setCurrentAccount(updated[0]);
    }
    showToast('Removed account profile.');
  };

  const handleRefreshAccount = async (username: string) => {
    try {
      const refreshed = await fetchFullRobloxAccount(username);
      setCurrentAccount(refreshed);
      setAccounts((prev) => prev.map((a) => (a.id === refreshed.id ? refreshed : a)));
      showToast(`Updated live presence for @${username}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to refresh account');
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-[#202124] text-neutral-100' : 'bg-[#f8f9fa] text-neutral-900'} flex flex-col font-sans transition-colors selection:bg-[#1a73e8] selection:text-white`}>
      {/* Non-intrusive Offline Banner when disconnected */}
      <OfflineIndicator />

      {/* Google-Style Header with Unified Search */}
      <Header
        currentAccount={currentAccount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLaunchGame={handleOpenGameInApp}
        onInspectServers={handleInspectServers}
        onSelectUser={handleSelectSearchedUser}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onQuickLaunchPlaceId={handlePromptPlaceId}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        apiStatus={apiStatus}
        onOpenConnectionModal={() => setIsConnectionModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* Main Container: Sidebar + Viewport */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto overflow-hidden">
        {/* Navigation Rail */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setSearchQuery('');
          }}
          activeUsername={currentAccount.username}
          selectedGameName={selectedInAppGame?.name || null}
          selectedGamePlaceId={selectedInAppGame?.placeId || null}
          selectedGameIconUrl={selectedInAppGame?.iconUrl || selectedInAppGame?.thumbnail || null}
          bookmarkedGames={bookmarkedGames}
          onOpenBookmarkedGame={handleOpenGameInApp}
          onUnpinBookmark={handleToggleBookmark}
        />

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'discover' && (
            <DiscoverView
              games={games.map((g) => ({
                ...g,
                isBookmarked: bookmarkedGames.some((b) => b.placeId === g.placeId),
              }))}
              bookmarkedPlaceIds={bookmarkedGames.map((b) => b.placeId)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenInApp={handleOpenGameInApp}
              onLaunchGame={handleLaunchGame}
              onToggleFavorite={handleToggleFavorite}
              onToggleBookmark={handleToggleBookmark}
              onInspectServers={handleInspectServers}
              onQuickAddCustomGame={handleQuickAddCustomGame}
              onSelectGenreOrSort={loadLiveGames}
              isLiveLoading={isLiveLoading}
              activeFilter={activeFilter}
              onOpenConnectionModal={() => setIsConnectionModalOpen(true)}
            />
          )}

          {activeTab === 'game' && selectedInAppGame && (
            <InAppGameView
              game={(() => {
                const base =
                  games.find((g) => g.placeId === selectedInAppGame.placeId) ||
                  selectedInAppGame;
                return {
                  ...base,
                  isBookmarked: bookmarkedGames.some((b) => b.placeId === base.placeId),
                };
              })()}
              onBack={() => setActiveTab('discover')}
              onToggleFavorite={handleToggleFavorite}
              onToggleBookmark={handleToggleBookmark}
              onLaunchWithModal={handleLaunchGame}
            />
          )}

          {activeTab === 'servers' && (
            <ServerBrowserView
              games={games}
              selectedGame={selectedServerGame}
              onSelectGame={setSelectedServerGame}
              onJoinServerInstance={handleJoinServerInstance}
              onJoinCustomJobId={handleJoinCustomJobId}
            />
          )}

          {activeTab === 'account' && (
            <AccountView
              currentAccount={currentAccount}
              accounts={accounts}
              onSelectAccount={handleSelectAccount}
              onAddAccount={handleAddAccount}
              onRemoveAccount={handleRemoveAccount}
              onRefreshAccount={handleRefreshAccount}
              oauthSession={oauthSession}
              oauthNotice={oauthNotice}
              isOAuthPending={isOAuthPending}
              onSignInWithRobloxOAuth={handleStartRobloxOAuth}
              onSignOutRobloxOAuth={handleSignOutRobloxOAuth}
              oauthKeys={oauthKeys}
              isRotatingKeys={isRotatingKeys}
              onRotateOAuthKeys={handleRotateOAuthKeys}
            />
          )}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold rounded-2xl shadow-xl flex items-center gap-2 border border-neutral-700 dark:border-neutral-200 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-2 h-2 rounded-full bg-[#1a73e8]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Game Launch Modal */}
      <LaunchModal
        isOpen={launchModalState.isOpen}
        onClose={() => setLaunchModalState({ isOpen: false, game: null })}
        game={launchModalState.game}
        targetServer={launchModalState.targetServer}
        customJobId={launchModalState.customJobId}
        customPrivateLink={launchModalState.customPrivateLink}
      />

      {/* Account Switcher Modal */}
      <AccountSwitcherModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        accounts={accounts}
        currentAccount={currentAccount}
        onSelectAccount={handleSelectAccount}
        onAddAccount={handleAddAccount}
        oauthSession={oauthSession}
        oauthNotice={oauthNotice}
        isOAuthPending={isOAuthPending}
        onSignInWithRobloxOAuth={handleStartRobloxOAuth}
        onSignOutRobloxOAuth={handleSignOutRobloxOAuth}
      />

      {/* Direct Place ID Launch Modal */}
      {isPlaceIdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-[#282a2d] rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl p-6">
            <button
              onClick={() => setIsPlaceIdModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-[#303134]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              Launch Any Roblox Place ID
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Enter a real Roblox Place ID (e.g. <code className="font-mono">189707</code> or <code className="font-mono">2753915549</code>) to fetch live experience data and launch.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const match = directPlaceIdInput.trim().match(/games\/(\d+)/i) || directPlaceIdInput.trim().match(/^(\d+)$/);
                const parsed = match ? match[1] : directPlaceIdInput.trim();
                resolveAndLaunchPlaceId(parsed);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                placeholder="Place ID or roblox.com/games/... URL"
                value={directPlaceIdInput}
                onChange={(e) => setDirectPlaceIdInput(e.target.value)}
                autoFocus
                disabled={isResolvingDirectPlace}
                className="w-full h-10 px-3.5 text-xs bg-neutral-100 dark:bg-[#303134] rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#1a73e8]"
              />

              {directPlaceError && (
                <div className="p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900">
                  {directPlaceError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPlaceIdModalOpen(false)}
                  className="px-4 py-2 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolvingDirectPlace || !directPlaceIdInput.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] disabled:bg-neutral-400 text-white rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {isResolvingDirectPlace ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Resolving...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Fetch & Launch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roblox Connection & API Status Modal */}
      <RobloxConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        status={apiStatus}
        onRefreshStatus={refreshApiStatus}
        isRefreshing={isRefreshingStatus}
      />

      {/* Official App Install Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* In-App Moon OAuth 2.0 Authorization Modal */}
      <MoonOAuthModal
        isOpen={isMoonOAuthModalOpen}
        authRequest={moonOAuthRequest}
        onClose={() => setIsMoonOAuthModalOpen(false)}
        onAuthenticated={(session) => {
          setOauthSession(session);
          if (session.account) {
            const oauthAcc = session.account;
            setAccounts((prev) => [oauthAcc, ...prev.filter((a) => a.id !== oauthAcc.id)]);
            setCurrentAccount(oauthAcc);
            showToast(`Signed in via Moon OAuth as @${oauthAcc.username}!`);
          }
          setOauthNotice(null);
        }}
        onDenied={() => {
          setOauthNotice({
            type: 'error',
            message: 'Moon OAuth authorization request was denied.',
          });
          showToast('Moon OAuth authorization denied.');
        }}
      />
    </div>
  );
}
