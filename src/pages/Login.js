import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { ADMIN_EMAIL } from '../data/store';
import { API_BASE_URL } from '../data/api';
import { FaEnvelope, FaLock, FaArrowRight, FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa';
import './Login.css';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const teaEstateImage = `${process.env.PUBLIC_URL}/shopping/nilgiri-tea-estate.webp`;
const isAndroidWebView = typeof window !== 'undefined' &&
  (/;\s*wv\)/i.test(window.navigator.userAgent) || Boolean(window.androidBridge));
const useNativeGoogleSignIn = Capacitor.getPlatform() === 'android' || isAndroidWebView;
const isLocalDevelopmentOrigin = typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const parseResponseJson = async (response) => {
  const text = await response.text();
  if (!text || !text.trim()) return {};
  try { return JSON.parse(text); }
  catch (err) { return { message: text.startsWith('<') ? `Server returned HTTP status ${response.status}.` : text }; }
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const isAdminEmail = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const finishLogin = (data) => {
    login(data.user.email, data.user.role, data.token, data.user.verified);
    navigate(data.user.role === 'admin' ? '/admin-dashboard' : '/');
  };

  useEffect(() => {
    if (!useNativeGoogleSignIn) return undefined;
    let h;
    App.addListener('appUrlOpen', async (event) => {
      const url = event?.url || '';
      if (!url.startsWith('com.nilgiri.smarttourism://auth')) return;
      try {
        const params = new URL(url.replace('com.nilgiri.smarttourism://auth', 'https://placeholder/auth')).searchParams;
        const ticket = params.get('ticket');
        if (!ticket) throw new Error('No ticket received.');
        const res = await fetch(`${API_BASE_URL}/api/auth/google/mobile/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket }), signal: AbortSignal.timeout(15000) });
        const data = await parseResponseJson(res);
        if (!res.ok) throw new Error(data.message || 'Google exchange failed.');
        finishLogin(data);
      } catch (e) { setError(e.message || 'Google sign-in failed.'); }
    }).then((handle) => { h = handle; });
    return () => { h?.remove?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestOtp = async (normalizedEmail) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
      signal: AbortSignal.timeout(20000)
    });
    const data = await parseResponseJson(response);
    if (!response.ok) throw new Error(data.message || 'Could not send a sign-in code.');
    setOtpSent(true);
    setOtp('');
    setInfo(data.message || 'A sign-in code was sent to your email.');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (isAdminEmail && !password) {
      setError('Please enter the administrator password.');
      return;
    }
    if (!isAdminEmail && otpSent && !/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    try {
      if (!isAdminEmail && !otpSent) {
        await requestOtp(normalizedEmail);
        return;
      }
      const res = isAdminEmail
        ? await fetch(`${API_BASE_URL}/api/auth/admin-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password }),
          signal: AbortSignal.timeout(15000)
        })
        : await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, otp: otp.trim() }),
          signal: AbortSignal.timeout(15000)
        });
      const data = await parseResponseJson(res);
      if (!res.ok) throw new Error(data.message || (isAdminEmail ? 'Administrator sign-in failed.' : 'That code could not be verified.'));
      finishLogin(data);
    } catch (err) {
      setError(err.name === 'TimeoutError' || err.name === 'AbortError'
        ? 'The sign-in service timed out. Check your connection and try again.'
        : err.message || 'Sign-in failed.');
    }
    finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      await requestOtp(email.trim().toLowerCase());
    } catch (err) {
      setError(err.name === 'TimeoutError' || err.name === 'AbortError'
        ? 'The sign-in service timed out. Try again shortly.'
        : err.message || 'Could not resend the code.');
    }
    finally { setLoading(false); }
  };

  const handleGoogleSuccess = async ({ credential }) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }), signal: AbortSignal.timeout(15000) });
      const data = await parseResponseJson(res);
      if (!res.ok) throw new Error(data.message || 'Google sign-in failed.');
      finishLogin(data);
    } catch (err) { setError(err.message || 'Google sign-in failed.'); }
    finally { setLoading(false); }
  };

  const handleBrowserGoogleSignIn = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google/mobile/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await parseResponseJson(res);
      if (!res.ok) throw new Error(data.message || 'Could not start Google sign-in.');
      if (!data.authorizationUrl?.startsWith('https://accounts.google.com/')) throw new Error('Invalid Google sign-in URL.');
      await Browser.open({ url: data.authorizationUrl });
    } catch (err) { setError(err.message || 'Could not open Google sign-in.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-container">
      <motion.div className="login-background" style={{ backgroundImage: `url("${teaEstateImage}")` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
        <div className="gradient-overlay"></div>
      </motion.div>

      <motion.div className="login-card" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <div className="login-header">
          <motion.div className="logo-icon image-logo-icon" animate={{ rotate: [0, 2, -2, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
            <img src={`${process.env.PUBLIC_URL}/nilgiris-logo.png`} alt="The Nilgiris Tourism logo" />
          </motion.div>
          <h1 className="login-title">The Nilgiris Tourism</h1>
          <p className="login-subtitle">AR Based Heritage</p>
        </div>

        <div className="login-form">
          <AnimatePresence mode="wait">
            <motion.form key="sign-in" onSubmit={handleLogin} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div className="input-group">
                <FaEnvelope className="input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setOtp('');
                    setOtpSent(false);
                    setPassword('');
                    setError('');
                    setInfo('');
                  }}
                  disabled={otpSent && !isAdminEmail}
                  required
                  autoComplete="email"
                  className="login-input"
                />
              </div>

              {isAdminEmail ? (
                <div className="input-group">
                  <FaLock className="input-icon" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter administrator password"
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); setError(''); }}
                    required
                    autoComplete="current-password"
                    className="login-input"
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              ) : otpSent ? (
                <>
                  <div className="input-group">
                    <FaLock className="input-icon" />
                    <input
                      id="auth-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="6-digit email code"
                      value={otp}
                      onChange={(event) => { setOtp(event.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                      required
                      className="login-input"
                    />
                  </div>
                  <p className="otp-message" role="status">{info || 'Enter the 6-digit code sent to your email. It expires in 5 minutes.'}</p>
                </>
              ) : (
                <p className="otp-message">We’ll email you a one-time sign-in code. No account password is needed.</p>
              )}

              {error && <div className="error-message" role="alert">{error}</div>}
              {info && !otpSent && <div className="otp-message" role="status">{info}</div>}

              <motion.button id="auth-submit-btn" type="submit" className="login-button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading}>
                {loading
                  ? (isAdminEmail ? 'Signing in…' : otpSent ? 'Verifying code…' : 'Sending code…')
                  : isAdminEmail ? 'Admin Sign In' : otpSent ? 'Verify code' : 'Send sign-in code'} <FaArrowRight />
              </motion.button>

              {otpSent && !isAdminEmail && (
                <div className="otp-actions">
                  <button type="button" className="back-button" onClick={handleResendOtp} disabled={loading}>Resend code</button>
                  <button type="button" className="back-button" onClick={() => { setOtpSent(false); setOtp(''); setInfo(''); setError(''); }} disabled={loading}>Use a different email</button>
                </div>
              )}
            </motion.form>
          </AnimatePresence>

          <div className="google-login-option">
            <div className="login-divider"><span>or</span></div>
            {useNativeGoogleSignIn ? (
              <button type="button" id="google-native-btn" className="native-google-login" onClick={handleBrowserGoogleSignIn} disabled={loading}><FaGoogle /> {loading ? 'Opening Google…' : 'Continue with Google'}</button>
            ) : googleClientId ? (
              <>
                <GoogleOAuthProvider clientId={googleClientId}>
                  <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError(`Google sign-in blocked for ${window.location.origin}.`)} text="continue_with" shape="rectangular" size="large" width="280" useOneTap={false} />
                </GoogleOAuthProvider>
                {isLocalDevelopmentOrigin && <p className="google-origin-note" role="note">Using <strong>{window.location.origin}</strong>. <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Open OAuth credentials</a></p>}
              </>
            ) : <p className="google-login-unavailable">Google sign-in is not configured.</p>}
          </div>
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
