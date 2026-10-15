import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import SmartTourism from './pages/SmartTourism';
import TribalHeritage from './pages/TribalHeritage';
import TribalProducts from './pages/TribalProducts';
import BadagaLink from './pages/BadagaLink';
import Checkout from './pages/Checkout';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, token, loading } = useAuth();
  if (loading) return null;
  return user && token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, token, loading } = useAuth();
  if (loading) return null;
  return user && token && user.role === 'admin' ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin-dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/smart-tourism"
            element={
              <ProtectedRoute>
                <SmartTourism />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tribal-heritage"
            element={
              <ProtectedRoute>
                <TribalHeritage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tribal-products"
            element={
              <ProtectedRoute>
                <TribalProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/badaga-link"
            element={
              <ProtectedRoute>
                <BadagaLink />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
