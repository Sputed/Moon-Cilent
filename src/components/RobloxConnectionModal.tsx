import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  CheckCircle2,
  RefreshCw,
  Server,
  Zap,
  Globe,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { RobloxApiStatus, RobloxClientVersion } from '../types/launcher';
import { fetchWindowsClientVersion } from '../utils/robloxApi';
import { dispatchRobloxProtocol, buildRobloxProtocolUri } from '../utils/robloxProtocol';
import { MoonLogo } from './MoonLogo';

interface RobloxConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: RobloxApiStatus | null;
  onRefreshStatus: () => void;
  isRefreshing: boolean;
}

export const RobloxConnectionModal: React.FC<RobloxConnectionModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
  isRefreshing,
}) => {
  const [testProtocolSuccess, setTestProtocolSuccess] = useState<boolean | null>(null);
  const [clientVersion, setClientVersion] = useState<RobloxClientVersion | null>(null);

  useEffect(() => {
    if (isOpen && !clientVersion) {
      fetchWindowsClientVersion().then(setClientVersion);
    }
  }, [isOpen, clientVersion]);

  if (!isOpen) return null;

  const handleTestClientConnection = () => {
    // Test dispatching protocol for Natural Disaster Survival (Place #189707)
    const testUri = buildRobloxProtocolUri('189707', undefined, undefined, 'modern');
    const sent = dispatchRobloxProtocol(testUri);
    setTestProtocolSuccess(sent);
    setTimeout(() => setTestProtocolSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#282a2d] rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl p-6 overflow-hidden">
        {/* Top Google accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1a73e8] via-[#34a853] to-[#ea4335]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-[#303134]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <MoonLogo withTile className="w-10 h-10 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Moon Client · Roblox Network Hub
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Live status, endpoint latency, and native Roblox client protocol bridge.
            </p>
          </div>
        </div>

        {/* Primary Connection Status Badge */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#303134] border border-neutral-200/80 dark:border-neutral-700/80 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div
                className={`w-3 h-3 rounded-full ${
                  status?.connected ? 'bg-emerald-500' : 'bg-red-500'
                } animate-ping absolute`}
              />
              <div
                className={`w-3 h-3 rounded-full ${
                  status?.connected ? 'bg-emerald-500' : 'bg-red-500'
                } relative`}
              />
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>
                  {status?.connected
                    ? 'Connected to Official Roblox Network'
                    : 'Connecting to Roblox Servers...'}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  {status ? `${status.operationalCount}/${status.totalServices} APIs Active` : 'Checking...'}
                </span>
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
                Avg latency: {status?.averageLatencyMs ?? 35} ms
                {clientVersion?.windowsPlayerVersion ? ` · Windows v${clientVersion.windowsPlayerVersion}` : ''}
              </div>
            </div>
          </div>

          <button
            onClick={onRefreshStatus}
            disabled={isRefreshing}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-[#282a2d] hover:bg-neutral-100 dark:hover:bg-[#3c4043] rounded-xl border border-neutral-200 dark:border-neutral-700 transition-colors shrink-0"
            title="Refresh connection status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Real Roblox API Service Grid */}
        <div className="space-y-2 mb-5">
          <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-1">
            Official Roblox API Domains ({status?.totalServices || 14})
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-56 overflow-y-auto pr-1">
            {status?.services && status.services.length > 0 ? (
              status.services.map((svc) => {
                const isOp = svc.status === 'operational';
                return (
                  <div
                    key={svc.endpoint}
                    className="py-2.5 flex items-center justify-between text-xs px-2 hover:bg-neutral-50 dark:hover:bg-[#303134]/50 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {isOp ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {svc.name}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          https://{svc.endpoint}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[11px] font-semibold tabular-nums ${
                          isOp
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {svc.latencyMs} ms
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isOp
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                            : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                        }`}
                      >
                        {isOp ? 'Operational' : `HTTP ${svc.statusCode ?? 'Err'}`}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-neutral-400">
                Querying live Roblox endpoints...
              </div>
            )}
          </div>
        </div>

        {/* Client Protocol Connection Test */}
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 mb-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#1a73e8]" />
              Native Client Protocol Handshake
            </div>
            <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
              roblox:// & roblox-player:
            </span>
          </div>

          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Verify that your device's operating system triggers the installed Roblox Player client when launched from this browser.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleTestClientConnection}
              className="px-3.5 py-1.5 text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
            >
              <Zap className="w-3 h-3" />
              <span>Test Native Client Launch</span>
            </button>

            <a
              href="https://www.roblox.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#303134] rounded-xl transition-colors flex items-center gap-1 border border-neutral-200 dark:border-neutral-700"
            >
              <span>Download Roblox</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {testProtocolSuccess !== null && (
            <div className="p-2 text-[11px] rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium">
              ✓ Dispatched protocol event to Roblox client. If prompted by your browser, click "Open Roblox".
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700 text-[11px] text-neutral-400">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Public REST + CDN Session Proxy</span>
          </div>
          <span>Roblox Protocol v2.4</span>
        </div>
      </div>
    </div>
  );
};
