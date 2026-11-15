import React, { useState, useEffect } from 'react';
import {
  Globe2,
  Server,
  RefreshCw,
  Search,
  Zap,
  Users,
  Copy,
  ExternalLink,
  Check,
  Radio,
  Loader2,
} from 'lucide-react';
import { RobloxGame, ServerInstance } from '../types/launcher';
import { fetchLiveServers } from '../utils/robloxApi';

interface ServerBrowserViewProps {
  games: RobloxGame[];
  selectedGame: RobloxGame;
  onSelectGame: (game: RobloxGame) => void;
  onJoinServerInstance: (game: RobloxGame, instance: ServerInstance) => void;
  onJoinCustomJobId: (game: RobloxGame, jobId: string, privateLink?: string) => void;
}

export const ServerBrowserView: React.FC<ServerBrowserViewProps> = ({
  games,
  selectedGame,
  onSelectGame,
  onJoinServerInstance,
  onJoinCustomJobId,
}) => {
  const [servers, setServers] = useState<ServerInstance[]>([]);
  const [isLoadingServers, setIsLoadingServers] = useState(true);
  const [sortFilter, setSortFilter] = useState<'lowestPing' | 'emptiest' | 'fullest'>('lowestPing');
  const [inputJobId, setInputJobId] = useState('');
  const [inputPrivateLink, setInputPrivateLink] = useState('');
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Load real live servers whenever selectedGame changes
  const loadServersForGame = async (placeId: string) => {
    setIsLoadingServers(true);
    try {
      const liveData = await fetchLiveServers(placeId);
      setServers(liveData || []);
      setIsLiveConnected(Array.isArray(liveData));
    } catch {
      setServers([]);
      setIsLiveConnected(false);
    } finally {
      setIsLoadingServers(false);
    }
  };

  useEffect(() => {
    if (selectedGame && selectedGame.placeId) {
      loadServersForGame(selectedGame.placeId);
    }
  }, [selectedGame]);

  const handleCopyJobId = (jobId: string) => {
    navigator.clipboard.writeText(jobId);
    setCopiedJobId(jobId);
    setTimeout(() => setCopiedJobId(null), 2000);
  };

  // Sort servers
  const sortedServers = [...servers].sort((a, b) => {
    if (sortFilter === 'lowestPing') return a.ping - b.ping;
    if (sortFilter === 'emptiest') return a.players - b.players;
    if (sortFilter === 'fullest') return b.players - a.players;
    return 0;
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-[#1a73e8] dark:text-[#8ab4f8]" />
              Live Server & Region Finder
            </h2>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" />
              Roblox Cluster Live
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Querying actual active server instances on Roblox for Place #{selectedGame.placeId}.
          </p>
        </div>

        {/* Target Game Selector with Game Icon */}
        <div className="flex items-center gap-2.5">
          {(selectedGame.iconUrl || selectedGame.thumbnail) && (
            <img
              src={selectedGame.iconUrl || selectedGame.thumbnail}
              alt={`${selectedGame.name} Icon`}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
            />
          )}
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Target:</span>
          <select
            value={selectedGame.id}
            onChange={(e) => {
              const g = games.find((item) => item.id === e.target.value);
              if (g) onSelectGame(g);
            }}
            className="text-xs font-semibold bg-white dark:bg-[#303134] text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#1a73e8]"
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} (#{g.placeId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Roblox Cluster Summary */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
            Real-Time Roblox Server Cluster
          </span>
          <button
            onClick={() => loadServersForGame(selectedGame.placeId)}
            disabled={isLoadingServers}
            className="flex items-center gap-1.5 text-xs text-[#1a73e8] dark:text-[#8ab4f8] hover:underline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingServers ? 'animate-spin' : ''}`} />
            Refresh Server Cluster
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-white dark:bg-[#282a2d] rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Live Instances
            </div>
            <div className="text-base font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-0.5">
              {servers.length}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-[#282a2d] rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Players in Sample
            </div>
            <div className="text-base font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 mt-0.5">
              {servers.reduce((acc, s) => acc + s.players, 0).toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-[#282a2d] rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Avg Server Ping
            </div>
            <div className="text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {servers.length > 0
                ? `${Math.round(servers.reduce((acc, s) => acc + s.ping, 0) / servers.length)} ms`
                : '—'}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-[#282a2d] rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Avg Server FPS
            </div>
            <div className="text-base font-bold font-mono tabular-nums text-[#1a73e8] dark:text-[#8ab4f8] mt-0.5">
              {servers.length > 0
                ? `${Math.round(servers.reduce((acc, s) => acc + s.fps, 0) / servers.length)} FPS`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Direct Job ID & Private Server Input */}
      <div className="p-4 bg-white dark:bg-[#282a2d] rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 mb-2 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
          Join Specific Server (Job ID or VIP Link)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            placeholder="Paste Roblox Job ID (e.g. f546111d-c24f-4ac6...)"
            value={inputJobId}
            onChange={(e) => setInputJobId(e.target.value)}
            className="h-9 px-3 text-xs bg-neutral-100 dark:bg-[#303134] rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:border-[#1a73e8]"
          />
          <input
            type="text"
            placeholder="Or VIP Server Share Link"
            value={inputPrivateLink}
            onChange={(e) => setInputPrivateLink(e.target.value)}
            className="h-9 px-3 text-xs bg-neutral-100 dark:bg-[#303134] rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#1a73e8]"
          />
        </div>
        <button
          onClick={() => {
            if (!inputJobId.trim() && !inputPrivateLink.trim()) return;
            onJoinCustomJobId(selectedGame, inputJobId.trim(), inputPrivateLink.trim());
          }}
          disabled={!inputJobId.trim() && !inputPrivateLink.trim()}
          className="px-4 py-2 text-xs font-semibold bg-[#1a73e8] disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-xl hover:bg-[#1557b0] transition-colors"
        >
          Connect to Instance
        </button>
      </div>

      {/* Live Server Instances List */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Live Instances for {selectedGame.name}
            </span>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              ({sortedServers.length} servers found)
            </span>
            {isLoadingServers && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a73e8]" />}
          </div>

          {/* Filter Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-[#303134] rounded-xl text-xs">
            <button
              onClick={() => setSortFilter('lowestPing')}
              className={`px-3 py-1 font-medium rounded-lg transition-all ${
                sortFilter === 'lowestPing'
                  ? 'bg-white dark:bg-[#202124] text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Lowest Ping
            </button>
            <button
              onClick={() => setSortFilter('emptiest')}
              className={`px-3 py-1 font-medium rounded-lg transition-all ${
                sortFilter === 'emptiest'
                  ? 'bg-white dark:bg-[#202124] text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Emptiest (VIP)
            </button>
            <button
              onClick={() => setSortFilter('fullest')}
              className={`px-3 py-1 font-medium rounded-lg transition-all ${
                sortFilter === 'fullest'
                  ? 'bg-white dark:bg-[#202124] text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Most Populated
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {isLoadingServers && sortedServers.length === 0 ? (
            <div className="p-8 bg-white dark:bg-[#282a2d] rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#1a73e8] mb-2" />
              <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Querying live Roblox public servers for Place #{selectedGame.placeId}...
              </div>
            </div>
          ) : sortedServers.length === 0 ? (
            <div className="p-8 bg-white dark:bg-[#282a2d] rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center text-center">
              <Server className="w-7 h-7 text-neutral-400 mb-2" />
              <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                {isLiveConnected ? 'No Active Public Servers Found' : 'Roblox Server List Temporarily Unavailable'}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-sm">
                This experience currently has no open public servers listed on games.roblox.com, or you can join directly by Job ID above.
              </p>
            </div>
          ) : (
            sortedServers.map((srv) => (
              <div
                key={srv.jobId}
                className="p-3 bg-white dark:bg-[#282a2d] rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#303134] flex items-center justify-center shrink-0">
                    <Server className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {srv.region}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400 truncate max-w-[180px]">
                        Job: {srv.jobId.slice(0, 16)}...
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      <span className="font-mono tabular-nums text-neutral-700 dark:text-neutral-300 font-semibold">
                        {srv.players} / {srv.maxPlayers} players
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{srv.fps} FPS</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-mono tabular-nums font-semibold ${
                          srv.ping < 50
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : srv.ping < 120
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-500'
                        }`}
                      >
                        {srv.ping} ms
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyJobId(srv.jobId)}
                    title="Copy Server Job ID"
                    className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 bg-neutral-100 dark:bg-[#303134] rounded-lg transition-colors"
                  >
                    {copiedJobId === srv.jobId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => onJoinServerInstance(selectedGame, srv)}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>Connect</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
