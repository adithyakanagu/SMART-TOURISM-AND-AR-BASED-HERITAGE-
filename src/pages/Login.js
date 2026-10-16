import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { ADMIN_EMAIL } from '../data/store';
import { FaEnvelope, FaLock, FaArrowRight, FaGoogle, FaEye, FaEyeSlash, FaUserPlus, FaSignInAlt } from 'react-icons/fa';
import './Login.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' && window.location.protocol.startsWith('http') ? '' : 'http://localhost:5000');
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
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const isAdminEmail = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const switchMode = (m) => { setMode(m); setError(''); setPassword(''); setConfirmPassword(''); };

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

  const handleLogin = async (e) => {
    e.preventDefault(); setError('');
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }), signal: AbortSignal.timeout(15000) });
      const data = await parseResponseJson(res);
      if (!res.ok) throw new Error(data.message || 'Login failed. Please check your credentials.');
      finishLogin(data);
    } catch (err) { setError(err.message || 'Login failed.'); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError('');
    if (isAdminEmail) { setError('This email cannot be registered.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }), signal: AbortSignal.timeout(15000) });
      const data = await parseResponseJson(res);
      if (!res.ok) throw new Error(data.message || 'Registration failed.');
      finishLogin(data);
    } catch (err) { setError(err.message || 'Registration failed.'); }
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
            <img src="/nilgiris-logo.png" alt="The Nilgiris Tourism logo" />
          </motion.div>
          <h1 className="login-title">The Nilgiris Tourism</h1>
          <p className="login-subtitle">AR Based Heritage</p>
        </div>

        <div className="auth-tabs">
          <button id="tab-login" className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')} type="button"><FaSignInAlt /> Sign In</button>
          <button id="tab-register" className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')} type="button"><FaUserPlus /> Create Account</button>
        </div>

        <div className="login-form">
          <AnimatePresence mode="wait">
            <motion.form key={mode} onSubmit={mode === 'login' ? handleLogin : handleRegister} initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div className="input-group">
                <FaEnvelope className="input-icon" />
                <input id="auth-email" type="email" placeholder="Enter your email address" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} required autoComplete="email" className="login-input" />
              </div>

              {mode === 'login' && isAdminEmail && <p className="otp-message">Admin account — enter your private admin password.</p>}

              <div className="input-group">
                <FaLock className="input-icon" />
                <input id="auth-password" type={showPassword ? 'text' : 'password'} placeholder={mode === 'login' ? 'Enter your password' : 'Create a password (min 6 chars)'} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} required minLength={mode === 'register' ? 6 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="login-input" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <FaEyeSlash /> : <FaEye />}</button>
              </div>

              {mode === 'register' && (
                <div className="input-group">
                  <FaLock className="input-icon" />
                  <input id="auth-confirm-password" type={showPassword ? 'text' : 'password'} placeholder="Confirm your password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }} required autoComplete="new-password" className="login-input" />
                </div>
              )}

              {error && <div className="error-message" role="alert">{error}</div>}

              <motion.button id="auth-submit-btn" type="submit" className="login-button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading}>
                {loading ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : mode === 'login' ? (isAdminEmail ? 'Admin Sign In' : 'Sign In') : 'Create Account'} <FaArrowRight />
              </motion.button>

              <p className="switch-mode-hint">
                {mode === 'login' ? <>New here? <button type="button" className="link-button" onClick={() => switchMode('register')}>Create a free account</button></> : <>Already have an account? <button type="button" className="link-button" onClick={() => switchMode('login')}>Sign in</button></>}
              </p>
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
