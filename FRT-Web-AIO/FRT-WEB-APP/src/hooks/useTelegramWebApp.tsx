// src/hooks/useTelegramWebApp.ts

import { useState, useEffect } from 'react';

interface TelegramWebApp {
  ready: () => void;
  sendData: (data: string) => void;
  close: () => void;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export const useTelegramWebApp = () => {
  const [telegramApp, setTelegramApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    script.onload = () => {
      if (window.Telegram?.WebApp) {
        const tgWebApp = window.Telegram.WebApp;
        tgWebApp.ready();
        setTelegramApp(tgWebApp);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return telegramApp;
};