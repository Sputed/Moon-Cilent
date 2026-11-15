import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Mic,
  X,
  Play,
  Globe2,
  UserCheck,
  Users,
  ShoppingBag,
  ExternalLink,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Coins,
  Compass,
  History,
  Clock,
  Trash2,
} from 'lucide-react';
import {
  RobloxGame,
  RobloxUserSearchResult,
  RobloxGroupSearchResult,
  RobloxCatalogSearchResult,
  UnifiedSearchResults,
} from '../types/launcher';
import { fetchUnifiedSearch } from '../utils/robloxApi';

interface UnifiedSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLaunchGame: (game: RobloxGame) => void;
  onInspectServers?: (game: RobloxGame) => void;
  onSelectUser?: (user: RobloxUserSearchResult) => void;
  onQuickLaunchPlaceId?: (placeId: string) => void;
}

type CategoryTab = 'all' | 'games' | 'users' | 'groups' | 'catalog';

interface SearchHistoryEntry {
  id: string;
  query: string;
  category: CategoryTab | 'placeId';
  timestamp: number;
  subtitle?: string;
  thumbnail?: string;
}

const HISTORY_STORAGE_KEY = 'moon_unified_search_history_v1';
const LEGACY_HISTORY_KEY = 'rbx_recent_searches';
const MAX_HISTORY_ITEMS = 12;

const CATEGORY_LABELS: Record<CategoryTab | 'placeId', string> = {
  all: 'All',
  games: 'Experiences',
  users: 'Profiles',
  groups: 'Groups',
  catalog: 'Catalog',
  placeId: 'Place ID',
};

function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

const SUGGESTIONS = [
  'Brookhaven RP',
  'Adopt Me!',
  'Blox Fruits',
  'Dress To Impress',
  'Arsenal',
  'Builderman',
  'Tower Defense Simulator',
  'Blade Ball',
];

