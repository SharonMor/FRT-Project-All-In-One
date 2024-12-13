
import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './components/homePage/HomePage';
import LoginPage from './components/loginPage/LoginPage';
import NavBar from './components/navbar/NavBar';
import './App.css'
import TeamsPage from './components/teamsPage/TeamsPage';
import { LanguageProvider } from './LanguageContext';
import TelegramLoginMiniApp from './components/telegram/TelegramLoginMiniApp';
import ForgotPassword from './components/forgotPassword/ForgotPassword';
import ProtectedRoute from './ProtectedRoute';
import NotFoundPage from './components/notFoundPage/NotFoundPage';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isTelegramLogin = location.pathname === '/telegram-login';

  return (
    <div className="app-container">
      {!isTelegramLogin && <NavBar />}
      <div className={`page-container ${isTelegramLogin ? 'full-height' : ''}`}>
        <Routes>
          <Route element={<ProtectedRoute authenticationRequired={false} redirectPath="/" />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>
          <Route path="/telegram-login" element={<TelegramLoginMiniApp />} />
          <Route path="/" element={<HomePage />} />
          <Route element={<ProtectedRoute authenticationRequired={true} redirectPath="/login" />}>
            <Route path="/teams" element={<TeamsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
