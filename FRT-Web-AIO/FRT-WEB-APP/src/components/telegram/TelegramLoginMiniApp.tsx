import React, { useState, useCallback, useEffect } from 'react';
import { login, signUp, resetPassword } from '../../auth/Authenticator';
import { useTelegramWebApp } from '../../hooks/useTelegramWebApp';
import { updateUserTelegramId } from '../../api/users';
import { addUserToTelegramUsers, getTelegramUser } from '../../api/telegram';
import { User } from "firebase/auth";
import { auth } from '../../auth/FireBaseAuth';
import { updateUserDisplayName } from "../../api/users";
import './telegramLoginMiniApp.css';

const TelegramLoginMiniApp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>('');
  const [isTelegramUpdating, setIsTelegramUpdating] = useState(false);
  const [showDisplayNamePrompt, setShowDisplayNamePrompt] = useState(false);
  const telegramApp = useTelegramWebApp();
  const telegramId = telegramApp?.initDataUnsafe?.user?.id;

  useEffect(() => {
    const checkIfAlreadyAssociated = async () => {
      if (telegramId) {
        try {
          const associatedUser = await getTelegramUser(telegramId?.toString());
          if (associatedUser.user_id) {
            setMessage('Telegram account already linked!');
            setMessageType('success');
            setTimeout(() => {
              telegramApp?.close();
            }, 1500);
          }
        } catch (error) {
          console.error("Error checking Telegram association:", error);
        }
      }
    }
    checkIfAlreadyAssociated();
  }, [telegramId, telegramApp]);

  const handleTelegramAssociation = useCallback(async (userId: string, telegramId: string) => {
    setIsTelegramUpdating(true);
    try {
      await updateUserTelegramId(userId, telegramId);
      await addUserToTelegramUsers(userId, telegramId);
      setMessage('Telegram account successfully linked!');
      setMessageType('success');
    } catch (error) {
      console.error("Error updating Telegram ID:", error);
      setMessage(`Failed to link Telegram account. Please try again. userId: ${userId} telegramId: ${telegramId}`);
      setMessageType('error');
    } finally {
      setIsTelegramUpdating(false);
    }
  }, []);

  const handleSuccessfulLogin = useCallback(async (user: User) => {
    if (user) {
      if (telegramId) {
        await handleTelegramAssociation(user.uid, telegramId.toString());
      }
      telegramApp?.sendData(JSON.stringify({ success: true, userId: user.uid }));
      setMessage('Login successful! Closing this window...');
      setMessageType('success');
      setTimeout(() => {
        telegramApp?.close();
      }, 1500);
    }
  }, [telegramId, telegramApp, handleTelegramAssociation]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (isForgotPassword) {
        await handleForgotPassword();
      } else {
        let authResult;
        if (isLogin) {
            authResult = await login(email, password);
        } else {
            const signUpResult = await signUp(email, password, displayName);
            authResult = signUpResult.userCredential;
        }
        if (authResult) {
          await handleSuccessfulLogin(authResult.user as User);
        }
      }
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
      setMessageType('error');
    }
  };

  const handleForgotPassword = async () => {
    try {
      await resetPassword(email);
      setMessage('Password reset email sent. Please check your inbox.');
      setMessageType('success');
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
      setMessageType('error');
    }
  };

  const handleDisplayNameSubmit = async () => {
    if (displayName) {
      const user = auth.currentUser;
      if (user) {
        await updateUserDisplayName(user.uid, displayName);
        setShowDisplayNamePrompt(false);
        await handleSuccessfulLogin(user);
      }
    }
  };

  if (showDisplayNamePrompt) {
    return (
      <div className="telegram-login-mini-app">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your display name"
        />
        <button onClick={handleDisplayNameSubmit}>Submit</button>
      </div>
    );
  }

  return (
    <div className="telegram-login-mini-app">
      <h1>{isForgotPassword ? 'Reset Password' : (isLogin ? 'Login' : 'Sign Up')}</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        {!isForgotPassword && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
        )}
        {!isLogin && !isForgotPassword && (
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display Name"
            required
          />
        )}
        <button type="submit" disabled={isTelegramUpdating}>
          {isTelegramUpdating ? 'Updating...' : (isForgotPassword ? 'Reset Password' : (isLogin ? 'Login' : 'Sign Up'))}
        </button>
      </form>
      {!isForgotPassword && (
        <button 
          className="switch-mode" 
          onClick={() => setIsLogin(!isLogin)}
          disabled={isTelegramUpdating}
        >
          {isLogin ? 'Switch to Sign Up' : 'Switch to Login'}
        </button>
      )}
      {isLogin && !isForgotPassword && (
        <button 
          className="forgot-password" 
          onClick={() => setIsForgotPassword(true)}
          disabled={isTelegramUpdating}
        >
          Forgot Password?
        </button>
      )}
      {isForgotPassword && (
        <button 
          className="back-to-login" 
          onClick={() => setIsForgotPassword(false)}
          disabled={isTelegramUpdating}
        >
          Back to Login
        </button>
      )}
      {message && <div className={`message ${messageType}`}>{message}</div>}
    </div>
  );
};

export default TelegramLoginMiniApp;