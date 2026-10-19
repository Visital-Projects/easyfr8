import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../../services/api';

const UserAuthContext = createContext(null);

export function UserAuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return localStorage.getItem('easyfr8_token') || null;
  });

  const [user, setUser] = useState(() => {
    try {
      const storedToken = localStorage.getItem('easyfr8_token');
      if (!storedToken) return null;
      const stored = localStorage.getItem('easyfr8_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Synchronize state and fetch latest profile if token is present
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('easyfr8_token');
      if (storedToken) {
        try {
          const profile = await api.get('/auth/profile');
          if (profile && profile.email) {
            setUser((prev) => {
              const updated = {
                ...(prev || {}),
                name: profile.name,
                email: profile.email,
                phone: profile.phone || '',
                role: profile.role,
                avatar: profile.avatar || '',
              };
              localStorage.setItem('easyfr8_user', JSON.stringify(updated));
              return updated;
            });
          }
        } catch (err) {
          console.warn('Session verification failed:', err.message);
          // Clean up expired or invalid session immediately
          localStorage.removeItem('easyfr8_token');
          localStorage.removeItem('easyfr8_user');
          setToken(null);
          setUser(null);
        }
      } else {
        localStorage.removeItem('easyfr8_user');
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.token) {
      localStorage.setItem('easyfr8_token', res.token);
      localStorage.setItem('easyfr8_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.error || 'Authentication failed');
  };

  const register = async ({ name, email, password, phone }) => {
    const res = await api.post('/auth/register', { name, email, password, phone });
    if (res.success && res.token) {
      localStorage.setItem('easyfr8_token', res.token);
      localStorage.setItem('easyfr8_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.error || 'Registration failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('easyfr8_token');
      localStorage.removeItem('easyfr8_user');
      setToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (profileData) => {
    const res = await api.put('/auth/profile', profileData);
    if (res.success) {
      if (res.token) {
        localStorage.setItem('easyfr8_token', res.token);
        setToken(res.token);
      }
      const updatedUser = {
        ...(user || {}),
        ...res.user,
      };
      localStorage.setItem('easyfr8_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    }
    throw new Error(res.error || 'Profile update failed');
  };

  const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
    const res = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (res.success) {
      return res.message;
    }
    throw new Error(res.error || 'Password update failed');
  };

  const forgotPassword = async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    if (res.success) {
      return res.message;
    }
    throw new Error(res.error || 'Password reset request failed');
  };

  return (
    <UserAuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        forgotPassword,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
}
