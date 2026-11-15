import React from 'react';
import { X, Smartphone, Monitor, Download, ExternalLink, CheckCircle2, Sparkles } from 'lucide-react';
import { MoonLogo } from './MoonLogo';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-[#282a2d] rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-[#303134]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="p-6 pb-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3.5">
          <MoonLogo withTile className="w-11 h-11 shrink-0" />
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Install Moon Client App
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Run Moon Client as a standalone app with its own icon and offline shell.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="text-xs text-emerald-800 dark:text-emerald-300">
                Moon Client is installed and running in standalone app mode.
              </div>
            </div>
          ) : isInstallable ? (
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#202124] border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-neutral-100">
                <Monitor className="w-4 h-4 text-[#1a73e8]" />
                <span>Ready to Install</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Install Moon Client directly to your device for instant standalone launch and cached offline assets.
              </p>
              <button
                onClick={async () => {
                  const ok = await install();
                  if (ok) onClose();
                }}
                className="w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Install Moon Client</span>
              </button>
            </div>
          ) : isIOS ? (
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#202124] border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-neutral-100">
                <Smartphone className="w-4 h-4 text-[#1a73e8]" />
                <span>Install on iPhone / iPad</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Tap the <strong>Share</strong> icon in Safari, then choose <strong>Add to Home Screen</strong> to install Moon Client as a full-screen app.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#202124] border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-neutral-100">
                <Monitor className="w-4 h-4 text-[#1a73e8]" />
                <span>Install via Browser Menu</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Click the <strong>Install Moon Client</strong> icon in your browser&apos;s address bar (or open <strong>Menu → Apps → Install Moon Client</strong>) to pin it as a standalone app.
              </p>
            </div>
          )}

          {/* Downloadable Launcher Icon Assets */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#202124] border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <MoonLogo withTile className="w-10 h-10 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Launcher Icon
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Vector SVG &amp; 512px PNG
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href="/icon.svg"
                download="moon-client-icon.svg"
                className="px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-[#303134] hover:bg-neutral-100 dark:hover:bg-[#3c4043] rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors"
              >
                SVG
              </a>
              <a
                href="/pwa-512x512.png"
                download="moon-client-icon-512.png"
                className="px-2.5 py-1.5 text-[11px] font-semibold text-[#1a73e8] dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
              >
                PNG 512px
              </a>
            </div>
          </div>

          {/* Official Roblox Client Engine Link */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-[#1a73e8] shrink-0" />
              <span>Roblox Player Engine</span>
            </div>
            <a
              href="https://www.roblox.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1a73e8] dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Download Roblox</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
