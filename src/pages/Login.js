import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL } from '../data/store';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaArrowRight } from 'react-icons/fa';
import './Login.css';

const FIXED_OTP = '123456';

function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSendOTP = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    alert(`OTP sent to ${email}. Use: ${FIXED_OTP}`);
    setStep(2);
    setLoading(false);
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const isAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();

    if (otp === FIXED_OTP) {
      login(normalizedEmail, isAdmin ? 'admin' : 'user');
      navigate(isAdmin ? '/admin-dashboard' : '/');
    } else {
      setError('Invalid OTP. Please use 123456');
      setLoading(false);
    }
  };

  const quickLogin = (targetEmail, targetRole) => {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    setEmail(normalizedEmail);
    setOtp(FIXED_OTP);
    setStep(2);
    login(normalizedEmail, targetRole);
    navigate(targetRole === 'admin' ? '/admin-dashboard' : '/');
  };

  return (
    <div className="login-container">
      <motion.div
        className="login-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="gradient-overlay"></div>
      </motion.div>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="login-header">
          <motion.div
            className="logo-icon image-logo-icon"
            animate={{ rotate: [0, 2, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <img src="/nilgiris-logo.png" alt="Nilgiri Smart Tourism logo" />
          </motion.div>
          <h1 className="login-title">Nilgiri Smart Tourism</h1>
          <p className="login-subtitle">AR Based Heritage</p>
        </div>

        <div className="login-form">
          {step === 1 ? (
            <motion.form
              onSubmit={handleSendOTP}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="input-group">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  placeholder="Enter your email ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="login-input"
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="demo-login-row">
                <button type="button" className="demo-login-btn user-demo" onClick={() => quickLogin('user@example.com', 'user')}>
                  Quick User Login
                </button>
                <button type="button" className="demo-login-btn admin-demo" onClick={() => quickLogin(ADMIN_EMAIL, 'admin')}>
                  Quick Admin Login
                </button>
              </div>

              <motion.button
                type="submit"
                className="login-button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'} <FaArrowRight />
              </motion.button>
            </motion.form>
          ) : (
            <motion.form
              onSubmit={handleVerifyOTP}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <p className="otp-message">OTP sent to <strong>{email}</strong></p>

              <div className="input-group">
                <FaLock className="input-icon" />
                <input
                  type="text"
                  placeholder="Enter OTP (123456)"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="login-input"
                  maxLength="6"
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="otp-note">Demo OTP: <strong>123456</strong></div>

              <motion.button
                type="submit"
                className="login-button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify & Login'} <FaArrowRight />
              </motion.button>

              <button
                type="button"
                className="back-button"
                onClick={() => {
                  setStep(1);
                  setError('');
                  setOtp('');
                }}
              >
                ← Back to Email
              </button>
            </motion.form>
          )}
        </div>

        <div className="login-footer">
          <p>Adithya Kanagu · Bannari Amman Institute Of Technology</p>
          <p>Copyright © 2026 · adithya01022007@gmail.com</p>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
