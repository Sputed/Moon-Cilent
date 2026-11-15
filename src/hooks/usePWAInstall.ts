import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  const isWindows =
    typeof navigator !== 'undefined' &&
    /Win/i.test(navigator.platform || navigator.userAgent);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isWcoMedia = window.matchMedia('(display-mode: window-controls-overlay)').matches;
      const isIOSStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandaloneMedia || isWcoMedia || isIOSStandalone);
    };

    checkStandalone();

    const mql = window.matchMedia('(display-mode: standalone)');
    const wcoMql = window.matchMedia('(display-mode: window-controls-overlay)');
    mql.addEventListener?.('change', checkStandalone);
    wcoMql.addEventListener?.('change', checkStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mql.removeEventListener?.('change', checkStandalone);
      wcoMql.removeEventListener?.('change', checkStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isWindows,
    install,
  };
}
