/**
 * Official Roblox client launch protocol & command-line utilities
 */

export type ProtocolMode = 'modern' | 'classic' | 'windows-player' | 'web';

export function buildRobloxProtocolUri(
  placeId: string,
  jobId?: string,
  privateServerLink?: string,
  mode: ProtocolMode = 'modern'
): string {
  const cleanPlaceId = placeId.trim();

  // Mode 1: Official Windows Player scheme (roblox-player:1+launchmode:play+...)
  if (mode === 'windows-player') {
    const launcherUrl = encodeURIComponent(
      `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGame&placeId=${cleanPlaceId}${
        jobId ? `&gameId=${jobId.trim()}` : ''
      }`
    );
    return `roblox-player:1+launchmode:play+gameinfo:TOKEN+launchtime:${Date.now()}+placelauncherurl:${launcherUrl}`;
  }

  // Mode 2: Classic URI scheme (roblox://placeId=...)
  if (mode === 'classic') {
    let uri = `roblox://placeId=${cleanPlaceId}`;
    if (jobId && jobId.trim()) uri += `&gameInstanceId=${jobId.trim()}`;
    if (privateServerLink && privateServerLink.trim()) uri += `&linkCode=${encodeURIComponent(privateServerLink.trim())}`;
    return uri;
  }

  // Mode 3: Official Web Portal Direct Start
  if (mode === 'web') {
    return `https://www.roblox.com/games/start?placeId=${cleanPlaceId}`;
  }

  // Default Mode 4: Modern Unified Scheme (roblox://experiences/start?placeId=...)
  if (privateServerLink && privateServerLink.trim()) {
    return `roblox://experiences/start?placeId=${cleanPlaceId}&linkCode=${encodeURIComponent(privateServerLink.trim())}`;
  }
  if (jobId && jobId.trim()) {
    return `roblox://experiences/start?placeId=${cleanPlaceId}&gameInstanceId=${jobId.trim()}`;
  }
  return `roblox://experiences/start?placeId=${cleanPlaceId}`;
}

/**
 * Dispatches the Roblox launch protocol directly to the OS client
 */
export function dispatchRobloxProtocol(uri: string): boolean {
  try {
    // 1. Create a transient invisible link element with user click event
    const anchor = document.createElement('a');
    anchor.href = uri;
    anchor.style.display = 'none';
    anchor.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 1000);
    return true;
  } catch (err) {
    console.warn('Direct protocol anchor dispatch failed, falling back to window.location:', err);
    try {
      window.location.href = uri;
      return true;
    } catch {
      return false;
    }
  }
}

export function buildCommandLineLaunch(placeId: string, jobId?: string): string {
  const base = `"RobloxPlayerBeta.exe" --app -t "PLACE_LAUNCH_TOKEN" -j "https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGame&placeId=${placeId.trim()}`;
  if (jobId && jobId.trim()) {
    return `${base}&gameId=${jobId.trim()}"`;
  }
  return `${base}"`;
}

