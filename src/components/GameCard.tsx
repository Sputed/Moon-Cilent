import React, { useState } from 'react';
import { Play, Heart, Bookmark, Users, ThumbsUp, Server, Sparkles } from 'lucide-react';
import { RobloxGame } from '../types/launcher';

interface GameCardProps {
  game: RobloxGame;
  onOpenInApp?: (game: RobloxGame) => void;
  onLaunch: (game: RobloxGame) => void;
  onToggleFavorite: (gameId: string) => void;
  onToggleBookmark?: (game: RobloxGame) => void;
  onInspectServers: (game: RobloxGame) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onOpenInApp,
  onLaunch,
  onToggleFavorite,
  onToggleBookmark,
  onInspectServers,
}) => {
  const [imageError, setImageError] = useState(false);

  // Formatter for player numbers (e.g. 482,390 -> 482K)
  const formatPlayers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  return (
    <div className="group relative flex flex-col justify-between p-3.5 bg-white dark:bg-[#282a2d] hover:bg-neutral-50/80 dark:hover:bg-[#303134] rounded-2xl border border-neutral-200 dark:border-neutral-800 transition-all hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md">
      <div
        onClick={() => (onOpenInApp ? onOpenInApp(game) : onLaunch(game))}
        className="cursor-pointer"
      >
        {/* Thumbnail Aspect Ratio 4:3 with Graceful Fallback */}
        <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 mb-3">
          {game.thumbnail && !imageError ? (
            <img
              src={game.thumbnail}
              alt={game.name}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#1a73e8]/10 via-[#34a853]/10 to-neutral-100 dark:to-neutral-800">
              <div className="w-12 h-12 rounded-xl bg-white/80 dark:bg-neutral-700/80 flex items-center justify-center mb-2 shadow-xs">
                <Sparkles className="w-6 h-6 text-[#1a73e8] dark:text-[#8ab4f8]" />
              </div>
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-1">
                {game.name}
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {game.category}
              </span>
            </div>
          )}

          {/* Quick Favorite Action */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(game.id);
            }}
            title={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white transition-colors"
          >
            <Heart
              className={`w-4 h-4 ${
                game.isFavorite ? 'fill-[#ea4335] text-[#ea4335]' : 'text-white'
              }`}
            />
          </button>
        </div>

        {/* Title and Creator */}
        <div className="mb-2">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-1 group-hover:text-[#1a73e8] dark:group-hover:text-[#8ab4f8] transition-colors">
            {game.name}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {game.creator}
          </p>
        </div>

        {/* Clean unboxed metadata with typographic separators (Zero-Pill Discipline) */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-3">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-mono tabular-nums">{formatPlayers(game.activePlayers)}</span>
          </div>
          <span aria-hidden="true">·</span>
          <div className="flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-mono tabular-nums">{game.rating}%</span>
          </div>
          <span aria-hidden="true">·</span>
          <span>{game.category}</span>
        </div>
      </div>

      {/* Action Row: Play CTA, Bookmark & Server Browser */}
      <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <button
          onClick={() => (onOpenInApp ? onOpenInApp(game) : onLaunch(game))}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#8ab4f8] dark:hover:bg-[#a8c7fa] text-white dark:text-[#202124] text-xs font-semibold rounded-xl transition-all shadow-xs hover:shadow-sm whitespace-nowrap active:scale-[0.98]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Play</span>
        </button>

        {onToggleBookmark && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(game);
            }}
            title={game.isBookmarked ? 'Unpin from Sidebar' : 'Bookmark & Pin to Sidebar'}
            aria-label={game.isBookmarked ? 'Unpin from Sidebar' : 'Bookmark & Pin to Sidebar'}
            className={`p-2 rounded-xl transition-colors shrink-0 ${
              game.isBookmarked
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-[#303134] hover:bg-neutral-200 dark:hover:bg-[#3c4043]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${game.isBookmarked ? 'fill-current' : ''}`} />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onInspectServers(game);
          }}
          title="Browse Servers & Ping"
          className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-[#303134] hover:bg-neutral-200 dark:hover:bg-[#3c4043] rounded-xl transition-colors shrink-0"
        >
          <Server className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
