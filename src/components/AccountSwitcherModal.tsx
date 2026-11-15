import React, { useState } from 'react';
import {
  X,
  Users,
  Check,
  UserPlus,
  Loader2,
  ShieldCheck,
  LogIn,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { RobloxAccount } from '../types/launcher';
import { fetchFullRobloxAccount, RobloxOAuthSessionResponse } from '../utils/robloxApi';

export interface OAuthSetupNotice {
  type: 'setup' | 'error';
  message: string;
  redirectUri?: string;
  missing?: string[];
}

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: RobloxAccount[];
  currentAccount: RobloxAccount;
  onSelectAccount: (account: RobloxAccount) => void;
  onAddAccount: (account: RobloxAccount) => void;
  oauthSession: RobloxOAuthSessionResponse | null;
  oauthNotice: OAuthSetupNotice | null;
  isOAuthPending: boolean;
  onSignInWithRobloxOAuth: () => void;
  onSignOutRobloxOAuth: () => void;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
  accounts,
  currentAccount,
  onSelectAccount,
  onAddAccount,
  oauthSession,
  oauthNotice,
  isOAuthPending,
  onSignInWithRobloxOAuth,
  onSignOutRobloxOAuth,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearchAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    setIsSearchingUser(true);
    setUserSearchError(null);
    try {
      const realUser = await fetchFullRobloxAccount(usernameInput.trim());
      onAddAccount(realUser);
      setUsernameInput('');
      setIsAdding(false);
    } catch (err: any) {
      setUserSearchError(err.message || 'Could not find this Roblox account.');
    } finally {
      setIsSearchingUser(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-[#282a2d] rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl p-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-[#303134]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Header */}
        <div className="flex flex-col items-center text-center pb-5 border-b border-neutral-200 dark:border-neutral-700">
          <div className="relative mb-3">
            {currentAccount.avatarUrl ? (
              <img
                src={currentAccount.avatarUrl}
                alt={currentAccount.displayName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-[#282a2d] shadow-sm bg-neutral-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#1a73e8] to-[#34a853] flex items-center justify-center text-white text-xl font-bold">
                {currentAccount.username.charAt(0).toUpperCase()}
              </div>
            )}
            {currentAccount.isVerified && (
              <div
                title="Verified Roblox User"
                className="absolute bottom-0 right-0 w-5 h-5 bg-[#1a73e8] rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-xs"
              >
                ✓
              </div>
            )}
          </div>

          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 justify-center">
            <span>{currentAccount.displayName}</span>
            {currentAccount.isVerified && (
              <span className="text-xs text-[#1a73e8] dark:text-[#8ab4f8]">✓</span>
            )}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            @{currentAccount.username}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <div className="flex items-center gap-1 font-mono tabular-nums text-neutral-700 dark:text-neutral-300 font-semibold bg-neutral-100 dark:bg-[#303134] px-2.5 py-1 rounded-full">
              <Users className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>{(currentAccount.friendsCount ?? 0).toLocaleString()} Friends</span>
            </div>
            {currentAccount.isVerified && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#1a73e8] dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            )}
            {oauthSession?.authenticated && oauthSession.account?.id === currentAccount.id && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                <Check className="w-3 h-3" />
                OAuth Connected
              </span>
            )}
          </div>
        </div>

        {/* Switch Accounts List */}
        <div className="py-4 space-y-2">
          <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-2">
            Switch Linked Account
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {accounts.map((acc) => {
              const isSelected = acc.id === currentAccount.id;
              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    onSelectAccount(acc);
                    onClose();
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 border border-[#1a73e8]/30'
                      : 'hover:bg-neutral-100 dark:hover:bg-[#303134]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {acc.avatarUrl ? (
                      <img
                        src={acc.avatarUrl}
                        alt={acc.displayName}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover bg-neutral-100"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        {acc.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <span>{acc.displayName}</span>
                        {isSelected && (
                          <span className="text-[10px] font-normal text-[#1a73e8] dark:text-[#8ab4f8]">
                            (Active)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                        <span>@{acc.username}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">ID #{acc.id}</span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-[#1a73e8] dark:text-[#8ab4f8]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* OAuth Setup / Error Notice */}
        {oauthNotice && (
          <div
            className={`mb-3 p-3 rounded-2xl border text-[11px] space-y-1.5 ${
              oauthNotice.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-start gap-2 font-semibold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{oauthNotice.message}</span>
            </div>
            {oauthNotice.redirectUri && (
              <div className="font-mono text-[10px] break-all bg-black/5 dark:bg-black/30 p-1.5 rounded-lg">
                Callback: {oauthNotice.redirectUri}
              </div>
            )}
          </div>
        )}

        {/* Link Real Roblox Account / OAuth */}
        {isAdding ? (
          <form onSubmit={handleSearchAndLink} className="pt-3 border-t border-neutral-200 dark:border-neutral-700 space-y-2.5">
            <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              Link Roblox Username
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Enter a Roblox username to load its public 3D avatar and profile data.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Real Roblox Username (e.g. Stickmasterluke)"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="flex-1 h-8 px-3 text-xs bg-neutral-100 dark:bg-[#303134] rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#1a73e8]"
                required
                disabled={isSearchingUser}
              />
            </div>

            {userSearchError && (
              <div className="p-2 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg">
                {userSearchError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isSearchingUser || !usernameInput.trim()}
                className="flex-1 h-8 text-xs font-semibold bg-[#1a73e8] disabled:bg-neutral-400 text-white rounded-xl hover:bg-[#1557b0] transition-colors flex items-center justify-center gap-1.5"
              >
                {isSearchingUser ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying Roblox...</span>
                  </>
                ) : (
                  <span>Link Profile</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setUserSearchError(null);
                }}
                className="px-3 h-8 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onSignInWithRobloxOAuth}
                disabled={isOAuthPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] disabled:bg-neutral-400 text-white rounded-2xl transition-colors"
              >
                {isOAuthPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>Sign in with Moon OAuth</span>
              </button>
              {oauthSession?.authenticated && (
                <button
                  onClick={onSignOutRobloxOAuth}
                  title="Sign out Moon OAuth session"
                  className="p-2.5 text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 bg-neutral-100 dark:bg-[#303134] rounded-2xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-2xl transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Link by Username</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
