declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready(): void;
        expand(): void;
        close(): void;
        openTelegramLink?(url: string): void;
        HapticFeedback?: { impactOccurred(style: 'light' | 'medium' | 'heavy'): void };
        initDataUnsafe?: { start_param?: string; user?: { first_name?: string } };
        colorScheme?: 'light' | 'dark';
        setHeaderColor?(color: string): void;
        setBackgroundColor?(color: string): void;
      };
    };
  }
}

export function initTelegram(): void {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;
  webApp.ready();
  webApp.expand();
  webApp.setHeaderColor?.('#090909');
  webApp.setBackgroundColor?.('#090909');
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  window.Telegram?.WebApp.HapticFeedback?.impactOccurred(style);
}

export function openTelegramUrl(url: string): void {
  const webApp = window.Telegram?.WebApp;
  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
