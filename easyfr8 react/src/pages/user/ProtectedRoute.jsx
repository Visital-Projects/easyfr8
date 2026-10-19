import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserAuth } from './UserAuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useUserAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fa fa-spinner fa-spin fa-3x" style={{ color: '#0f2042' }}></i>
          <p style={{ marginTop: '15px', color: '#666', fontWeight: 600 }}>Verifying Shipper Workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/user/login" state={{ from: location }} replace />;
  }

  return children;
}
