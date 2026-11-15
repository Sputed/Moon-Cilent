import React from 'react';
import { Moon, Sun, ChevronDown, Download, PlusCircle, Radio, Monitor } from 'lucide-react';
import { RobloxAccount, RobloxGame, RobloxUserSearchResult } from '../types/launcher';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { UnifiedSearchBar } from './UnifiedSearchBar';
import { MoonLogo } from './MoonLogo';

interface HeaderProps {
  currentAccount: RobloxAccount;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLaunchGame: (game: RobloxGame) => void;
  onInspectServers?: (game: RobloxGame) => void;
  onSelectUser?: (user: RobloxUserSearchResult) => void;
  onOpenAccountModal: () => void;
  onQuickLaunchPlaceId: (placeId?: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  apiStatus?: import('../types/launcher').RobloxApiStatus | null;
  onOpenConnectionModal?: () => void;
  onOpenInstallModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentAccount,
  searchQuery,
  onSearchChange,
  onLaunchGame,
  onInspectServers,
  onSelectUser,
  onOpenAccountModal,
  onQuickLaunchPlaceId,
  isDarkMode,
  onToggleDarkMode,
  apiStatus,
  onOpenConnectionModal,
  onOpenInstallModal,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    onOpenInstallModal?.();
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-6 px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-[#202124]/95 backdrop-blur-md transition-colors">
      {/* Brand Zone - Moon Logo + Moon Client */}
      <div className="flex items-center gap-3 shrink-0">
        <MoonLogo withTile className="w-9 h-9" />

        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Moon
            </span>
            <span className="text-base font-bold tracking-tight text-[#1a73e8] dark:text-[#8ab4f8]">
              Client
            </span>
          </div>
          <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 tracking-wide">
            for Roblox
          </span>
        </div>
      </div>

      {/* Google Omnibox Unified Search Bar */}
      <UnifiedSearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onLaunchGame={onLaunchGame}
        onInspectServers={onInspectServers}
        onSelectUser={onSelectUser}
        onQuickLaunchPlaceId={(id) => onQuickLaunchPlaceId(id)}
      />

      {/* Right Controls: Quick Place ID, Theme Toggle, Roblox Account Button */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Roblox API & Network Connection Status Indicator */}
        <button
          onClick={onOpenConnectionModal}
          title="Roblox Network & API Status. Click to inspect live endpoint latency and test client handshake."
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-full border transition-all text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#303134] border-neutral-200 dark:border-neutral-700/80"
        >
          <div className="relative flex items-center justify-center">
            <Radio className={`w-3.5 h-3.5 ${apiStatus?.connected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
          </div>
          <span className="hidden md:inline">
            {apiStatus?.connected ? 'Roblox Connected' : 'Roblox Network'}
          </span>
          <span className="text-[10px] font-mono text-neutral-400">
            {apiStatus?.averageLatencyMs ? `${apiStatus.averageLatencyMs}ms` : 'Live'}
          </span>
        </button>

        {/* Direct Place Launch Button */}
        <button
          onClick={() => onQuickLaunchPlaceId()}
          className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors whitespace-nowrap"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Direct Place ID
        </button>

        {/* Install Official App CTA */}
        {!isInstalled && onOpenInstallModal && (
          <button
            onClick={handleInstallClick}
            title="Install Moon Client App"
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-[#303134] hover:bg-neutral-200 dark:hover:bg-[#3c4043] rounded-full transition-colors whitespace-nowrap"
          >
            <Monitor className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
            <span>Install App</span>
          </button>
        )}

        {/* Official Roblox Download CTA */}
        <a
          href="https://www.roblox.com/download"
          target="_blank"
          rel="noopener noreferrer"
          title="Download Official Roblox Client"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-full transition-colors whitespace-nowrap shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Roblox</span>
        </a>

        {/* Dark/Light mode toggle */}
        <button
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#303134] rounded-full transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Real Roblox Account Profile Chip */}
        <button
          onClick={onOpenAccountModal}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700/80 hover:bg-neutral-100 dark:hover:bg-[#303134] transition-colors"
        >
          {currentAccount.avatarUrl ? (
            <img
              src={currentAccount.avatarUrl}
              alt={currentAccount.displayName}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1a73e8] to-[#34a853] flex items-center justify-center text-white text-xs font-bold">
              {currentAccount.username.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-left">
            <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 max-w-[90px] truncate">
              {currentAccount.displayName}
            </span>
            {currentAccount.isVerified && (
              <span className="text-[10px] text-[#1a73e8] dark:text-[#8ab4f8] font-bold">✓</span>
            )}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
        </button>
      </div>
    </header>
  );
};
