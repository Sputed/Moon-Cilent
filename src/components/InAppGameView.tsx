import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  Users,
  ThumbsUp,
  ThumbsDown,
  Globe2,
  Award,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight,
  Heart,
  Bookmark,
  RefreshCw,
  Monitor,
  Loader2,
  Sliders,
  Eye,
  Clock,
  ShieldCheck,
  Video,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import {
  RobloxGame,
  RobloxExperienceDetails,
  RobloxExperienceVideo,
  ServerInstance,
} from '../types/launcher';
import { fetchFullExperienceDetails } from '../utils/robloxApi';

interface InAppGameViewProps {
  game: RobloxGame;
  onBack: () => void;
  onToggleFavorite: (gameId: string) => void;
  onToggleBookmark?: (game: RobloxGame) => void;
  onLaunchWithModal: (game: RobloxGame, targetServer?: ServerInstance | null) => void;
}

export const InAppGameView: React.FC<InAppGameViewProps> = ({
  game,
  onBack,
  onToggleFavorite,
  onToggleBookmark,
  onLaunchWithModal,
}) => {
  const [details, setDetails] = useState<RobloxExperienceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [innerTab, setInnerTab] = useState<'overview' | 'servers' | 'badges'>('overview');
  const [protocolMessage, setProtocolMessage] = useState<string | null>(null);

  const loadDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchFullExperienceDetails(game.placeId);
      setDetails(data);
      setActiveSlide(0);
    } catch (err: any) {
      setError(err.message || 'Failed to load full Roblox experience details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [game.placeId]);

  const liveGame = details?.game
    ? { ...details.game, isFavorite: game.isFavorite, isBookmarked: game.isBookmarked }
    : game;

  const gameIconUrl = details?.iconUrl || liveGame.iconUrl || liveGame.thumbnail || '';
  const gameBannerUrl =
    details?.bannerUrl || liveGame.bannerImage || details?.screenshots?.[0] || gameIconUrl;
  const connectedVideos: RobloxExperienceVideo[] = details?.videos || [];

  type MediaSlide =
    | { kind: 'video'; label: string; thumb: string; video: RobloxExperienceVideo }
    | { kind: 'banner'; label: string; thumb: string; url: string }
    | { kind: 'screenshot'; label: string; thumb: string; url: string }
    | { kind: 'icon'; label: string; thumb: string; url: string };

  const mediaSlides: MediaSlide[] = [];
  connectedVideos.forEach((v, idx) => {
    mediaSlides.push({
      kind: 'video',
      label: connectedVideos.length > 1 ? `Video ${idx + 1}` : 'Game Video',
      thumb: v.thumbnailUrl || gameBannerUrl || gameIconUrl,
      video: v,
    });
  });
  if (gameBannerUrl) {
    mediaSlides.push({
      kind: 'banner',
      label: 'Banner',
      thumb: gameBannerUrl,
      url: gameBannerUrl,
    });
  }
  if (details?.screenshots && details.screenshots.length > 0) {
    details.screenshots.forEach((shot, idx) => {
      if (shot && shot !== gameBannerUrl) {
        mediaSlides.push({
          kind: 'screenshot',
          label: `Scene ${idx + 1}`,
          thumb: shot,
          url: shot,
        });
      }
    });
  }
  if (gameIconUrl) {
    mediaSlides.push({
      kind: 'icon',
      label: 'Game Icon',
      thumb: gameIconUrl,
      url: gameIconUrl,
    });
  }

  const currentSlide = mediaSlides[activeSlide] || mediaSlides[0] || null;

  const handleLaunchInsideWindows = (targetServer?: ServerInstance) => {
    const uri = targetServer
      ? `roblox://experiences/start?placeId=${liveGame.placeId}&gameInstanceId=${targetServer.jobId}`
      : `roblox://experiences/start?placeId=${liveGame.placeId}`;

    // Trigger Windows protocol handler without popup blockers
    const link = document.createElement('a');
    link.href = uri;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setProtocolMessage(
      targetServer
        ? `Connected via Windows roblox:// bridge to server ${targetServer.jobId.slice(0, 8)}...`
        : `Connected via Windows roblox:// bridge to Place #${liveGame.placeId}`
    );
  };

  const formatNumber = (n: number) => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <div className="space-y-5">
      {/* Top In-App Breadcrumb & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-[#282a2d] hover:bg-neutral-100 dark:hover:bg-[#303134] border border-neutral-200 dark:border-neutral-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Games</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-mono">Place #{liveGame.placeId}</span>
            {liveGame.universeId && (
              <>
                <span>·</span>
                <span className="font-mono">Universe #{liveGame.universeId}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleBookmark && (
            <button
              onClick={() => onToggleBookmark(liveGame)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${
                game.isBookmarked
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70 text-amber-700 dark:text-amber-300'
                  : 'bg-white dark:bg-[#282a2d] hover:bg-neutral-100 dark:hover:bg-[#303134] border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${
                  game.isBookmarked ? 'fill-current text-amber-500' : 'text-neutral-400'
                }`}
              />
              <span>{game.isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
          )}

          <button
            onClick={() => onToggleFavorite(game.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#282a2d] hover:bg-neutral-100 dark:hover:bg-[#303134] border border-neutral-200 dark:border-neutral-800 rounded-xl transition-colors"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                game.isFavorite ? 'fill-[#ea4335] text-[#ea4335]' : 'text-neutral-400'
              }`}
            />
            <span>{game.isFavorite ? 'Favorited' : 'Favorite'}</span>
          </button>

          <button
            onClick={loadDetails}
            disabled={isLoading}
            title="Refresh live Roblox telemetry"
            className="p-2 bg-white dark:bg-[#282a2d] hover:bg-neutral-100 dark:hover:bg-[#303134] border border-neutral-200 dark:border-neutral-800 rounded-xl transition-colors text-neutral-600 dark:text-neutral-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <a
            href={`https://www.roblox.com/games/${liveGame.placeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-[#282a2d] hover:bg-neutral-100 dark:hover:bg-[#303134] border border-neutral-200 dark:border-neutral-800 rounded-xl transition-colors"
          >
            <span>Roblox Page</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main In-App Game Window Card */}
      <div className="bg-white dark:bg-[#282a2d] rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
        {/* Top Experience Banner Strip with Game Icon & Quick Badges */}
        <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          {gameBannerUrl && (
            <img
              src={gameBannerUrl}
              alt={`${liveGame.name} Banner`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-70 scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />

          <div className="relative z-10 h-full px-5 sm:px-6 pb-4 flex items-end justify-between gap-4">
            <div className="flex items-end gap-4 min-w-0">
              {gameIconUrl ? (
                <img
                  src={gameIconUrl}
                  alt={`${liveGame.name} Icon`}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 border-2 border-white/25 shadow-xl bg-neutral-800"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#1a73e8] text-white flex items-center justify-center shrink-0 border-2 border-white/20 shadow-xl">
                  <Play className="w-7 h-7 fill-current" />
                </div>
              )}

              <div className="min-w-0 pb-0.5">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-md text-[10px] font-semibold text-white">
                    {liveGame.category}
                  </span>
                  {connectedVideos.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-[#1a73e8]/80 backdrop-blur-md text-[10px] font-semibold text-white flex items-center gap-1">
                      <Film className="w-3 h-3" />
                      Video Connected
                    </span>
                  )}
                </div>
                <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight truncate">
                  {liveGame.name}
                </h1>
                <p className="text-xs text-neutral-300 truncate">
                  By <span className="font-semibold text-white">{liveGame.creator}</span>
                  <span className="mx-1.5 text-white/40">·</span>
                  <span className="font-mono text-emerald-300">{liveGame.activePlayers.toLocaleString()} playing live</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left: In-App Widescreen Game Display Stage (Video, Banner, Screenshots, Icon) */}
          <div className="lg:col-span-8 bg-neutral-950 relative flex flex-col">
            <div className="relative aspect-video w-full overflow-hidden bg-neutral-900">
              {currentSlide?.kind === 'video' ? (
                currentSlide.video.type === 'roblox' && currentSlide.video.streamUrl ? (
                  <video
                    key={currentSlide.video.id}
                    src={currentSlide.video.streamUrl}
                    poster={currentSlide.video.thumbnailUrl || gameBannerUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                ) : currentSlide.video.embedUrl ? (
                  <iframe
                    key={currentSlide.video.id}
                    src={currentSlide.video.embedUrl}
                    title={currentSlide.video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : null
              ) : currentSlide ? (
                <img
                  src={currentSlide.url}
                  alt={`${liveGame.name} ${currentSlide.label}`}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full ${currentSlide.kind === 'icon' ? 'object-contain p-8 bg-neutral-950' : 'object-cover'}`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-[#1a73e8]" />
                  ) : (
                    <Monitor className="w-10 h-10 opacity-50" />
                  )}
                </div>
              )}

              {/* Subtle top bar (does not block video controls at bottom) */}
              <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md text-white text-[11px] font-medium border border-white/10">
                  {currentSlide?.kind === 'video' ? (
                    <Video className="w-3.5 h-3.5 text-[#8ab4f8]" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-[#8ab4f8]" />
                  )}
                  <span>
                    {currentSlide ? currentSlide.label : 'Experience Media'}
                  </span>
                </div>

                {mediaSlides.length > 1 && (
                  <div className="px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md text-neutral-200 text-[11px] font-mono">
                    {activeSlide + 1} / {mediaSlides.length}
                  </div>
                )}
              </div>

              {/* Carousel Navigation Arrows */}
              {mediaSlides.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveSlide((prev) => (prev - 1 + mediaSlides.length) % mediaSlides.length)
                    }
                    aria-label="Previous media"
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md transition-colors z-10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setActiveSlide((prev) => (prev + 1) % mediaSlides.length)
                    }
                    aria-label="Next media"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md transition-colors z-10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Media Strip: Video, Banner, Scenes & Game Icon */}
            {mediaSlides.length > 0 && (
              <div className="p-2.5 bg-neutral-900 border-t border-neutral-800 flex items-center gap-2 overflow-x-auto">
                {mediaSlides.map((slide, idx) => (
                  <button
                    key={`${slide.kind}-${idx}`}
                    onClick={() => setActiveSlide(idx)}
                    className={`relative w-28 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all group ${
                      activeSlide === idx
                        ? 'border-[#1a73e8] opacity-100'
                        : 'border-transparent opacity-65 hover:opacity-95'
                    }`}
                  >
                    <img
                      src={slide.thumb}
                      alt={slide.label}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 px-1.5 py-0.5 bg-black/75 text-[10px] font-semibold text-white flex items-center justify-center gap-1 truncate">
                      {slide.kind === 'video' && <Play className="w-2.5 h-2.5 fill-current text-[#8ab4f8]" />}
                      <span>{slide.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Connected Game Icon, Media Summary, Live Stats & Play Controls */}
          <div className="lg:col-span-4 p-6 flex flex-col justify-between gap-5 border-t lg:border-t-0 lg:border-l border-neutral-200 dark:border-neutral-800">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {gameIconUrl && (
                  <img
                    src={gameIconUrl}
                    alt={liveGame.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-neutral-200 dark:border-neutral-700"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                    {liveGame.name}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Icon · Banner · {connectedVideos.length > 0 ? `${connectedVideos.length} Connected Video` : 'HD Gallery'}
                  </p>
                </div>
              </div>

              {/* Quick Live Metrics */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-[#202124] border border-neutral-200/80 dark:border-neutral-800">
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-500" />
                    <span>Playing Now</span>
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-0.5">
                    {liveGame.activePlayers.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-[#202124] border border-neutral-200/80 dark:border-neutral-800">
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3 text-[#1a73e8]" />
                    <span>Rating</span>
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-0.5">
                    {liveGame.rating}%
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-[#202124] border border-neutral-200/80 dark:border-neutral-800">
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-neutral-400" />
                    <span>Total Visits</span>
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-0.5">
                    {liveGame.totalVisits}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-[#202124] border border-neutral-200/80 dark:border-neutral-800">
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>Max Players</span>
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-0.5">
                    {liveGame.maxServerSize} / server
                  </div>
                </div>
              </div>

              {protocolMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{protocolMessage}</span>
                </div>
              )}

              {error && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-700 dark:text-amber-300">
                  {error}
                </div>
              )}
            </div>

            {/* Primary Windows Client Launch Controls */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => handleLaunchInsideWindows()}
                className="w-full py-3 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play in Windows Client</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onLaunchWithModal(liveGame)}
                  className="py-2 px-3 bg-neutral-100 dark:bg-[#303134] hover:bg-neutral-200 dark:hover:bg-[#3c4043] text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Launch Options</span>
                </button>

                <a
                  href="https://www.roblox.com/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 bg-neutral-100 dark:bg-[#303134] hover:bg-neutral-200 dark:hover:bg-[#3c4043] text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Roblox</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Inside Game View: Overview / Live Servers / Badges */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setInnerTab('overview')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
            innerTab === 'overview'
              ? 'bg-[#1a73e8] text-white'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#303134]'
          }`}
        >
          About & Details
        </button>

        <button
          onClick={() => setInnerTab('servers')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 ${
            innerTab === 'servers'
              ? 'bg-[#1a73e8] text-white'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#303134]'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span>Live Servers ({details?.servers?.length ?? 0})</span>
        </button>

        <button
          onClick={() => setInnerTab('badges')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 ${
            innerTab === 'badges'
              ? 'bg-[#1a73e8] text-white'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#303134]'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Badges ({details?.badges?.length ?? 0})</span>
        </button>
      </div>

      {/* Sub-Tab Panel */}
      {innerTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 p-6 bg-white dark:bg-[#282a2d] rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Experience Description
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
              {liveGame.description || 'No description provided by this Roblox creator.'}
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-[#282a2d] rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Live Roblox Votes & Metadata
            </h2>

            {details && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {formatNumber(details.upVotes)}
                    </span>
                    <span className="flex items-center gap-1 text-red-500 font-semibold">
                      <ThumbsDown className="w-3.5 h-3.5" />
                      {formatNumber(details.downVotes)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${liveGame.rating}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Genre</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{liveGame.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Favorites</span>
                    <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                      {details.favoritedCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Created</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{details.createdDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Last Updated</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{liveGame.lastUpdated}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {innerTab === 'servers' && (
        <div className="bg-white dark:bg-[#282a2d] rounded-3xl border border-neutral-200 dark:border-neutral-800 p-5">
          {isLoading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#1a73e8]" />
              <span>Fetching live server instances from Roblox...</span>
            </div>
          ) : details?.servers && details.servers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {details.servers.map((server) => (
                <div
                  key={server.jobId}
                  className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#202124] border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {server.region}
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {server.players}/{server.maxPlayers} players · {server.ping}ms · {server.fps} FPS
                    </div>
                  </div>
                  <button
                    onClick={() => handleLaunchInsideWindows(server)}
                    className="px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-neutral-500">
              No public server instances reported right now for Place #{liveGame.placeId}.
            </div>
          )}
        </div>
      )}

      {innerTab === 'badges' && (
        <div className="bg-white dark:bg-[#282a2d] rounded-3xl border border-neutral-200 dark:border-neutral-800 p-5">
          {isLoading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#1a73e8]" />
              <span>Loading experience badges...</span>
            </div>
          ) : details?.badges && details.badges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {details.badges.map((badge) => (
                <div
                  key={badge.id}
                  className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#202124] border border-neutral-200 dark:border-neutral-800 flex items-start gap-3"
                >
                  {badge.iconUrl ? (
                    <img
                      src={badge.iconUrl}
                      alt={badge.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover shrink-0 bg-neutral-200 dark:bg-neutral-800"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {badge.name}
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">
                      {badge.description || 'Roblox Experience Achievement'}
                    </p>
                    <div className="text-[10px] font-mono text-[#1a73e8] dark:text-[#8ab4f8] mt-1">
                      Rarity: {(badge.winRatePercentage * 100).toFixed(1)}% · {badge.awardedCount.toLocaleString()} won
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-neutral-500">
              No badges listed for this experience.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
