import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '../../auth/Authenticator';
import './ForgotPassword.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const result = await resetPassword(email);
      setMessage(result.message || '');
      setIsSuccess(result.status);
    } catch (error: any) {
      setMessage(`Password reset failed: ${error.message}`);
      setIsSuccess(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <h2>Forgot Password</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
          <button type="submit">Reset Password</button>
        </form>
        {message && <div className={`message ${isSuccess ? 'success' : 'error'}`}>{message}</div>}
        <Link to="/login" className="back-to-login">Back to Login</Link>
      </div>
    </div>
  );
};

export default ForgotPassword;