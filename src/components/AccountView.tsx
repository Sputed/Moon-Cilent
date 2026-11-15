import React, { useState } from 'react';
import {
  User,
  Calendar,
  Users,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  UserPlus,
  Loader2,
  Radio,
  Trash2,
  LogIn,
  LogOut,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  RotateCw,
} from 'lucide-react';
import { RobloxAccount } from '../types/launcher';
import { fetchFullRobloxAccount, RobloxOAuthSessionResponse, MoonOAuthKeysInfo } from '../utils/robloxApi';
import { OAuthSetupNotice } from './AccountSwitcherModal';

interface AccountViewProps {
  currentAccount: RobloxAccount;
  accounts: RobloxAccount[];
  onSelectAccount: (account: RobloxAccount) => void;
  onAddAccount: (account: RobloxAccount) => void;
  onRemoveAccount: (accountId: string) => void;
  onRefreshAccount: (username: string) => void;
  oauthSession: RobloxOAuthSessionResponse | null;
  oauthNotice: OAuthSetupNotice | null;
  isOAuthPending: boolean;
  onSignInWithRobloxOAuth: () => void;
  onSignOutRobloxOAuth: () => void;
  oauthKeys?: MoonOAuthKeysInfo | null;
  isRotatingKeys?: boolean;
  onRotateOAuthKeys?: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  currentAccount,
  accounts,
  onSelectAccount,
  onAddAccount,
  onRemoveAccount,
  onRefreshAccount,
  oauthSession,
  oauthNotice,
  isOAuthPending,
  onSignInWithRobloxOAuth,
  onSignOutRobloxOAuth,
  oauthKeys,
  isRotatingKeys = false,
  onRotateOAuthKeys,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(currentAccount.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLinkNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsernameInput.trim()) return;

