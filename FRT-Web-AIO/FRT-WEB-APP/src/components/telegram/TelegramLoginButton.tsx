import React, { useEffect, useRef, useState } from 'react';

interface TelegramLoginButtonProps {
  botName: string;
  onAuth: (user: any) => void;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: 'write' | 'read';
}

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    TelegramLoginWidget: {
      dataOnauth: (user: TelegramUser) => void;
    };
  }
}

const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
  botName,
  onAuth,
  buttonSize = 'large',
  cornerRadius,
  requestAccess = 'write'
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    window.TelegramLoginWidget = {
      dataOnauth: (telegramUser: TelegramUser) => {
        setUser(telegramUser);
        onAuth(telegramUser);
      }
    };

    if (!user) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', botName);
      script.setAttribute('data-size', buttonSize);
      script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
      script.setAttribute('data-request-access', requestAccess);

      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const authUrl = isLocalhost 
        ? `http://${window.location.host}`
        : `https://${window.location.host}`;

      script.setAttribute('data-auth-url', authUrl);

      if (cornerRadius !== undefined) {
        script.setAttribute('data-radius', cornerRadius.toString());
      }
      script.async = true;

      buttonRef.current?.appendChild(script);

      return () => {
        buttonRef.current?.removeChild(script);
      };
    }
  }, [botName, onAuth, buttonSize, cornerRadius, requestAccess, user]);

  const handleLogout = () => {
    setUser(null);
    
    // Add any additional logout logic here (e.g., clearing local storage, updating server state)
  };
  
  if (user) {
    console.log('got here wow amazing');
    return (
      <div className="telegram-user-info">
        {user.photo_url && <img src={user.photo_url} alt={user.first_name} className="telegram-user-avatar" />}
        <span className="telegram-user-name">{user.first_name}</span>
        <button onClick={handleLogout} className="telegram-logout-button">Logout</button>
      </div>
    );
  }

  return <div ref={buttonRef} />;
};

export default TelegramLoginButton;