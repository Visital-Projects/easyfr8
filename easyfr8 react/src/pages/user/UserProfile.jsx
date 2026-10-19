import React, { useState, useEffect } from 'react';
import { useUserAuth } from './UserAuthContext';
import './user-portal.css';

export default function UserProfile() {
  const { user, updateProfile, changePassword, forgotPassword } = useUserAuth();

  // Profile Fields explicitly specified in PDF:
  // 1. Company Name
  // 2. Primary Contact Person
  // 3. Office Address
  // 4. Email Address
  // 5. Phone Number
  // 6. Company Logo
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [logoPreview, setLogoPreview] = useState('');

  // Loading & Alert States
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');

  // Reset request state
  const [resetMsg, setResetMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Map existing user fields
      const nameVal = user.name || '';
      // If composite or standard, populate appropriately
      setCompanyName(nameVal);
      setContactPerson(nameVal);
      setEmailAddress(user.email || '');
      setPhoneNumber(user.phone || '');
      setLogoPreview(user.avatar || '');

      // Load extended local cache for address if saved
      try {
        const storedAddr = localStorage.getItem(`easyfr8_addr_${user.email}`);
        if (storedAddr) setOfficeAddress(storedAddr);
      } catch {
        // ignore
      }
    }
  }, [user]);

  // Handle Logo file selection and conversion to Base64
  const handleLogoUpload = (e) => {
    setProfileErr('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileErr('Logo image must be smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileErr('');
    setProfileMsg('');

    if (!companyName.trim()) {
      setProfileErr('Company Name is required.');
      return;
    }
    if (!emailAddress.trim()) {
      setProfileErr('Email Address is required.');
      return;
    }

    try {
      setSavingProfile(true);

      // Persist to server via PUT /api/auth/profile
      await updateProfile({
        name: companyName.trim(),
        email: emailAddress.trim(),
        phone: phoneNumber.trim(),
        avatar: logoPreview,
      });

      // Cache office address associated with user email
      if (officeAddress.trim()) {
        try {
          localStorage.setItem(`easyfr8_addr_${emailAddress.trim()}`, officeAddress.trim());
        } catch {
          // ignore
        }
      }

      setProfileMsg('Company profile and branding updated successfully on the server.');
    } catch (err) {
      setProfileErr(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassErr('');
    setPassMsg('');

    if (!currentPassword) {
      setPassErr('Current password is required.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPassErr('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassErr('New password and confirmation do not match.');
      return;
    }

    try {
      setSavingPass(true);
      const msg = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPassMsg(msg || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassErr(err.message || 'Failed to update password.');
    } finally {
      setSavingPass(false);
    }
  };

  const handleCredentialReset = async () => {
    if (!emailAddress) return;
    try {
      setResetLoading(true);
      const msg = await forgotPassword(emailAddress);
      setResetMsg(msg || 'Reset instructions dispatched.');
    } catch (err) {
      setResetMsg('Unable to dispatch reset instructions: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div>
      <div className="row">
        {/* Left Column: Profile & Branding Form */}
        <div className="col-md-7">
          <div className="portal-card">
            <div className="portal-card-header">
              <h3 className="portal-card-title">
                <i className="fa fa-id-card-o text-primary"></i> Company Information &amp; Branding
              </h3>
            </div>
            <div className="portal-card-body">
              {profileMsg && (
                <div className="portal-alert success">
                  <i className="fa fa-check-circle"></i>
                  <span>{profileMsg}</span>
                </div>
              )}
              {profileErr && (
                <div className="portal-alert error">
                  <i className="fa fa-exclamation-circle"></i>
                  <span>{profileErr}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit}>
                {/* Branding: Company Logo */}
                <div style={{ marginBottom: '25px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label className="portal-form-label" style={{ marginBottom: '10px' }}>
                    <i className="fa fa-picture-o"></i> Company Logo (Personalised Document &amp; Profile Display)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '10px',
                        backgroundColor: '#ffffff',
                        border: '2px dashed #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <i className="fa fa-image" style={{ fontSize: '28px', color: '#94a3b8' }}></i>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleLogoUpload}
                        style={{ fontSize: '13px' }}
                      />
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                        PNG, JPG, or SVG up to 2MB. Displayed on official quotations &amp; portal header.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Company Name */}
                <div className="portal-form-group">
                  <label className="portal-form-label">
                    Company Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="portal-form-control"
                    placeholder="e.g. Apex Global Logistics Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>

                {/* Primary Contact Person */}
                <div className="portal-form-group">
                  <label className="portal-form-label">Primary Contact Person</label>
                  <input
                    type="text"
                    className="portal-form-control"
                    placeholder="Full name of primary logistics coordinator"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                  />
                </div>

                {/* Office Address */}
                <div className="portal-form-group">
                  <label className="portal-form-label">Office Address</label>
                  <textarea
                    className="portal-form-control"
                    rows="3"
                    placeholder="Registered business or warehouse address"
                    value={officeAddress}
                    onChange={(e) => setOfficeAddress(e.target.value)}
                  ></textarea>
                </div>

                <div className="row">
                  {/* Email Address */}
                  <div className="col-sm-6">
                    <div className="portal-form-group">
                      <label className="portal-form-label">
                        Email Address <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        className="portal-form-control"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="col-sm-6">
                    <div className="portal-form-group">
                      <label className="portal-form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="portal-form-control"
                        placeholder="+91 98765 43210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="portal-btn-primary"
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <>
                      <i className="fa fa-spinner fa-spin"></i> Saving Changes...
                    </>
                  ) : (
                    <>
                      <i className="fa fa-check"></i> Save Profile &amp; Branding
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Security & Credentials */}
        <div className="col-md-5">
          {/* Change Password Card */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h3 className="portal-card-title">
                <i className="fa fa-key text-warning"></i> Security &amp; Credentials
              </h3>
            </div>
            <div className="portal-card-body">
              {passMsg && (
                <div className="portal-alert success">
                  <i className="fa fa-check-circle"></i>
                  <span>{passMsg}</span>
                </div>
              )}
              {passErr && (
                <div className="portal-alert error">
                  <i className="fa fa-exclamation-circle"></i>
                  <span>{passErr}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit}>
                <div className="portal-form-group">
                  <label className="portal-form-label">Current Account Password</label>
                  <div className="portal-password-wrapper">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="portal-form-control"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="portal-password-toggle-btn"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showCurrentPassword}
                      title={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={showCurrentPassword ? 'fa fa-eye-slash' : 'fa fa-eye'}></i>
                    </button>
                  </div>
                </div>

                <div className="portal-form-group">
                  <label className="portal-form-label">New Password</label>
                  <div className="portal-password-wrapper">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="portal-form-control"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="portal-password-toggle-btn"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showNewPassword}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={showNewPassword ? 'fa fa-eye-slash' : 'fa fa-eye'}></i>
                    </button>
                  </div>
                </div>

                <div className="portal-form-group">
                  <label className="portal-form-label">Confirm New Password</label>
                  <div className="portal-password-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="portal-form-control"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="portal-password-toggle-btn"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showConfirmPassword}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={showConfirmPassword ? 'fa fa-eye-slash' : 'fa fa-eye'}></i>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="portal-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={savingPass}
                >
                  {savingPass ? (
                    <>
                      <i className="fa fa-spinner fa-spin"></i> Updating...
                    </>
                  ) : (
                    <>
                      <i className="fa fa-shield"></i> Update Password
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Credential Reset Tool */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h4 className="portal-card-title">
                <i className="fa fa-refresh text-info"></i> Reset Process
              </h4>
            </div>
            <div className="portal-card-body">
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>
                Initiate a formal credential reset token to verify account ownership via registered email.
              </p>
              {resetMsg && (
                <div className="portal-alert success" style={{ fontSize: '12px' }}>
                  <i className="fa fa-info-circle"></i>
                  <span>{resetMsg}</span>
                </div>
              )}
              <button
                type="button"
                className="btn btn-default btn-block"
                style={{ fontWeight: 600, fontSize: '13px' }}
                onClick={handleCredentialReset}
                disabled={resetLoading}
              >
                {resetLoading ? 'Dispatching...' : 'Initiate Credential Reset Email'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
