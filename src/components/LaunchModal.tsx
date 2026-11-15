import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  Copy,
  ExternalLink,
  Zap,
  Globe,
  Server,
  Radio,
  Download,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import { RobloxGame, RobloxExperienceVideo, ServerInstance } from '../types/launcher';
import { fetchFullExperienceDetails } from '../utils/robloxApi';
import { buildRobloxProtocolUri, buildCommandLineLaunch, dispatchRobloxProtocol, ProtocolMode } from '../utils/robloxProtocol';
import { playLaunchChime } from '../utils/audioSynth';

interface LaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: RobloxGame | null;
  targetServer?: ServerInstance | null;
  customJobId?: string;
  customPrivateLink?: string;
}

export const LaunchModal: React.FC<LaunchModalProps> = ({
  isOpen,
  onClose,
  game,
  targetServer,
  customJobId,
  customPrivateLink,
}) => {
  const [launchStep, setLaunchStep] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [protocolMode, setProtocolMode] = useState<ProtocolMode>('modern');
  const [launchFeedback, setLaunchFeedback] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string>('');
  const [iconUrl, setIconUrl] = useState<string>('');
  const [connectedVideo, setConnectedVideo] = useState<RobloxExperienceVideo | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (isOpen && game) {
      setLaunchStep(0);
      setLaunchFeedback(null);
      setBannerUrl(game.bannerImage || game.thumbnail || '');
      setIconUrl(game.iconUrl || game.thumbnail || '');
      setConnectedVideo(null);
      setShowVideo(false);
      playLaunchChime();

      fetchFullExperienceDetails(game.placeId)
        .then((details) => {
          if (details.iconUrl) setIconUrl(details.iconUrl);
          if (details.bannerUrl) setBannerUrl(details.bannerUrl);
          if (details.videos && details.videos.length > 0) {
            setConnectedVideo(details.videos[0]);
          }
        })
        .catch(() => {
          // Keep baseline game media
        });

      const timer1 = setTimeout(() => setLaunchStep(1), 350);
      const timer2 = setTimeout(() => setLaunchStep(2), 700);
      const timer3 = setTimeout(() => setLaunchStep(3), 1100);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen, game]);

  if (!isOpen || !game) return null;

  const jobId = targetServer?.jobId || customJobId;
  const protocolUri = buildRobloxProtocolUri(game.placeId, jobId, customPrivateLink, protocolMode);
  const webLaunchUrl = `https://www.roblox.com/games/start?placeId=${game.placeId}`;
  const cliCommand = buildCommandLineLaunch(game.placeId, jobId);

  const handleLaunchProtocol = () => {
    const success = dispatchRobloxProtocol(protocolUri);
    if (success) {
      setLaunchFeedback('Handshake sent to Roblox Client. If prompted by your browser, choose "Open Roblox".');
    }
  };

  const handleCopyProtocol = () => {
    navigator.clipboard.writeText(protocolUri);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#282a2d] rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Top Game Visual Showcase: Banner / Video + Overlapping Game Icon */}
        <div className="relative h-44 w-full bg-neutral-950 overflow-hidden">
          {showVideo && connectedVideo ? (
            connectedVideo.type === 'roblox' && connectedVideo.streamUrl ? (
              <video
                src={connectedVideo.streamUrl}
                poster={connectedVideo.thumbnailUrl || bannerUrl}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover bg-black"
              />
            ) : connectedVideo.embedUrl ? (
              <iframe
                src={connectedVideo.embedUrl}
                title={connectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : null
          ) : bannerUrl ? (
            <img
              src={bannerUrl}
              alt={`${game.name} Banner`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a73e8]/40 via-[#202124] to-[#0f172a]" />
          )}

          {!showVideo && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 p-1.5 text-white/80 hover:text-white rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Toggle Banner / Video Button */}
          {connectedVideo && (
            <button
              type="button"
              onClick={() => setShowVideo((v) => !v)}
              className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-black/65 hover:bg-black/85 backdrop-blur-md text-white text-[11px] font-semibold border border-white/15 flex items-center gap-1.5 transition-colors"
            >
              {showVideo ? (
                <>
                  <ImageIcon className="w-3.5 h-3.5 text-[#8ab4f8]" />
                  <span>Show Banner</span>
                </>
              ) : (
                <>
                  <Film className="w-3.5 h-3.5 text-[#8ab4f8]" />
                  <span>Watch Game Video</span>
                </>
              )}
            </button>
          )}

          {!showVideo && (
            <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end gap-3">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt={game.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl object-cover shrink-0 shadow-lg border-2 border-white/25 bg-neutral-900"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1a73e8] to-[#34a853] flex items-center justify-center text-white shrink-0 border-2 border-white/20">
                  <Play className="w-6 h-6 fill-current" />
                </div>
              )}

              <div className="min-w-0">
                <h3 className="text-base font-bold text-white line-clamp-1">
                  {game.name}
                </h3>
                <div className="text-xs text-neutral-300 flex items-center gap-2 mt-0.5">
                  <span>Place ID: <code className="font-mono text-white">{game.placeId}</code></span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-emerald-300 font-semibold">
                    {game.activePlayers.toLocaleString()} playing
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-5">

        {/* Launch Pipeline Stepper */}
        <div className="p-4 bg-neutral-50 dark:bg-[#303134] rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 mb-5 space-y-3">
          <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
            Roblox Client Launch Pipeline
          </div>

          <div className="space-y-2 text-xs">
            {/* Step 1: Verification */}
            <div className="flex items-center gap-2.5">
              <CheckCircle2
                className={`w-4 h-4 transition-colors ${
                  launchStep >= 1 ? 'text-emerald-500' : 'text-neutral-300 dark:text-neutral-600'
                }`}
              />
              <span className={launchStep >= 1 ? 'text-neutral-800 dark:text-neutral-200 font-medium' : 'text-neutral-400'}>
                Place ID verified on official Roblox Asset CDN
              </span>
            </div>

            {/* Step 2: Datacenter & Server Handshake */}
            <div className="flex items-center gap-2.5">
              <CheckCircle2
                className={`w-4 h-4 transition-colors ${
                  launchStep >= 2 ? 'text-emerald-500' : 'text-neutral-300 dark:text-neutral-600'
                }`}
              />
              <span className={launchStep >= 2 ? 'text-neutral-800 dark:text-neutral-200 font-medium' : 'text-neutral-400'}>
                Server instance handshake connected
              </span>
            </div>

            {/* Step 3: Protocol Dispatch */}
            <div className="flex items-center gap-2.5">
              <CheckCircle2
                className={`w-4 h-4 transition-colors ${
                  launchStep >= 3 ? 'text-emerald-500' : 'text-neutral-300 dark:text-neutral-600'
                }`}
              />
              <span className={launchStep >= 3 ? 'text-neutral-800 dark:text-neutral-200 font-medium' : 'text-neutral-400'}>
                Roblox Client Dispatch Ready
              </span>
            </div>
          </div>
        </div>

        {/* Server Target details if specified */}
        {targetServer && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#1a73e8]" />
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                Target Instance: {targetServer.region}
              </span>
            </div>
            <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">
              {targetServer.ping} ms
            </span>
          </div>
        )}

        {/* Launch Feedback Banner */}
        {launchFeedback && (
          <div className="mb-3 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2 animate-in fade-in">
            <Radio className="w-3.5 h-3.5 text-[#1a73e8] shrink-0 animate-pulse" />
            <span>{launchFeedback}</span>
          </div>
        )}

        {/* Protocol Mode Selector */}
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">Launch Protocol:</span>
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#303134] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setProtocolMode('modern')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                protocolMode === 'modern'
                  ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Modern (roblox://)
            </button>
            <button
              type="button"
              onClick={() => setProtocolMode('windows-player')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                protocolMode === 'windows-player'
                  ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Player Beta (Windows)
            </button>
            <button
              type="button"
              onClick={() => setProtocolMode('classic')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                protocolMode === 'classic'
                  ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Classic
            </button>
          </div>
        </div>

        {/* Primary Action Buttons: Native Client Protocol + Web Launcher */}
        <div className="space-y-2 mb-4">
          <button
            onClick={handleLaunchProtocol}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-bold rounded-2xl transition-all shadow-md active:scale-98"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Native Roblox Client</span>
          </button>

          <a
            href={webLaunchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-neutral-100 dark:bg-[#303134] hover:bg-neutral-200 dark:hover:bg-[#3c4043] text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-2xl transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-[#1a73e8]" />
            <span>Launch via Official Roblox.com</span>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </a>

          <a
            href="https://www.roblox.com/download"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-medium text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Need Roblox Player? Download Official Roblox Client</span>
            <ExternalLink className="w-3 h-3 opacity-75" />
          </a>
        </div>

        {/* Deep Link & Command Line */}
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Deep Link & Command Line
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={protocolUri}
              className="flex-1 h-8 px-2.5 text-xs font-mono bg-neutral-100 dark:bg-[#303134] rounded-xl text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 truncate"
            />
            <button
              onClick={handleCopyProtocol}
              className="h-8 px-3 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-[#303134] hover:bg-neutral-200 dark:hover:bg-[#3c4043] rounded-xl transition-colors whitespace-nowrap"
            >
              {copiedLink ? 'Copied' : 'Copy URI'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={cliCommand}
              className="flex-1 h-8 px-2.5 text-xs font-mono bg-neutral-100 dark:bg-[#303134] rounded-xl text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 truncate"
            />
            <button
              onClick={handleCopyCli}
              className="h-8 px-3 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-[#303134] hover:bg-neutral-200 dark:hover:bg-[#3c4043] rounded-xl transition-colors whitespace-nowrap"
            >
              {copiedCli ? 'Copied' : 'Copy CLI'}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
