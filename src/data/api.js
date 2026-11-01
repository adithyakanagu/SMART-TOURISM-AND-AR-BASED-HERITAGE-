import { Capacitor } from '@capacitor/core';

const PRODUCTION_API_URL = 'https://nilgiris-tourism-app-production-35e8.up.railway.app';
const configuredApiUrl = process.env.REACT_APP_API_URL;
const hostname = typeof window === 'undefined' ? '' : window.location.hostname;
const currentOrigin = typeof window === 'undefined' ? '' : window.location.origin;
const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(hostname);
const isGitHubPages = hostname.endsWith('.github.io');

export const API_BASE_URL = configuredApiUrl || (
  Capacitor.isNativePlatform() || isGitHubPages
    ? PRODUCTION_API_URL
    : isLocalDevelopment
      ? ''
      : currentOrigin
);