export const UnifiedSearchBar: React.FC<UnifiedSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  onLaunchGame,
  onInspectServers,
  onSelectUser,
  onQuickLaunchPlaceId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<UnifiedSearchResults>({
    query: '',
    games: [],
    users: [],
    groups: [],
    items: [],
    totalCount: 0,
  });
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      const legacy = localStorage.getItem(LEGACY_HISTORY_KEY);
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (Array.isArray(parsedLegacy)) {
          return parsedLegacy
            .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
            .map((q, idx) => ({
              id: `legacy-${idx}-${q.toLowerCase()}`,
              query: q.trim(),
              category: 'all' as CategoryTab,
              timestamp: Date.now() - idx * 60000,
            }));
        }
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut '/' to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== inputRef.current &&
        !['input', 'textarea'].includes((document.activeElement?.tagName || '').toLowerCase())
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live unified indexing query + debounced local history recording when results succeed
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults({
        query: '',
        games: [],
        users: [],
        groups: [],
        items: [],
        totalCount: 0,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let historyTimer: ReturnType<typeof setTimeout> | null = null;
    const timer = setTimeout(async () => {
      try {
        const data = await fetchUnifiedSearch(trimmed);
        setResults(data);
        if (data.totalCount > 0 && trimmed.length >= 2) {
          historyTimer = setTimeout(() => {
            saveHistoryEntry({
              query: trimmed,
              category: activeCategory,
              thumbnail: data.games[0]?.thumbnail || data.users[0]?.avatarUrl,
              subtitle: `${data.totalCount} results`,
            });
          }, 700);
        }
      } catch (err) {
        console.error('Unified search failed', err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      if (historyTimer) clearTimeout(historyTimer);
    };
  }, [searchQuery]);

  const persistHistory = (next: SearchHistoryEntry[]) => {
    setSearchHistory(next);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify(next.map((i) => i.query)));
    } catch {
      // Ignore storage error
    }
  };

  const saveHistoryEntry = (opts: {
    query: string;
    category?: CategoryTab | 'placeId';
    subtitle?: string;
    thumbnail?: string;
  }) => {
    const clean = opts.query.trim();
    if (!clean) return;
    const entryCategory = opts.category || activeCategory;

    setSearchHistory((prev) => {
      const existing = prev.find((item) => item.query.toLowerCase() === clean.toLowerCase());
      const entry: SearchHistoryEntry = {
        id: existing?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        query: clean,
        category: entryCategory,
        timestamp: Date.now(),
        subtitle: opts.subtitle || existing?.subtitle,
        thumbnail: opts.thumbnail || existing?.thumbnail,
      };
      const updated = [
        entry,
        ...prev.filter((item) => item.query.toLowerCase() !== clean.toLowerCase()),
      ].slice(0, MAX_HISTORY_ITEMS);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
        localStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify(updated.map((i) => i.query)));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const handleRemoveHistoryItem = (id: string) => {
    const updated = searchHistory.filter((item) => item.id !== id);
    persistHistory(updated);
  };

  const handleClearHistory = () => {
    persistHistory([]);
  };

  const handleReselectHistory = (entry: SearchHistoryEntry) => {
    if (entry.category !== 'placeId') {
      setActiveCategory(entry.category);
    } else {
      setActiveCategory('all');
    }
    onSearchChange(entry.query);
    saveHistoryEntry({
      query: entry.query,
      category: entry.category,
      subtitle: entry.subtitle,
      thumbnail: entry.thumbnail,
    });
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleSelectSuggestion = (term: string) => {
    onSearchChange(term);
    saveHistoryEntry({ query: term, category: activeCategory, subtitle: 'Search query' });
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleSimulateVoice = () => {
    setIsVoiceListening(true);
    setTimeout(() => {
      onSearchChange('Brookhaven RP');
      saveHistoryEntry({ query: 'Brookhaven RP', category: 'all', subtitle: 'Voice search' });
      setIsVoiceListening(false);
      setIsOpen(true);
    }, 1100);
  };

  // Direct numeric Place ID check
  const isDirectPlaceId = /^\d{5,12}$/.test(searchQuery.trim());

  const filterCounts = {
    all: results.totalCount,
    games: results.games.length,
    users: results.users.length,
    groups: results.groups.length,
    catalog: results.items.length,
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      {/* Google Omnibox Input Bar */}
      <div className="relative flex items-center w-full">
        <div className="absolute left-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#1a73e8] dark:text-[#8ab4f8]" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              e.preventDefault();
              saveHistoryEntry({
                query: searchQuery.trim(),
                category: isDirectPlaceId ? 'placeId' : activeCategory,
                subtitle: isDirectPlaceId ? 'Direct Place ID' : 'Manual search',
              });
              if (isDirectPlaceId && onQuickLaunchPlaceId) {
                onQuickLaunchPlaceId(searchQuery.trim());
                setIsOpen(false);
              }
            }
          }}
          placeholder="Unified search: games, players, groups, catalog or Place ID..."
          className="w-full h-10 pl-10 pr-24 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 bg-neutral-100 dark:bg-[#303134] hover:bg-neutral-200/70 dark:hover:bg-[#3c4043] focus:bg-white dark:focus:bg-[#303134] rounded-full border border-transparent focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:outline-none transition-all shadow-none focus:shadow-md"
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {searchQuery ? (
            <button
              onClick={() => {
                onSearchChange('');
                inputRef.current?.focus();
              }}
              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSimulateVoice}
              title="Voice Search"
              className={`p-1.5 rounded-full transition-colors ${
                isVoiceListening
                  ? 'text-[#ea4335] bg-red-100 dark:bg-red-950/40 animate-pulse'
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 bg-neutral-200/70 dark:bg-neutral-700/70 px-1.5 py-0.5 rounded">
            /
          </span>
        </div>
      </div>

      {/* Floating Unified Search Dropdown */}
      {isOpen && (
        <div className="absolute top-12 left-0 right-0 z-50 bg-white dark:bg-[#303134] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden transition-all max-h-[580px] flex flex-col">
          {/* Category Tabs Header */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/70 dark:bg-[#282a2d]/70 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === 'all'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <span>All</span>
              {searchQuery && (
                <span className="text-[10px] opacity-75 font-mono tabular-nums">
                  ({filterCounts.all})
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveCategory('games')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === 'games'
                  ? 'bg-[#1a73e8] text-white shadow-2xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>Experiences</span>
              {searchQuery && (
                <span className="text-[10px] opacity-75 font-mono tabular-nums">
                  ({filterCounts.games})
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveCategory('users')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === 'users'
                  ? 'bg-[#1a73e8] text-white shadow-2xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>Profiles</span>
              {searchQuery && (
                <span className="text-[10px] opacity-75 font-mono tabular-nums">
                  ({filterCounts.users})
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveCategory('groups')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === 'groups'
                  ? 'bg-[#1a73e8] text-white shadow-2xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Community Groups</span>
              {searchQuery && (
                <span className="text-[10px] opacity-75 font-mono tabular-nums">
                  ({filterCounts.groups})
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveCategory('catalog')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === 'catalog'
                  ? 'bg-[#1a73e8] text-white shadow-2xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Catalog</span>
              {searchQuery && (
                <span className="text-[10px] opacity-75 font-mono tabular-nums">
                  ({filterCounts.catalog})
                </span>
              )}
            </button>
          </div>

          {/* Direct Place ID Quick Launch Card */}
          {isDirectPlaceId && onQuickLaunchPlaceId && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#1a73e8] text-white flex items-center justify-center font-mono font-bold text-xs">
                  #
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Direct Launch Place ID #{searchQuery.trim()}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Connect directly to Roblox datacenter for this place.
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  saveHistoryEntry({
                    query: searchQuery.trim(),
                    category: 'placeId',
                    subtitle: 'Direct Place ID',
                  });
                  onQuickLaunchPlaceId(searchQuery.trim());
                  setIsOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Launch Place
              </button>
            </div>
          )}

          {/* Results Viewport */}
          <div className="overflow-y-auto p-3 space-y-4 max-h-[460px]">
            {/* Matching History Strip while typing */}
            {searchQuery.trim() && (() => {
              const matchingHistory = searchHistory.filter(
                (item) =>
                  item.query.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
                  item.query.toLowerCase() !== searchQuery.trim().toLowerCase()
              );
              if (matchingHistory.length === 0) return null;
              return (
                <div className="pb-2 border-b border-neutral-100 dark:border-neutral-700/60">
                  <div className="px-2 mb-1.5 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <History className="w-3 h-3" />
                    <span>From Local History</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {matchingHistory.slice(0, 4).map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => handleReselectHistory(entry)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700/60 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs text-neutral-700 dark:text-neutral-200 rounded-lg transition-colors"
                      >
                        <Clock className="w-3 h-3 text-[#1a73e8] dark:text-[#8ab4f8]" />
                        <span>{entry.query}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* If no query, show local search history and suggestions */}
            {!searchQuery.trim() && (
              <div className="space-y-4 py-1">
                <div>
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
                      <span>Local Search History ({searchHistory.length})</span>
                    </span>
                    {searchHistory.length > 0 && (
                      <button
                        onClick={handleClearHistory}
                        className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear all</span>
                      </button>
                    )}
                  </div>

                  {searchHistory.length > 0 ? (
                    <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                      {searchHistory.map((entry) => (
                        <div
                          key={entry.id}
                          onClick={() => handleReselectHistory(entry)}
                          className="group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3c4043] cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {entry.thumbnail ? (
                              <img
                                src={entry.thumbnail}
                                alt={entry.query}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-lg object-cover shrink-0 bg-neutral-200 dark:bg-neutral-700"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-700/80 flex items-center justify-center shrink-0">
                                <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-300" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                                {entry.query}
                              </div>
                              <div className="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                                <span className="text-[#1a73e8] dark:text-[#8ab4f8] font-medium">
                                  {CATEGORY_LABELS[entry.category]}
                                </span>
                                {entry.subtitle && (
                                  <>
                                    <span>·</span>
                                    <span className="truncate">{entry.subtitle}</span>
                                  </>
                                )}
                                <span>·</span>
                                <span>{formatRelativeTime(entry.timestamp)}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveHistoryItem(entry.id);
                            }}
                            title="Remove from history"
                            aria-label={`Remove ${entry.query} from history`}
                            className="p-1 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 rounded-md transition-all shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-3 text-xs text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-[#282a2d] rounded-xl border border-neutral-100 dark:border-neutral-700/60">
                      No local searches saved yet. Search for any game, player, group, or Place ID to save it here.
                    </div>
                  )}
                </div>

                <div>
                  <div className="px-2 mb-1.5 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    Trending on Roblox
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSelectSuggestion(s)}
                        className="flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Sparkles className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0" />
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                            {s}
                          </span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Results when searching */}
            {searchQuery.trim() && (
              <>
                {/* Experiences / Games Section */}
                {(activeCategory === 'all' || activeCategory === 'games') && results.games.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-2 mb-2">
                      <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-[#1a73e8]" />
                        Experiences ({results.games.length})
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {results.games.map((game) => (
                        <div
                          key={game.id}
                          onClick={() => {
                            saveHistoryEntry({
                              query: searchQuery.trim() || game.name,
                              category: 'games',
                              subtitle: game.name,
                              thumbnail: game.thumbnail,
                            });
                            onLaunchGame(game);
                            setIsOpen(false);
                          }}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3c4043] transition-colors group border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            {game.thumbnail ? (
                              <img
                                src={game.thumbnail}
                                alt={game.name}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-xl object-cover shrink-0 bg-neutral-200 dark:bg-neutral-700"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-[#1a73e8]/20 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center font-bold text-xs shrink-0">
                                RBX
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                                {game.name}
                              </div>
                              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1.5">
                                <span>{game.creator}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {game.activePlayers.toLocaleString()} playing
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums text-neutral-600 dark:text-neutral-300">
                                  {game.rating}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {onInspectServers && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveHistoryEntry({
                                    query: searchQuery.trim() || game.name,
                                    category: 'games',
                                    subtitle: `${game.name} servers`,
                                    thumbnail: game.thumbnail,
                                  });
                                  onInspectServers(game);
                                  setIsOpen(false);
                                }}
                                title="Inspect live servers"
                                className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                              >
                                <Globe2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveHistoryEntry({
                                  query: searchQuery.trim() || game.name,
                                  category: 'games',
                                  subtitle: game.name,
                                  thumbnail: game.thumbnail,
                                });
                                onLaunchGame(game);
                                setIsOpen(false);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Open</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Users / Profiles Section */}
                {(activeCategory === 'all' || activeCategory === 'users') && results.users.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-2 mb-2 pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
                      <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                        Roblox Profiles ({results.users.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {results.users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3c4043] transition-colors border border-neutral-200/50 dark:border-neutral-700/50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-1">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.displayName}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-full object-cover shrink-0 bg-neutral-200 dark:bg-neutral-700"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1a73e8] to-[#34a853] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1 text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                                <span>{user.displayName}</span>
                                {user.hasVerifiedBadge && (
                                  <ShieldCheck className="w-3 h-3 text-blue-500 shrink-0" />
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                                @{user.username}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {onSelectUser && (
                              <button
                                onClick={() => {
                                  saveHistoryEntry({
                                    query: searchQuery.trim() || user.username,
                                    category: 'users',
                                    subtitle: `@${user.username}`,
                                    thumbnail: user.avatarUrl,
                                  });
                                  onSelectUser(user);
                                  setIsOpen(false);
                                }}
                                className="px-2 py-1 text-[11px] font-medium text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors whitespace-nowrap"
                              >
                                View / Link
                              </button>
                            )}

                            <a
                              href={`https://www.roblox.com/users/${user.id}/profile`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() =>
                                saveHistoryEntry({
                                  query: searchQuery.trim() || user.username,
                                  category: 'users',
                                  subtitle: `@${user.username}`,
                                  thumbnail: user.avatarUrl,
                                })
                              }
                              title="Open on roblox.com"
                              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Community Groups Section */}
                {(activeCategory === 'all' || activeCategory === 'groups') && results.groups.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-2 mb-2 pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
                      <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        Community Groups & Studios ({results.groups.length})
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {results.groups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3c4043] transition-colors border border-neutral-200/50 dark:border-neutral-700/50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {group.iconUrl ? (
                              <img
                                src={group.iconUrl}
                                alt={group.name}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-xl object-cover shrink-0 bg-neutral-200 dark:bg-neutral-700"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                                <Users className="w-4 h-4" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                                <span>{group.name}</span>
                                {group.hasVerifiedBadge && (
                                  <ShieldCheck className="w-3 h-3 text-blue-500 shrink-0" />
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1.5">
                                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {group.memberCount.toLocaleString()} members
                                </span>
                                {group.description && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="truncate">{group.description}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <a
                            href={`https://www.roblox.com/groups/${group.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                          >
                            <span>Group Hub</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Marketplace / Catalog Section */}
                {(activeCategory === 'all' || activeCategory === 'catalog') && results.items.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-2 mb-2 pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
                      <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                        Community Catalog Items ({results.items.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {results.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3c4043] transition-colors border border-neutral-200/50 dark:border-neutral-700/50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-lg object-cover shrink-0 bg-neutral-200 dark:bg-neutral-700"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                                <ShoppingBag className="w-3.5 h-3.5" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1">
                                <span>{item.creatorName}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                            <Coins className="w-3 h-3" />
                            <span>{item.price > 0 ? item.price.toLocaleString() : 'Free'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {results.totalCount === 0 && !isLoading && (
                  <div className="p-8 text-center">
                    <Search className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                      No results across Roblox for "{searchQuery}"
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                      Try searching with another keyword or enter a numeric Place ID directly.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
