import React, { useState } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  Loader2,
  Check,
  UserCheck,
  Moon,
} from 'lucide-react';
import { MoonLogo } from './MoonLogo';
import {
  MoonOAuthAuthRequest,
  resolveRobloxUserForOAuth,
  submitMoonOAuthDecision,
  RobloxOAuthSessionResponse,
} from '../utils/robloxApi';

interface MoonOAuthModalProps {
  isOpen: boolean;
  authRequest: MoonOAuthAuthRequest | null;
  onClose: () => void;
  onAuthenticated: (session: RobloxOAuthSessionResponse) => void;
  onDenied: () => void;
}

export const MoonOAuthModal: React.FC<MoonOAuthModalProps> = ({
  isOpen,
  authRequest,
  onClose,
  onAuthenticated,
  onDenied,
}) => {
  const [mode, setMode] = useState<'moon' | 'roblox'>('moon');
  const [moonUsername, setMoonUsername] = useState('MoonPilot');
  const [moonDisplayName, setMoonDisplayName] = useState('Moon Pilot');

  const [robloxQuery, setRobloxQuery] = useState('');
  const [verifiedProfile, setVerifiedProfile] = useState<{
    id: string;
    username: string;
    displayName: string;
    hasVerifiedBadge: boolean;
    avatarUrl: string;
  } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !authRequest) return null;

  const handleVerifyRoblox = async (targetName?: string) => {
    const clean = (targetName ?? robloxQuery).trim();
    if (!clean) {
      setError('Enter a Roblox username first.');
      return;
    }
    if (targetName) setRobloxQuery(targetName);
    setIsLookingUp(true);
    setError(null);
    try {
      const profile = await resolveRobloxUserForOAuth(clean);
      setVerifiedProfile(profile);
    } catch (err: any) {
      setVerifiedProfile(null);
      setError(err.message || 'Could not resolve Roblox user.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleDecision = async (decision: 'approve' | 'deny') => {
    setError(null);
    if (decision === 'approve' && mode === 'moon' && !moonUsername.trim()) {
      setError('Please enter a Moon username.');
      return;
    }
    if (decision === 'approve' && mode === 'roblox' && !robloxQuery.trim() && !verifiedProfile) {
      setError('Please enter or verify a Roblox username.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitMoonOAuthDecision({
        reqId: authRequest.reqId,
        decision,
        mode,
        moonUsername: moonUsername.trim(),
        moonDisplayName: moonDisplayName.trim() || moonUsername.trim(),
        robloxUsername: verifiedProfile?.username || robloxQuery.trim(),
        robloxId: verifiedProfile?.id,
        picture: verifiedProfile?.avatarUrl,
        isVerified: verifiedProfile?.hasVerifiedBadge,
      });

      if (result.denied) {
        onDenied();
        onClose();
        return;
      }

      if (result.session?.authenticated) {
        onAuthenticated(result.session);
        onClose();
      } else {
        setError('Authorization completed, but session could not be verified.');
      }
    } catch (err: any) {
      setError(err.message || 'Authorization failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-[#282a2d] rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl p-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1a73e8] via-[#8ab4f8] to-[#34a853]" />

        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-[#303134]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-5">
          <MoonLogo withTile className="w-10 h-10 shrink-0" />
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Moon OAuth 2.0 Authorization
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Self-hosted Auth.js provider · RS256 JWT + PKCE {authRequest.codeChallengeMethod}
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 dark:bg-[#202124] rounded-xl mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('moon');
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'moon'
                ? 'bg-white dark:bg-[#303134] text-[#1a73e8] dark:text-[#8ab4f8] shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Moon Identity</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('roblox');
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'roblox'
                ? 'bg-white dark:bg-[#303134] text-[#1a73e8] dark:text-[#8ab4f8] shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Link Roblox Profile</span>
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        {mode === 'moon' ? (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                Moon Username
              </label>
              <input
                type="text"
                value={moonUsername}
                onChange={(e) => setMoonUsername(e.target.value)}
                placeholder="e.g. MoonPilot"
                className="w-full h-9 px-3 text-xs bg-neutral-100 dark:bg-[#202124] rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#1a73e8]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={moonDisplayName}
                onChange={(e) => setMoonDisplayName(e.target.value)}
                placeholder="Moon Pilot"
                className="w-full h-9 px-3 text-xs bg-neutral-100 dark:bg-[#202124] rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#1a73e8]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                Roblox Username
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={robloxQuery}
                  onChange={(e) => setRobloxQuery(e.target.value)}
                  placeholder="e.g. Builderman or Stickmasterluke"
                  className="flex-1 h-9 px-3 text-xs bg-neutral-100 dark:bg-[#202124] rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#1a73e8]"
                />
                <button
                  type="button"
                  onClick={() => handleVerifyRoblox()}
                  disabled={isLookingUp}
                  className="h-9 px-3 text-xs font-semibold bg-neutral-100 dark:bg-[#303134] hover:bg-neutral-200 dark:hover:bg-[#3c4043] text-neutral-800 dark:text-neutral-200 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-1"
                >
                  {isLookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['Roblox', 'Builderman', 'Stickmasterluke'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleVerifyRoblox(preset)}
                  className="px-2.5 py-1 text-[11px] bg-neutral-100 dark:bg-[#202124] hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] text-neutral-600 dark:text-neutral-300 rounded-full border border-neutral-200 dark:border-neutral-700"
                >
                  @{preset}
                </button>
              ))}
            </div>

            {verifiedProfile && (
              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
                {verifiedProfile.avatarUrl && (
                  <img
                    src={verifiedProfile.avatarUrl}
                    alt={verifiedProfile.displayName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover bg-neutral-200"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {verifiedProfile.displayName}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                    @{verifiedProfile.username} · ID #{verifiedProfile.id}
                  </div>
                </div>
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
            )}
          </div>
        )}

        {/* OAuth Cryptographic Key & Scope Details */}
        <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 text-[11px] space-y-1.5 mb-5">
          <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
            <span className="flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-[#1a73e8]" />
              Client ID
            </span>
            <span className="font-mono text-[#1a73e8] dark:text-[#8ab4f8]">{authRequest.clientId}</span>
          </div>
          <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Signing Key (JWKS)
            </span>
            <span className="font-mono text-neutral-700 dark:text-neutral-200">
              {authRequest.keys.kid} ({authRequest.keys.algorithm})
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
            <span>Scopes &amp; PKCE</span>
            <span className="font-mono text-neutral-700 dark:text-neutral-200">
              {authRequest.scopes.join(' ')} · {authRequest.codeChallengeMethod || 'S256'}
            </span>
          </div>
        </div>

        {/* Decision Buttons */}
        <div className="grid grid-cols-5 gap-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDecision('deny')}
            className="col-span-2 h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#303134] transition-colors"
          >
            Deny
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDecision('approve')}
            className="col-span-3 h-10 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] disabled:bg-neutral-400 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Authorizing...</span>
              </>
            ) : (
              <span>Authorize &amp; Sign In</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
