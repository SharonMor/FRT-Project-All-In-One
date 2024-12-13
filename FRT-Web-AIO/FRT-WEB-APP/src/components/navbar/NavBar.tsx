import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../auth/Authenticator';
import useUser from '../../hooks/useUser';
import './NavBar.css';
import { getUser, updateUserTelegramId, User } from '../../api/users';
import { FaHome } from "react-icons/fa";
import { useLanguage } from '../../LanguageContext';
import LanguagePicker from '../languagePicker/LanguagePicker';
import TelegramLoginButton from '../telegram/TelegramLoginButton';
import { addUserToTelegramUsers } from '../../api/telegram';

const NavBar: React.FC = () => {
  const { user: firebaseUser, isLoading } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [isTelegramUpdating, setIsTelegramUpdating] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const fetchUserDetails = useCallback(async () => {
    if (firebaseUser) {
      try {
        const userDetails = await getUser(firebaseUser.uid);
        setUser(userDetails);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    } else {
      setUser(null);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);
  
  const handleTelegramLogin = useCallback(async (telegramUser: any) => {
    if (firebaseUser && telegramUser && telegramUser.id) {
      setIsTelegramUpdating(true);
      setTelegramError(null);
      try {
        await updateUserTelegramId(firebaseUser.uid, telegramUser.id.toString());
        await addUserToTelegramUsers(firebaseUser.uid, telegramUser.id.toString());
        await fetchUserDetails(); // Refresh user details
      } catch (error) {
        console.error("Error updating Telegram ID:", error);
        setTelegramError("Failed to update Telegram ID. Please try again.");
      } finally {
        setIsTelegramUpdating(false);
      }
    }
  }, [firebaseUser, fetchUserDetails]);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setIsMenuOpen(false);
      navigate('/');
    } catch (error: any) {
      console.error("Logout failed:", error.message);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (isLoading) {
    return <div>{t['loading']}</div>;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <Link to="/" onClick={() => setIsMenuOpen(false)} className="navbar-brand"><FaHome /></Link>
          <LanguagePicker />
          {user && <Link to="/teams" onClick={() => setIsMenuOpen(false)} className="nav-link teams-button">{t['teams']}</Link>}
        </div>
        <div className={`navbar-right ${isMenuOpen ? 'active' : ''}`}>
          {user ? (
            <>
              <div className="user-info">
                {/* <span className="welcome-message">{t['welcome']},</span> */}
                <span className="user-name">{user.displayName || user.email}</span>
              </div>
              {!user.telegram_user_id && !isTelegramUpdating && (
                <>
                  <TelegramLoginButton
                    botName="firstresponseteambot"
                    onAuth={handleTelegramLogin}
                    buttonSize="medium"
                    cornerRadius={0}
                  />
                  {telegramError && <span className="telegram-error">{telegramError}</span>}
                </>
               )}
                            {isTelegramUpdating && <span className="telegram-updating">Updating Telegram...</span>}
              {user.telegram_user_id && (
                <span className="telegram-verified">{t['telegram-verified']}</span>
              )}
              <button onClick={handleLogout} className="logout-button">{t['logout']}</button>
            </>
          ) : (
            <Link to="/login" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              <button className="login-button">{t['login']}</button>
            </Link>
          )}
        </div>
        {/* <LanguagePicker /> */}
        <div className={`hamburger ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;