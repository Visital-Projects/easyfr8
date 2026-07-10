'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '../../context/DataContext';
import { AuthService } from '../../services/api';
import Preloader from '../../components/Preloader';

export default function LoginPage() {
  const { login, sessionActive, showToast } = useData();
  const router = useRouter();

  const [email, setEmail] = useState('biswa@easyfr8.com');
  const [password, setPassword] = useState('admin123');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPreloader, setShowPreloader] = useState(false);

  // Field validation states
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (sessionActive && !showPreloader) {
      router.push('/dashboard');
    }
  }, [sessionActive, showPreloader, router]);

  if (showPreloader) {
    return <Preloader />;
  }

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = 'This field is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'This field is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showToast('Please fix the validation errors.', 'danger');
      return;
    }

    try {
      setLoading(true);

      // Perform centralized service authentication
      const response = await AuthService.login({ email, password });
      
      // Save auth details and update context state immediately
      login(email, response.user, response.token);

      // Show professional logo preloader
      setShowPreloader(true);
      setLoading(false);

      // Wait 2 seconds and redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setLoading(false);
      showToast(err.message || 'Invalid credentials.', 'danger');
    }
  };

  return (
    <div className="login-page-body-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-primary)',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
    }}>
      <div className="login-card" style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        width: '100%',
        maxWidth: '420px',
        padding: 'var(--space-8) var(--space-8)',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Loading Skeleton Shimmer overlay */}
        {loading && (
          <div className="login-loading-overlay" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--surface-card)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            zIndex: 20,
          }}>
            <div className="skeleton skeleton-title" style={{ width: '50%', margin: '0 auto var(--space-6) auto' }}></div>
            <div className="skeleton skeleton-text" style={{ marginBottom: 'var(--space-4)' }}></div>
            <div className="skeleton skeleton-text" style={{ marginBottom: 'var(--space-4)' }}></div>
            <div className="skeleton skeleton-text" style={{ marginBottom: 'var(--space-4)', width: '80%' }}></div>
            <div className="skeleton skeleton-card" style={{ height: '40px', marginTop: 'var(--space-4)' }}></div>
          </div>
        )}

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
          <img src="/assets/easyfr8.png" alt="EasyFr8 Logo" style={{ height: '48px', maxWidth: '220px', objectFit: 'contain' }} />
        </div>

        {/* Header */}
        <div className="login-header" style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Welcome Back</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Enter your administrator credentials to access the panel</p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address <span className="required">*</span></label>
            <input
              className={`form-control ${errors.email ? 'error' : ''}`}
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. biswa@easyfr8.com"
              required
            />
            {errors.email && <div className="form-error-msg" style={{ display: 'block' }}>{errors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password <span className="required">*</span></label>
            <input
              className={`form-control ${errors.password ? 'error' : ''}`}
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            {errors.password && <div className="form-error-msg" style={{ display: 'block' }}>{errors.password}</div>}
          </div>

          <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <label className="custom-checkbox">
              <input
                type="checkbox"
                name="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className="checkbox-mark"></span>
              <span style={{ fontSize: '0.8rem', marginLeft: 'var(--space-2)', color: 'var(--text-secondary)' }}>Remember me</span>
            </label>
            <a
              href="#"
              className="forgot-password"
              onClick={(e) => {
                e.preventDefault();
                showToast('Password recovery system initiated.', 'info');
              }}
              style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}
            >
              Forgot Password?
            </a>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px' }}>Sign In</button>
        </form>

        <div className="login-footer-info" style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <p>Value Envision India Pvt Ltd &copy; 2026</p>
        </div>
      </div>
    </div>
  );
}
