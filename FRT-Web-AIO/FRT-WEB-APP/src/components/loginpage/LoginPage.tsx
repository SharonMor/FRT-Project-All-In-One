import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, signUp } from '../../auth/Authenticator';
import './LoginPage.css';
import { useLanguage } from '../../LanguageContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const rtlStyle: React.CSSProperties = isRTL ? { direction: 'rtl' } : {};

  useEffect(() => {
    const emailInput = document.getElementById('email-input');
    if (emailInput) emailInput.focus();
  }, []);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLogin) {
      await handleLogin();
    } else {
      await handleSignUp();
    }
  };

  const handleLogin = async () => {
    try {
      const user = await login(email, password);
      if (user) {
        setMessage(t["login-successful"]);
        navigate('/');
      }
    } catch (error: any) {
      setMessage(`${t["login-failed"]}${error.message}`);
    }
  };

  const handleSignUp = async () => {
    try {
      const result = await signUp(email, password, displayName);
      if (result.status) {
        setMessage(t["registration-successful"]);
        navigate('/');
      } else {
        setMessage(`${t["registration-failed"]}${result.message}`);
      }
    } catch (error: any) {
      setMessage(`${t["registration-failed"]}${error.message}`);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>{isLogin ? t["login"] : t["sign-up"]}</h1>
        <form onSubmit={handleSubmit}>
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t["email"]}
            aria-label={t["email"]}
            style={rtlStyle}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t["password"]}
            aria-label={t["password"]}
            style={rtlStyle}

          />
          {!isLogin && (
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={t["display-name"]}
              aria-label={t["display-name"]}
              style={rtlStyle}

            />
          )}
          <button type="submit" className="primary-button">{isLogin ? t["login"] : t["sign-up"]}</button>
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="secondary-button">
            {isLogin ? t["switch-to-sign-up"] : t["switch-to-login"]}
          </button>
          {isLogin && (
            <Link to="/forgot-password" className="forgot-password-link" style={rtlStyle}
            >
              {t["forgot-password"]}
            </Link>
          )}
        </form>
        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
};

export default LoginPage;