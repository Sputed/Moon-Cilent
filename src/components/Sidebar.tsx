import React from 'react';
import {
  Compass,
  Globe2,
  UserCheck,
  Download,
  ExternalLink,
  Gamepad2,
  Bookmark,
  X,
} from 'lucide-react';
import { MoonLogo } from './MoonLogo';
import { RobloxGame } from '../types/launcher';

export type TabId = 'discover' | 'game' | 'servers' | 'account';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  activeUsername: string;
  selectedGameName?: string | null;
  selectedGamePlaceId?: string | null;
  selectedGameIconUrl?: string | null;
  bookmarkedGames: RobloxGame[];
  onOpenBookmarkedGame: (game: RobloxGame) => void;
  onUnpinBookmark: (game: RobloxGame) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeUsername,
  selectedGameName,
  selectedGamePlaceId,
  selectedGameIconUrl,
  bookmarkedGames,
  onOpenBookmarkedGame,
  onUnpinBookmark,
}) => {
  const navItems: { id: TabId; label: string; icon: React.FC<{ className?: string }>; iconUrl?: string | null; badge?: string }[] = [
    { id: 'discover', label: 'Every Game on Roblox', icon: Compass },
    ...(selectedGameName
      ? [{ id: 'game' as TabId, label: selectedGameName, icon: Gamepad2, iconUrl: selectedGameIconUrl }]
      : []),
    { id: 'servers', label: 'Live Server Browser', icon: Globe2 },
    { id: 'account', label: 'Roblox Account System', icon: UserCheck, badge: `@${activeUsername}` },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#202124] p-3 transition-colors overflow-y-auto">
      <div className="space-y-5">
        {/* Primary Navigation */}
        <div className="space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
            Moon Client
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#e8f0fe] dark:bg-[#1a73e8]/20 text-[#1a73e8] dark:text-[#8ab4f8] shadow-xs font-semibold'
                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#303134]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.iconUrl ? (
                    <img
                      src={item.iconUrl}
                      alt={item.label}
                      referrerPolicy="no-referrer"
                      className="w-4 h-4 rounded object-cover shrink-0 bg-neutral-200 dark:bg-neutral-700"
                    />
                  ) : (
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1a73e8] dark:text-[#8ab4f8]' : 'text-neutral-500 dark:text-neutral-400'}`} />
                  )}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded truncate max-w-[85px] shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bookmarked / Pinned Games Section */}
        <div className="space-y-1.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
          <div className="px-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase flex items-center gap-1.5">
              <Bookmark className="w-3 h-3 text-amber-500 fill-current" />
              <span>Bookmarked</span>
            </span>
            <span className="text-[10px] font-mono tabular-nums text-neutral-400 dark:text-neutral-500">
              {bookmarkedGames.length}
            </span>
          </div>

          {bookmarkedGames.length > 0 ? (
            <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
              {bookmarkedGames.map((game) => {
                const isSelected = activeTab === 'game' && selectedGamePlaceId === game.placeId;
                return (
                  <div
                    key={game.placeId}
                    className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/50'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#303134]'
                    }`}
                    onClick={() => onOpenBookmarkedGame(game)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {game.thumbnail ? (
                        <img
                          src={game.thumbnail}
                          alt={game.name}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-lg object-cover shrink-0 bg-neutral-200 dark:bg-neutral-800"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                          <Gamepad2 className="w-3.5 h-3.5 text-neutral-500" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{game.name}</div>
                        <div className="text-[10px] font-mono text-neutral-400 truncate">
                          Place #{game.placeId}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnpinBookmark(game);
                      }}
                      title={`Unpin ${game.name}`}
                      aria-label={`Unpin ${game.name}`}
                      className="p-1 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 rounded-md transition-all shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-2.5 text-[11px] text-neutral-400 dark:text-neutral-500 leading-snug">
              Bookmark any game to pin it here for instant access.
            </div>
          )}
        </div>
      </div>

      {/* Real Network Connected Footer Card + Official Roblox Download */}
      <div className="space-y-2.5 pt-4">
        <a
          href="https://www.roblox.com/download"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold transition-all shadow-xs"
        >
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            <span>Download Roblox</span>
          </div>
          <ExternalLink className="w-3 h-3 opacity-80" />
        </a>

        <div className="p-3 bg-neutral-50 dark:bg-[#282a2d] rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
          <div className="flex items-center gap-2 mb-1.5">
            <MoonLogo className="w-4 h-4 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0" />
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Moon Client × Roblox
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-auto" />
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Connected to official Roblox APIs. Live games, server clusters &amp; Moon OAuth 2.0 active.
          </p>
        </div>
      </div>
    </aside>
  );
};
