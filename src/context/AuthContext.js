import React, { createContext, useContext, useState, useEffect } from 'react';
import { ADMIN_EMAIL } from '../data/store';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('arTourismUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (email, role = null) => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const resolvedRole = role || (normalizedEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user');
    const userData = {
      email: normalizedEmail,
      role: resolvedRole,
      verified: true,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem('arTourismUser', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('arTourismUser');
    setUser(null);
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
