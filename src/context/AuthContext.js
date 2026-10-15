import React, { createContext, useContext, useState, useEffect } from 'react';
import { ADMIN_EMAIL, loadAppData, notifyAppDataUpdated, refreshAppDataFromServer } from '../data/store';

const AuthContext = createContext(null);
const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' && window.location.protocol.startsWith('http') ? '' : 'http://localhost:5000');
const sharedDataCollections = ['products', 'hotels', 'taxis', 'tourismSpots', 'businesses'];

const hasRecords = (data) => Object.values(data || {}).some((records) => Array.isArray(records) && records.length > 0);

const mergeUserData = (localData, serverData) => {
  const merged = { ...localData, ...serverData };
  sharedDataCollections.forEach((collection) => {
    if (!serverData[collection]?.length) merged[collection] = localData[collection] || [];
  });
  return merged;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('arTourismToken') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('arTourismUser');
    const storedToken = localStorage.getItem('arTourismToken');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const storedUser = localStorage.getItem('arTourismUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user?.email) return undefined;
    let cancelled = false;

    const synchronizeData = async () => {
      try {
        const localData = loadAppData();
        const headers = { Authorization: `Bearer ${token}` };
        const response = await fetch(`${API_BASE_URL}/api/data`, { headers });
        if (!response.ok) throw new Error('Could not load app data from the backend.');

        let serverData = await response.json();
        let initialized = response.headers.get('X-App-Data-Initialized') === 'true';
        const hasServerCatalog = sharedDataCollections.some((collection) => serverData[collection]?.length > 0);

        if (user.role === 'admin' && !initialized && !hasServerCatalog) {
          const bootstrapResponse = await fetch(`${API_BASE_URL}/api/data/bootstrap`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(localData)
          });

          if (bootstrapResponse.ok) {
            serverData = (await bootstrapResponse.json()).data;
            initialized = true;
          } else if (bootstrapResponse.status === 409) {
            const refreshed = await fetch(`${API_BASE_URL}/api/data`, { headers });
            if (!refreshed.ok) throw new Error('Could not reload app data from the backend.');
            serverData = await refreshed.json();
            initialized = refreshed.headers.get('X-App-Data-Initialized') === 'true';
          } else {
            const result = await bootstrapResponse.json().catch(() => ({}));
            throw new Error(result.message || 'Could not initialize backend app data.');
          }
        }

        if (cancelled) return;
        if (user.role === 'admin' && initialized) {
          localStorage.setItem('arSmartTourismData', JSON.stringify(serverData));
          notifyAppDataUpdated();
        } else if (hasRecords(serverData)) {
          localStorage.setItem('arSmartTourismData', JSON.stringify(mergeUserData(localData, serverData)));
          notifyAppDataUpdated();
        }
      } catch (error) {
        console.error('Backend data sync failed:', error.message);
      }
    };

    synchronizeData();
    return () => {
      cancelled = true;
    };
  }, [token, user?.email, user?.role]);

  const login = (email, role = null, authToken = '', verified = true) => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const resolvedRole = role || (normalizedEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user');
    const userData = {
      email: normalizedEmail,
      role: resolvedRole,
      verified,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem('arTourismUser', JSON.stringify(userData));
    if (authToken) {
      localStorage.setItem('arTourismToken', authToken);
      setToken(authToken);
    }
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('arTourismUser');
    localStorage.removeItem('arTourismToken');
    setUser(null);
    setToken('');
  };

  const updateProfile = (profile) => {
    const nextUser = {
      ...user,
      name: (profile.name || '').trim(),
      phone: (profile.phone || '').trim(),
      email: (profile.email || user?.email || '').trim().toLowerCase()
    };
    localStorage.setItem('arTourismUser', JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const value = {
    user,
    token,
    loading,
    login,
    updateProfile,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
