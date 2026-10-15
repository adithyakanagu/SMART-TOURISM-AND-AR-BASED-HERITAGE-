import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { motion } from 'framer-motion';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { ADMIN_EMAIL } from '../data/store';
import { FaEnvelope, FaLock, FaArrowRight, FaGoogle } from 'react-icons/fa';
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
  try {
    return JSON.parse(text);
  } catch (err) {
    return { message: text.startsWith('<') ? `Server returned HTTP status ${response.status}.` : text };
  }
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
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

  const signInAsGuest = async (normalizedEmail) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
      signal: AbortSignal.timeout(15000)
    });
    const data = await parseResponseJson(response);
    if (!response.ok) throw new Error(data.message || 'Unable to continue with this email.');
    finishLogin(data);
  };

  const requestOtp = async (normalizedEmail) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
      signal: AbortSignal.timeout(20000)
    });
    const data = await parseResponseJson(response);
    if (response.status === 503) {
      await signInAsGuest(normalizedEmail);
      return;
    }
    if (!response.ok) throw new Error(data.message || 'Could not send a sign-in code.');
    setOtpSent(true);
    setOtp('');
    setInfo(data.message || 'A sign-in code was sent to your email.');
  };

  useEffect(() => {
    if (!useNativeGoogleSignIn) return undefined;

    let active = true;
    let appUrlListener;
    const handleAppUrl = async (url) => {
      let callbackUrl;
      try {
        callbackUrl = new URL(url);
      } catch {
        return;
      }

      if (callbackUrl.protocol !== 'com.nilgiri.smarttourism:' || callbackUrl.hostname !== 'auth') return;

      if (callbackUrl.searchParams.has('error')) {
        setError('Google sign-in was canceled or failed. Please try again.');
        setLoading(false);
        return;
      }

      const ticket = callbackUrl.searchParams.get('ticket');
      if (!ticket) {
        setError('Google sign-in could not be completed. Please try again.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/google/mobile/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket })
        });
        const data = await parseResponseJson(response);
        if (!response.ok) throw new Error(data.message || 'Google sign-in could not be completed.');

        if (!active) return;
        login(data.user.email, data.user.role, data.token);
        navigate(data.user.role === 'admin' ? '/admin-dashboard' : '/');
      } catch (requestError) {
        if (active) setError(requestError.message || 'Google sign-in could not be completed. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };

    App.addListener('appUrlOpen', ({ url }) => {
      void handleAppUrl(url);
    }).then((listener) => {
      if (active) appUrlListener = listener;
      else void listener.remove();
    }).catch((listenerError) => {
      console.error('Could not listen for Google sign-in callback:', listenerError);
      if (active) setError('Could not finish browser sign-in. Please reopen the app and try again.');
    });

    App.getLaunchUrl().then((launch) => {
      if (active && launch?.url) return handleAppUrl(launch.url);
      return undefined;
    }).catch((launchError) => {
      console.error('Could not read Google sign-in callback:', launchError);
      if (active) setError('Could not finish browser sign-in. Please reopen the app and try again.');
    });

    return () => {
      active = false;
      if (appUrlListener) void appUrlListener.remove();
    };
  }, [login, navigate]);

  const handleContinueWithEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (isAdminEmail) {
        const response = await fetch(`${API_BASE_URL}/api/auth/admin-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password }),
          signal: AbortSignal.timeout(15000)
        });
        const data = await parseResponseJson(response);
        if (!response.ok) throw new Error(data.message || 'Unable to continue with this email.');
        finishLogin(data);
      } else if (otpSent) {
        if (!/^\d{6}$/.test(otp.trim())) {
          throw new Error('Enter the 6-digit code from your email.');
        }
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, otp: otp.trim() }),
          signal: AbortSignal.timeout(15000)
        });
        const data = await parseResponseJson(response);
        if (!response.ok) throw new Error(data.message || 'That code could not be verified.');
        finishLogin(data);
      } else {
        await requestOtp(normalizedEmail);
      }
    } catch (requestError) {
      const message = requestError.name === 'TimeoutError' || requestError.name === 'AbortError'
        ? 'The sign-in service timed out. Please try again later.'
        : requestError.message;
      setError(message || 'Could not continue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      await requestOtp(email.trim().toLowerCase());
    } catch (requestError) {
      setError(requestError.message || 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  const completeGoogleSignIn = async (credential) => {
    if (!credential) {
      throw new Error('Google did not return a sign-in credential. Please try again.');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    const data = await parseResponseJson(response);
    if (!response.ok) throw new Error(data.message || 'Google sign-in failed.');

    login(data.user.email, data.user.role, data.token);
    navigate(data.user.role === 'admin' ? '/admin-dashboard' : '/');
  };

  const handleGoogleSuccess = async ({ credential }) => {
    setLoading(true);
    setError('');
    try {
      await completeGoogleSignIn(credential);
    } catch (requestError) {
      setError(requestError.message || 'Google sign-in failed. Please try email OTP instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleBrowserGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google/mobile/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.message || 'Could not start Google browser sign-in.');
      if (!data.authorizationUrl || !data.authorizationUrl.startsWith('https://accounts.google.com/')) {
        throw new Error('The server returned an invalid Google sign-in address.');
      }
      await Browser.open({ url: data.authorizationUrl });
    } catch (requestError) {
      setError(requestError.message || 'Could not open Google sign-in. Please try email OTP instead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <motion.div
        className="login-background"
        style={{ backgroundImage: `url("${teaEstateImage}")` }}
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
            <img src="/nilgiris-logo.png" alt="The Nilgiris Tourism logo" />
          </motion.div>
          <h1 className="login-title">The Nilgiris Tourism</h1>
          <p className="login-subtitle">AR Based Heritage</p>
        </div>

        <div className="login-form">
          <motion.form
            onSubmit={handleContinueWithEmail}
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setPassword('');
                  setOtp('');
                  setOtpSent(false);
                  setInfo('');
                }}
                disabled={otpSent}
                required
                className="login-input"
              />
            </div>

            {isAdminEmail ? (
              <>
                <div className="input-group">
                  <FaLock className="input-icon" />
                  <input
                    type="password"
                    placeholder="Admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    minLength={12}
                    required
                    className="login-input"
                  />
                </div>
                <p className="otp-message">Admin access requires the password configured privately in Railway.</p>
              </>
            ) : otpSent ? (
              <>
                <div className="input-group">
                  <FaLock className="input-icon" />
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="6-digit email code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    className="login-input"
                  />
                </div>
                <p className="otp-message">{info || 'Enter the 6-digit code sent to your email. It expires in 5 minutes.'}</p>
              </>
            ) : (
              <p className="otp-message">
                We will email a one-time sign-in code. Do not share this code with anyone.
              </p>
            )}

            {error && <div className="error-message">{error}</div>}

            <motion.button
              type="submit"
              className="login-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
            >
              {loading
                ? (otpSent ? 'Verifying…' : 'Sending code…')
                : isAdminEmail
                  ? 'Admin Sign In'
                  : otpSent
                    ? 'Verify code'
                    : 'Send sign-in code'} <FaArrowRight />
            </motion.button>
            {otpSent && !isAdminEmail && (
              <div className="otp-actions">
                <button type="button" className="back-button" onClick={handleResendOtp} disabled={loading}>
                  Resend code
                </button>
                <button
                  type="button"
                  className="back-button"
                  onClick={() => { setOtpSent(false); setOtp(''); setInfo(''); setError(''); }}
                  disabled={loading}
                >
                  Use a different email
                </button>
              </div>
            )}
          </motion.form>

          <div className="google-login-option">
            <div className="login-divider"><span>or</span></div>
            {useNativeGoogleSignIn ? (
              <button
                type="button"
                className="native-google-login"
                onClick={handleBrowserGoogleSignIn}
                disabled={loading}
              >
                <FaGoogle /> {loading ? 'Opening Google…' : 'Continue with Google'}
              </button>
            ) : googleClientId ? (
              <>
                <GoogleOAuthProvider clientId={googleClientId}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError(`Google sign-in is blocked for ${window.location.origin}. Add this origin to the OAuth client's Authorized JavaScript origins in Google Cloud Console.`)}
                    text="continue_with"
                    shape="rectangular"
                    size="large"
                    width="280"
                    useOneTap={false}
                  />
                </GoogleOAuthProvider>
                {isLocalDevelopmentOrigin && (
                  <p className="google-origin-note" role="note">
                    Google sign-in uses <strong>{window.location.origin}</strong>. If Google reports an origin mismatch, confirm this exact origin is authorized on the same Web OAuth client configured for the app.
                    {' '}<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Open OAuth credentials</a>
                  </p>
                )}
              </>
            ) : (
              <p className="google-login-unavailable">Google sign-in is not configured. Continue with email above.</p>
            )}
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
