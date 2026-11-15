import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500 text-neutral-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 border-b border-amber-600/30"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline mode — Moon Client is running from local Windows cache. Live Roblox feeds require internet access.</span>
    </div>
  );
};
