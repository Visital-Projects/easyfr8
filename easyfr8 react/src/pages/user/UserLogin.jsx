import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUserAuth } from './UserAuthContext';
import logoImg from '../../assets/images/easyfr8.png';
import './user-portal.css';

export default function UserLogin() {
  const { login, register, forgotPassword, isAuthenticated } = useUserAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isRegisterRoute = location.pathname.includes('register');
  const isForgotRoute = location.pathname.includes('forgot') || location.pathname.includes('reset');

  const [activeTab, setActiveTab] = useState(isRegisterRoute ? 'register' : 'login'); // 'login' | 'register'
  const [showForgotModal, setShowForgotModal] = useState(isForgotRoute);

  // Sync tab with route if user navigates between /user/login and /user/register
  useEffect(() => {
    if (location.pathname.includes('register')) {
      setActiveTab('register');
    } else if (location.pathname.includes('login')) {
      setActiveTab('login');
    }
    if (location.pathname.includes('forgot') || location.pathname.includes('reset')) {
      setShowForgotModal(true);
    }
  }, [location.pathname]);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotErr, setForgotErr] = useState('');

  // Destination path after successful authentication
  const searchParams = new URLSearchParams(location.search);
  const queryRedirect = searchParams.get('redirect') || searchParams.get('from');
  const destination = location.state?.from
    ? (typeof location.state.from === 'string'
        ? location.state.from
        : `${location.state.from.pathname || '/user/dashboard'}${location.state.from.search || ''}`)
    : (queryRedirect || '/user/dashboard');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, destination]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim()) {
      setLoginError('Please enter your email address.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    try {
      setLoginLoading(true);
      await login(loginEmail.trim(), loginPassword);
      navigate(destination, { replace: true });
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim() || regName.trim().length < 2) {
      setRegError('Please provide your company or full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regEmail.trim() || !emailRegex.test(regEmail.trim())) {
      setRegError('Please provide a valid corporate email address.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    try {
      setRegLoading(true);
      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
      });
      navigate('/user/dashboard', { replace: true });
    } catch (err) {
      setRegError(err.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotErr('');
    setForgotMsg('');

    if (!forgotEmail.trim()) {
      setForgotErr('Please enter your account email address.');
      return;
    }

    try {
      setForgotLoading(true);
      const msg = await forgotPassword(forgotEmail.trim());
      setForgotMsg(msg || 'Password reset instructions have been sent.');
    } catch (err) {
      setForgotErr(err.message || 'Unable to process reset request.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="portal-auth-wrapper">
      {/* Standalone Portal Brand Header */}
      <div className="portal-auth-brand">
        <Link to="/" title="EasyFr8 - Connecting Global Markets Seamlessly">
          <img src={logoImg} alt="EasyFr8" className="portal-auth-logo" />
        </Link>
        <span className="portal-auth-badge">Shipper Portal</span>
      </div>

      <div className="portal-auth-card">
        {/* Header */}
        <div className="portal-auth-header">
          <h3>EasyFr8 Shipper Portal</h3>
          <p>Access your dedicated freight operations workspace</p>
        </div>

        {/* Tab Toggle */}
        <div className="portal-auth-tabs">
          <button
            type="button"
            className={`portal-auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setLoginError('');
            }}
          >
            <i className="fa fa-sign-in"></i> Shipper Login
          </button>
          <button
            type="button"
            className={`portal-auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              setRegError('');
            }}
          >
            <i className="fa fa-user-plus"></i> Register Account
          </button>
        </div>

        {/* Body */}
        <div className="portal-auth-body">
          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit}>
              {loginError && (
                <div className="portal-alert error">
                  <i className="fa fa-exclamation-circle"></i>
                  <span>{loginError}</span>
                </div>
              )}

              <div className="portal-form-group">
                <label className="portal-form-label">
                  Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="portal-form-control"
                    placeholder="shipper@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="portal-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="portal-form-label">
                    Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginEmail);
                      setShowForgotModal(true);
                      setForgotMsg('');
                      setForgotErr('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0f2042',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="portal-password-wrapper">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    className="portal-form-control"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="portal-password-toggle-btn"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showLoginPassword}
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={showLoginPassword ? 'fa fa-eye-slash' : 'fa fa-eye'}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="portal-btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <>
                    <i className="fa fa-spinner fa-spin"></i> Authenticating...
                  </>
                ) : (
                  <>
                    <i className="fa fa-lock"></i> Sign In to Dedicated Workspace
                  </>
                )}
              </button>

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                New to EasyFr8?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0f2042',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Create Shipper Account
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit}>
              {regError && (
                <div className="portal-alert error">
                  <i className="fa fa-exclamation-circle"></i>
                  <span>{regError}</span>
                </div>
              )}

              <div className="portal-form-group">
                <label className="portal-form-label">
                  Company / Organization Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="portal-form-control"
                  placeholder="e.g. Apex Global Trade Ltd"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>

              <div className="portal-form-group">
                <label className="portal-form-label">
                  Business Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  className="portal-form-control"
                  placeholder="logistics@company.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div className="portal-form-group">
                <label className="portal-form-label">Phone Number</label>
                <input
                  type="tel"
                  className="portal-form-control"
                  placeholder="+91 98765 43210"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>

              <div className="portal-form-group">
                <label className="portal-form-label">
                  Secure Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="portal-password-wrapper">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    className="portal-form-control"
                    placeholder="Minimum 6 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="portal-password-toggle-btn"
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showRegPassword}
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={showRegPassword ? 'fa fa-eye-slash' : 'fa fa-eye'}></i>
                  </button>
                </div>
              </div>

              <div className="portal-form-group">
                <label className="portal-form-label">
                  Confirm Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="portal-password-wrapper">
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    className="portal-form-control"
                    placeholder="Repeat your password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="portal-password-toggle-btn"
                    onClick={() => setShowRegConfirmPassword((prev) => !prev)}
                    aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showRegConfirmPassword}
                    title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={showRegConfirmPassword ? 'fa fa-eye-slash' : 'fa fa-eye'}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="portal-btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                disabled={regLoading}
              >
                {regLoading ? (
                  <>
                    <i className="fa fa-spinner fa-spin"></i> Creating Account...
                  </>
                ) : (
                  <>
                    <i className="fa fa-check-circle"></i> Complete Registration
                  </>
                )}
              </button>

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0f2042',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Return to Public Website */}
      <div className="portal-auth-footer-link">
        <Link to="/" className="portal-auth-back-link">
          <i className="fa fa-arrow-left"></i> Return to EasyFr8 Public Website
        </Link>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-dialog" style={{ maxWidth: '440px' }}>
            <div className="portal-modal-header">
              <h4>Reset Shipper Credentials</h4>
              <button
                type="button"
                className="portal-modal-close"
                onClick={() => setShowForgotModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleForgotSubmit}>
              <div className="portal-modal-body">
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>
                  Enter your registered shipper email address and we will dispatch password recovery instructions.
                </p>

                {forgotErr && (
                  <div className="portal-alert error">
                    <i className="fa fa-exclamation-circle"></i>
                    <span>{forgotErr}</span>
                  </div>
                )}
                {forgotMsg && (
                  <div className="portal-alert success">
                    <i className="fa fa-check-circle"></i>
                    <span>{forgotMsg}</span>
                  </div>
                )}

                <div className="portal-form-group">
                  <label className="portal-form-label">Registered Email</label>
                  <input
                    type="email"
                    className="portal-form-control"
                    placeholder="shipper@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="portal-modal-footer">
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => setShowForgotModal(false)}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? 'Sending...' : 'Dispatch Reset Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
