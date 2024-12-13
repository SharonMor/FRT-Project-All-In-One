import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Home, Mail } from 'lucide-react';
import './NotFoundPage.css';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <AlertCircle size={64} className="alert-icon" />
        <h1>404 - Page Not Found</h1>
        <p className="main-message">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="info-box">
          <p>
            If you believe this is an error, please contact your system administrator
            or the IT support team for assistance.
          </p>
        </div>
        <div className="action-buttons">
          <button onClick={() => navigate('/')} className="home-button">
            <Home size={20} />
            Return to Home
          </button>
          <button onClick={() => window.location.href = 'mailto:teamfrtproject@gmail.com'} className="contact-button">
            <Mail size={20} />
            Contact Support
          </button>
        </div>
      </div>
      <div className="footer-message">
        <p>For immediate assistance, please refer to your organization's IT support guidelines.</p>
      </div>
    </div>
  );
};

export default NotFoundPage;