    setIsLinking(true);
    setLinkError(null);
    try {
      const realAccount = await fetchFullRobloxAccount(newUsernameInput.trim());
      onAddAccount(realAccount);
      setNewUsernameInput('');
    } catch (err: any) {
      setLinkError(err.message || 'Could not find this Roblox account.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleRefreshCurrent = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshAccount(currentAccount.username);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <User className="w-5 h-5 text-[#1a73e8] dark:text-[#8ab4f8]" />
              Official Roblox Account System
            </h2>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" />
              Moon OAuth Synced
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Real profile data, official 3D avatar rendering, and live presence status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {oauthSession?.authenticated ? (
            <button
              onClick={onSignOutRobloxOAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Moon OAuth: @{oauthSession.account?.username}</span>
              <LogOut className="w-3 h-3 ml-1 opacity-75" />
            </button>
          ) : (
            <button
              onClick={onSignInWithRobloxOAuth}
              disabled={isOAuthPending}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] disabled:bg-neutral-400 text-white rounded-xl transition-colors"
            >
              {isOAuthPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              <span>Sign in with Moon OAuth</span>
            </button>
          )}

          <button
            onClick={handleRefreshCurrent}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#303134] rounded-xl border border-neutral-200 dark:border-neutral-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Live Status</span>
          </button>
        </div>
      </div>

      {oauthNotice && (
        <div
          className={`p-4 rounded-2xl border text-xs space-y-2 ${
            oauthNotice.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
              : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/70 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex items-start gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{oauthNotice.message}</span>
          </div>
          {oauthNotice.redirectUri && (
            <div className="font-mono text-[11px] break-all bg-black/5 dark:bg-black/30 px-3 py-2 rounded-xl">
              Redirect URI: {oauthNotice.redirectUri}
            </div>
          )}
        </div>
      )}

      {/* Active Roblox Account Profile Showcase */}
      <div className="p-6 bg-white dark:bg-[#282a2d] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden">
        {/* Top Google accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1a73e8] via-[#ea4335] to-[#fbbc04]" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Left: 3D Avatar Render */}
          <div className="relative shrink-0 flex flex-col items-center">
            <div className="w-40 h-48 rounded-2xl bg-gradient-to-b from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center overflow-hidden p-2">
              {currentAccount.avatarFullBodyUrl ? (
                <img
                  src={currentAccount.avatarFullBodyUrl}
                  alt={currentAccount.displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              ) : currentAccount.avatarUrl ? (
                <img
                  src={currentAccount.avatarUrl}
                  alt={currentAccount.displayName}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-neutral-400" />
              )}
            </div>

            {/* Live Presence Badge */}
            <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-[#303134]">
              <span
                className={`w-2 h-2 rounded-full ${
                  currentAccount.presence === 'Online'
                    ? 'bg-emerald-500 animate-pulse'
                    : currentAccount.presence === 'In Game'
                    ? 'bg-blue-500'
                    : currentAccount.presence === 'In Studio'
                    ? 'bg-amber-500'
                    : 'bg-neutral-400'
                }`}
              />
              <span className="text-neutral-700 dark:text-neutral-300">
                {currentAccount.presence || 'Online on Roblox'}
              </span>
            </div>
          </div>

          {/* Right: Profile Details */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {currentAccount.displayName}
                  </h3>
                  {currentAccount.isVerified && (
                    <span
                      title="Verified Roblox User"
                      className="w-4 h-4 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-[10px] font-bold"
                    >
                      ✓
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                  @{currentAccount.username}
                </div>
              </div>

              {/* Web Profile Link */}
              <a
                href={`https://www.roblox.com/users/${currentAccount.id}/profile`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-colors self-center md:self-start"
              >
                <span>View on Roblox.com</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Bio Description */}
            <p className="text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-[#303134] p-3 rounded-xl border border-neutral-100 dark:border-neutral-700/60 mb-4 italic leading-relaxed">
              "{currentAccount.description || 'Welcome to my Roblox profile!'}"
            </p>

            {/* Account Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#303134]">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">
                  Roblox ID
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                  <span>{currentAccount.id}</span>
                  <button
                    onClick={handleCopyUserId}
                    title="Copy User ID"
                    className="p-1 hover:text-[#1a73e8]"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#303134]">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">
                  Friends
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{currentAccount.friendsCount ?? 0}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#303134]">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">
                  Followers
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-[#1a73e8] dark:text-[#8ab4f8]">
                  <Users className="w-3.5 h-3.5" />
                  <span>{(currentAccount.followersCount ?? 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#303134]">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">
                  Following / Rig
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                  <span>{(currentAccount.followingsCount ?? 0).toLocaleString()}</span>
                  <span className="text-neutral-400">·</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">{currentAccount.avatarType || 'R15'}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#303134]">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">
                  Joined Roblox
                </div>
                <div className="flex items-center gap-1 font-mono text-neutral-700 dark:text-neutral-300 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{currentAccount.createdDate || '2024'}</span>
                </div>
              </div>
            </div>

            {currentAccount.groups && currentAccount.groups.length > 0 && (
              <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Joined Communities (groups.roblox.com)
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentAccount.groups.map((g) => (
                    <div
                      key={g.id}
                      className="px-2.5 py-1 rounded-xl bg-neutral-50 dark:bg-[#303134] border border-neutral-200/70 dark:border-neutral-700 text-[11px] flex items-center gap-1.5"
                    >
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{g.name}</span>
                      <span className="text-neutral-400">·</span>
                      <span className="text-[#1a73e8] dark:text-[#8ab4f8] font-medium">{g.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Account Switcher & Link Real Roblox Account */}
      <div className="p-5 bg-white dark:bg-[#282a2d] rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Linked Roblox Accounts ({accounts.length})
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Switch between your main account, alt accounts, and testing profiles with zero re-login delay.
            </p>
          </div>
        </div>

        {/* Link Real Account Bar */}
        <form onSubmit={handleLinkNewAccount} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter real Roblox username (e.g. your username or Stickmasterluke)..."
              value={newUsernameInput}
              onChange={(e) => setNewUsernameInput(e.target.value)}
              className="flex-1 h-9 px-3.5 text-xs bg-neutral-100 dark:bg-[#303134] rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#1a73e8]"
              disabled={isLinking}
            />
            <button
              type="submit"
              disabled={isLinking || !newUsernameInput.trim()}
              className="px-4 h-9 text-xs font-semibold bg-[#1a73e8] disabled:bg-neutral-400 text-white rounded-xl hover:bg-[#1557b0] transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {isLinking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Link Account</span>
                </>
              )}
            </button>
          </div>

          {linkError && (
            <div className="p-2 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900">
              {linkError}
            </div>
          )}
        </form>

        {/* Accounts List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {accounts.map((acc) => {
            const isCurrent = acc.id === currentAccount.id;
            return (
              <div
                key={acc.id}
                onClick={() => onSelectAccount(acc)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  isCurrent
                    ? 'border-[#1a73e8] bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-[#303134]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {acc.avatarUrl ? (
                    <img
                      src={acc.avatarUrl}
                      alt={acc.displayName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover bg-neutral-100"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1a73e8] to-[#34a853] flex items-center justify-center text-white font-bold text-xs">
                      {acc.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <span>{acc.displayName}</span>
                      {acc.isVerified && <span className="text-[10px] text-[#1a73e8]">✓</span>}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                      <span>@{acc.username}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">ID #{acc.id}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCurrent ? (
                    <span className="text-[10px] font-semibold text-[#1a73e8] dark:text-[#8ab4f8] bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAccount(acc.id);
                      }}
                      title="Unlink Account"
                      className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Moon OAuth 2.0 Cryptographic Keys & JWKS */}
      {oauthKeys && (
        <div className="p-5 bg-white dark:bg-[#282a2d] rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#1a73e8] dark:text-[#8ab4f8]" />
                <span>Moon OAuth 2.0 Keys &amp; JWKS</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Auto-generated RSA-2048 signing keypair ({oauthKeys.algorithm}), OAuth client credentials, and Auth.js session secret.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <a
                href={oauthKeys.jwksUri}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-[#1a73e8] dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-xl border border-blue-200/70 dark:border-blue-900/60 flex items-center gap-1.5 transition-colors"
              >
                <span>View JWKS</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {onRotateOAuthKeys && (
                <button
                  onClick={onRotateOAuthKeys}
                  disabled={isRotatingKeys}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-[#303134] hover:bg-neutral-200 dark:hover:bg-[#3c4043] disabled:opacity-50 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRotatingKeys ? 'animate-spin' : ''}`} />
                  <span>{isRotatingKeys ? 'Rotating...' : 'Rotate OAuth Keys'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#303134]">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">
                Client ID
              </div>
              <div className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                {oauthKeys.clientId}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#303134]">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">
                Client Secret
              </div>
              <div className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                {oauthKeys.clientSecretMasked}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#303134]">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">
                Signing Key (kid · alg)
              </div>
              <div className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                {oauthKeys.kid} · {oauthKeys.algorithm}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#303134]">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">
                Public Key Fingerprint
              </div>
              <div className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                {oauthKeys.keyFingerprint}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
