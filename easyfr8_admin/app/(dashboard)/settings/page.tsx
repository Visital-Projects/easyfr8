'use client';

import React, { useState, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { AppSettings, UserAccount, RolesSettings } from '../../../lib/store';
import { SettingsService, AuthService } from '../../../services/api';
import Pagination from '../../../components/Pagination';

type SettingTab = 'profile' | 'security' | 'roles' | 'logs' | 'general' | 'siteConfig';

export default function SettingsPage() {
  const { currentUser, setCurrentUser, auditLogs, addAuditLog, clearAuditLogs, showToast, appSettings, updateAppSettings, users } = useData();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<SettingTab>('profile');

  // Profile Form States
  const [profileName, setProfileName] = useState(currentUser?.name || 'Biswajit Shaw');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || 'biswa@easyfr8.com');
  const [profileAvatar, setProfileAvatar] = useState(currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150');

  // Password Security Form States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 2FA & Session Timeout
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [loginHistory, setLoginHistory] = useState([
    { id: 1, ip: '192.168.1.102', device: 'Chrome / Windows 11', time: '2026-07-04 11:20:45', location: 'Dhanbad, India', status: 'Success' },
    { id: 2, ip: '103.45.201.2', device: 'Safari / iPhone 15', time: '2026-07-03 14:02:11', location: 'Ranchi, India', status: 'Success' },
    { id: 3, ip: '192.168.1.102', device: 'Chrome / Windows 11', time: '2026-07-02 09:30:15', location: 'Dhanbad, India', status: 'Success' },
  ]);

  // Roles Matrix Form States (hydrated from persisted appSettings)
  const [rolesList, setRolesList] = useState<string[]>(
    appSettings.roles?.rolesList || ['Manager', 'Content Moderator']
  );
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, Record<string, boolean>>>(
    appSettings.roles?.permissionsMatrix || {
      'Manager': { edit_cms: true, manage_rates: true, manage_enquiries: true, manage_blogs: true, view_audit_logs: false, manage_users: false },
      'Content Moderator': { edit_cms: true, manage_rates: false, manage_enquiries: false, manage_blogs: true, view_audit_logs: false, manage_users: false }
    }
  );
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);

  // General Settings States
  const [siteName, setSiteName] = useState(appSettings.site.siteName);
  const [companyName, setCompanyName] = useState(appSettings.site.companyName);
  const [siteAddress, setSiteAddress] = useState(appSettings.site.address);
  const [sitePhone, setSitePhone] = useState(appSettings.site.phone);
  const [siteEmail, setSiteEmail] = useState(appSettings.site.email);
  const [siteLogo, setSiteLogo] = useState(appSettings.site.logoUrl || '');
  const [siteFavicon, setSiteFavicon] = useState(appSettings.site.faviconUrl || '');
  const [timezone, setTimezone] = useState(appSettings.site.timezone);
  const [dateFormat, setDateFormat] = useState(appSettings.site.dateFormat);
  const [timeFormat, setTimeFormat] = useState(appSettings.site.timeFormat);

  // SMTP States
  const [smtpHost, setSmtpHost] = useState(appSettings.smtp.host);
  const [smtpPort, setSmtpPort] = useState(appSettings.smtp.port);
  const [smtpUser, setSmtpUser] = useState(appSettings.smtp.username);
  const [smtpPassword, setSmtpPassword] = useState(appSettings.smtp.password);
  const [smtpEncryption, setSmtpEncryption] = useState(appSettings.smtp.encryption);
  const [smtpSenderName, setSmtpSenderName] = useState(appSettings.smtp.senderName);
  const [smtpSenderEmail, setSmtpSenderEmail] = useState(appSettings.smtp.senderEmail);
  const [smtpEnabled, setSmtpEnabled] = useState(appSettings.smtp.enabled);
  const [smtpNotifyEnquiry, setSmtpNotifyEnquiry] = useState(appSettings.smtp.notifyNewEnquiry);
  const [smtpNotifyUpload, setSmtpNotifyUpload] = useState(appSettings.smtp.notifyDocumentUpload);
  const [smtpNotifyUser, setSmtpNotifyUser] = useState(appSettings.smtp.notifyNewUser);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  // SMS States
  const [smsProvider, setSmsProvider] = useState(appSettings.sms.provider);
  const [smsApiKey, setSmsApiKey] = useState(appSettings.sms.apiKey);
  const [smsApiSecret, setSmsApiSecret] = useState(appSettings.sms.apiSecret);
  const [smsSenderId, setSmsSenderId] = useState(appSettings.sms.senderId);
  const [smsEnabled, setSmsEnabled] = useState(appSettings.sms.enabled);
  const [smsNotifyEnquiry, setSmsNotifyEnquiry] = useState(appSettings.sms.notifyNewEnquiry);
  const [smsNotifyStatus, setSmsNotifyStatus] = useState(appSettings.sms.notifyStatusChange);
  const [testSmsNumber, setTestSmsNumber] = useState('');

  // Payment States
  const [razorpayEnabled, setRazorpayEnabled] = useState(appSettings.payment.razorpay.enabled);
  const [razorpayKey, setRazorpayKey] = useState(appSettings.payment.razorpay.apiKey);
  const [razorpaySecret, setRazorpaySecret] = useState(appSettings.payment.razorpay.apiSecret);
  const [razorpayWebhook, setRazorpayWebhook] = useState(appSettings.payment.razorpay.webhookUrl);
  const [razorpayMode, setRazorpayMode] = useState(appSettings.payment.razorpay.mode);

  const [stripeEnabled, setStripeEnabled] = useState(appSettings.payment.stripe.enabled);
  const [stripeKey, setStripeKey] = useState(appSettings.payment.stripe.apiKey);
  const [stripeSecret, setStripeSecret] = useState(appSettings.payment.stripe.apiSecret);
  const [stripeWebhook, setStripeWebhook] = useState(appSettings.payment.stripe.webhookUrl);
  const [stripeMode, setStripeMode] = useState(appSettings.payment.stripe.mode);

  const [paypalEnabled, setPaypalEnabled] = useState(appSettings.payment.paypal.enabled);
  const [paypalClientId, setPaypalClientId] = useState(appSettings.payment.paypal.clientId);
  const [paypalSecret, setPaypalSecret] = useState(appSettings.payment.paypal.clientSecret);
  const [paypalWebhook, setPaypalWebhook] = useState(appSettings.payment.paypal.webhookUrl);
  const [paypalMode, setPaypalMode] = useState(appSettings.payment.paypal.mode);
  const [cashEnabled, setCashEnabled] = useState(appSettings.payment.cashEnabled);

  // Tax States
  const [gstEnabled, setGstEnabled] = useState(appSettings.tax.gstEnabled);
  const [gstRate, setGstRate] = useState(appSettings.tax.gstRate);
  const [vatEnabled, setVatEnabled] = useState(appSettings.tax.vatEnabled);
  const [vatRate, setVatRate] = useState(appSettings.tax.vatRate);
  const [taxLabel, setTaxLabel] = useState(appSettings.tax.defaultTaxLabel);
  const [taxInclusive, setTaxInclusive] = useState(appSettings.tax.taxInclusive);

  // Currency States
  const [defaultCurrency, setDefaultCurrency] = useState(appSettings.currency.defaultCurrency);
  const [currencySymbol, setCurrencySymbol] = useState(appSettings.currency.currencySymbol);
  const [symbolPosition, setSymbolPosition] = useState(appSettings.currency.symbolPosition);
  const [decimalPrecision, setDecimalPrecision] = useState(appSettings.currency.decimalPrecision);
  const [thousandsSeparator, setThousandsSeparator] = useState(appSettings.currency.thousandsSeparator);

  // Language States
  const [defaultLanguage, setDefaultLanguage] = useState(appSettings.language.defaultLanguage);
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>(appSettings.language.enabledLanguages);
  const [rtlEnabled, setRtlEnabled] = useState(appSettings.language.rtlEnabled);

  // General Site Config States
  const [siteUrl, setSiteUrl] = useState(appSettings.siteConfig.siteUrl);
  const [maintenanceMode, setMaintenanceMode] = useState(appSettings.siteConfig.maintenanceMode);
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState(appSettings.siteConfig.googleAnalyticsId);
  const [googleTagManagerId, setGoogleTagManagerId] = useState(appSettings.siteConfig.googleTagManagerId);
  const [googleMapsKey, setGoogleMapsKey] = useState(appSettings.siteConfig.googleMapsKey);
  const [reCaptchaSiteKey, setReCaptchaSiteKey] = useState(appSettings.siteConfig.reCaptchaSiteKey);
  const [reCaptchaSecretKey, setReCaptchaSecretKey] = useState(appSettings.siteConfig.reCaptchaSecretKey);
  const [cookieBannerEnabled, setCookieBannerEnabled] = useState(appSettings.siteConfig.cookieBannerEnabled);
  const [robotsTxt, setRobotsTxt] = useState(appSettings.siteConfig.robotsTxt);
  const [seoTitle, setSeoTitle] = useState(appSettings.siteConfig.seoDefaultTitle);
  const [seoDesc, setSeoDesc] = useState(appSettings.siteConfig.seoDefaultDesc);

  // Audit Logs Search & Pagination
  const [logsSearchQuery, setLogsSearchQuery] = useState('');
  const [currentLogsPage, setCurrentLogsPage] = useState(1);
  const logsPerPage = 5;

  // Sync settings when store hydrates
  useEffect(() => {
    setSiteName(appSettings.site.siteName);
    setCompanyName(appSettings.site.companyName);
    setSiteAddress(appSettings.site.address);
    setSitePhone(appSettings.site.phone);
    setSiteEmail(appSettings.site.email);
    setSmtpHost(appSettings.smtp.host);
    setSmtpPort(appSettings.smtp.port);
    setSmtpUser(appSettings.smtp.username);
    setSmtpPassword(appSettings.smtp.password);
    setSmtpSenderEmail(appSettings.smtp.senderEmail);
    setSmsApiKey(appSettings.sms.apiKey);
    if (appSettings.roles) {
      if (appSettings.roles.rolesList && Array.isArray(appSettings.roles.rolesList)) {
        setRolesList(appSettings.roles.rolesList);
      }
      if (appSettings.roles.permissionsMatrix && typeof appSettings.roles.permissionsMatrix === 'object') {
        setPermissionsMatrix(appSettings.roles.permissionsMatrix);
      }
    }
  }, [appSettings]);

  // Sync profile form states when currentUser hydrates or updates
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setProfileName(currentUser.name);
      if (currentUser.email) setProfileEmail(currentUser.email);
      if (currentUser.avatar) setProfileAvatar(currentUser.avatar);
    }
  }, [currentUser]);

  // Handle Profile Photo Upload (Base64 conversion)
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const base64Img = evt.target.result as string;
          setProfileAvatar(base64Img);
          showToast('Profile image preview updated!', 'info');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await AuthService.updateProfile({
        name: profileName,
        email: profileEmail,
        avatar: profileAvatar,
      });
      if (res.success) {
        setCurrentUser(res.user);
        addAuditLog(`Updated profile details for ${profileName}`);
        showToast('Profile saved successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save profile.', 'danger');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'danger');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'danger');
      return;
    }
    try {
      const res = await AuthService.changePassword({
        oldPassword,
        newPassword,
        confirmPassword,
      });
      if (res.success) {
        addAuditLog('Admin password changed successfully');
        showToast('Password updated successfully!', 'success');
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update password.', 'danger');
    }
  };

  // Roles Matrix Checkbox Toggles
  const handlePermissionChange = (role: string, perm: string, checked: boolean) => {
    setPermissionsMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [perm]: checked }
    }));
  };

  const handleSaveMatrix = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingMatrix(true);
      const updatedRoles: RolesSettings = {
        rolesList,
        permissionsMatrix,
      };
      await SettingsService.update('roles', updatedRoles);
      updateAppSettings({ roles: updatedRoles });
      addAuditLog('Updated security access role matrices');
      showToast('Access permissions matrix saved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save access permissions configuration.', 'danger');
    } finally {
      setIsSavingMatrix(false);
    }
  };

  const handleAddRole = async () => {
    const name = prompt('Enter name of the new access role:');
    if (!name) return;
    if (rolesList.includes(name)) { showToast('Role already exists.', 'warning'); return; }
    const newRolesList = [...rolesList, name];
    const newMatrix = {
      ...permissionsMatrix,
      [name]: { edit_cms: false, manage_rates: false, manage_enquiries: false, manage_blogs: false, view_audit_logs: false, manage_users: false }
    };
    setRolesList(newRolesList);
    setPermissionsMatrix(newMatrix);
    const updatedRoles: RolesSettings = { rolesList: newRolesList, permissionsMatrix: newMatrix };
    try {
      await SettingsService.update('roles', updatedRoles);
      updateAppSettings({ roles: updatedRoles });
    } catch (err: any) {
      console.error('Failed to persist new role', err);
    }
    addAuditLog(`Registered new access role: ${name}`);
    showToast(`Role ${name} added to control matrix.`, 'success');
  };

  const handleDeleteRole = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the role "${name}" and all its permissions?`)) return;
    const newRolesList = rolesList.filter((r) => r !== name);
    const nextMatrix = { ...permissionsMatrix };
    delete nextMatrix[name];
    setRolesList(newRolesList);
    setPermissionsMatrix(nextMatrix);
    const updatedRoles: RolesSettings = { rolesList: newRolesList, permissionsMatrix: nextMatrix };
    try {
      await SettingsService.update('roles', updatedRoles);
      updateAppSettings({ roles: updatedRoles });
    } catch (err: any) {
      console.error('Failed to persist deleted role', err);
    }
    addAuditLog(`Removed access role: ${name}`);
    showToast(`Role ${name} removed from configuration.`, 'success');
  };

  // Settings tab saves
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSite = { siteName, companyName, address: siteAddress, phone: sitePhone, email: siteEmail, logoUrl: siteLogo, faviconUrl: siteFavicon, timezone, dateFormat, timeFormat };
    await SettingsService.update('site', updatedSite);
    updateAppSettings({ site: updatedSite });
    addAuditLog('Saved general company settings');
    showToast('General Settings updated successfully.', 'success');
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSmtp = { host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPassword, encryption: smtpEncryption as any, senderName: smtpSenderName, senderEmail: smtpSenderEmail, enabled: smtpEnabled, notifyNewEnquiry: smtpNotifyEnquiry, notifyDocumentUpload: smtpNotifyUpload, notifyNewUser: smtpNotifyUser };
    await SettingsService.update('smtp', updatedSmtp);
    updateAppSettings({ smtp: updatedSmtp });
    addAuditLog('Updated SMTP configurations');
    showToast('SMTP Server settings saved.', 'success');
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress) { showToast('Enter an email address first.', 'warning'); return; }
    try {
      const res = await SettingsService.testEmail(testEmailAddress);
      showToast(res.message, 'success');
    } catch {
      showToast('Failed to dispatch test mail.', 'danger');
    }
  };

  const handleSaveSms = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSms = { provider: smsProvider as any, apiKey: smsApiKey, apiSecret: smsApiSecret, senderId: smsSenderId, enabled: smsEnabled, notifyNewEnquiry: smsNotifyEnquiry, notifyStatusChange: smsNotifyStatus };
    await SettingsService.update('sms', updatedSms);
    updateAppSettings({ sms: updatedSms });
    addAuditLog('Saved SMS Gateway configuration details');
    showToast('SMS Gateway setup saved.', 'success');
  };

  const handleTestSms = async () => {
    if (!testSmsNumber) { showToast('Enter test phone number first.', 'warning'); return; }
    try {
      const res = await SettingsService.testSms(testSmsNumber);
      showToast(res.message, 'success');
    } catch {
      showToast('SMS dispatch simulator failed.', 'danger');
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPayment = {
      razorpay: { enabled: razorpayEnabled, apiKey: razorpayKey, apiSecret: razorpaySecret, webhookUrl: razorpayWebhook, mode: razorpayMode as any },
      stripe: { enabled: stripeEnabled, apiKey: stripeKey, apiSecret: stripeSecret, webhookUrl: stripeWebhook, mode: stripeMode as any },
      paypal: { enabled: paypalEnabled, clientId: paypalClientId, clientSecret: paypalSecret, webhookUrl: paypalWebhook, mode: paypalMode as any },
      cashEnabled
    };
    await SettingsService.update('payment', updatedPayment);
    updateAppSettings({ payment: updatedPayment });
    addAuditLog('Updated Payment Gateway configuration sets');
    showToast('Payment gateways saved.', 'success');
  };

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTax = { gstEnabled, gstRate, vatEnabled, vatRate, defaultTaxLabel: taxLabel, taxInclusive };
    await SettingsService.update('tax', updatedTax);
    updateAppSettings({ tax: updatedTax });
    addAuditLog('Updated Tax Configurations');
    showToast('Tax configuration saved.', 'success');
  };

  const handleSaveCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCurrency = { defaultCurrency, currencySymbol, symbolPosition: symbolPosition as any, decimalPrecision, thousandsSeparator };
    await SettingsService.update('currency', updatedCurrency);
    updateAppSettings({ currency: updatedCurrency });
    addAuditLog('Updated platform default currency parameters');
    showToast('Currency parameters saved.', 'success');
  };

  const handleSaveLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedLanguage = { defaultLanguage, enabledLanguages, rtlEnabled };
    await SettingsService.update('language', updatedLanguage);
    updateAppSettings({ language: updatedLanguage });
    addAuditLog('Updated system localization settings');
    showToast('Language settings saved.', 'success');
  };

  const handleLanguageToggle = (lang: string) => {
    if (enabledLanguages.includes(lang)) {
      if (enabledLanguages.length > 1) {
        setEnabledLanguages(enabledLanguages.filter((l) => l !== lang));
      } else {
        showToast('At least one language must remain enabled.', 'warning');
      }
    } else {
      setEnabledLanguages([...enabledLanguages, lang]);
    }
  };

  const handleSaveSiteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedConfig = { siteUrl, maintenanceMode, googleAnalyticsId, googleTagManagerId, googleMapsKey, reCaptchaSiteKey, reCaptchaSecretKey, cookieBannerEnabled, robotsTxt, seoDefaultTitle: seoTitle, seoDefaultDesc: seoDesc };
    await SettingsService.update('siteConfig', updatedConfig);
    updateAppSettings({ siteConfig: updatedConfig });
    addAuditLog('Saved general site configuration details');
    showToast('General Site Configuration updated.', 'success');
  };

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to permanently clear the audit activities history log stream?')) {
      clearAuditLogs();
      addAuditLog('Audit logs history database cleared');
      showToast('Audit logs database reset.', 'success');
      setCurrentLogsPage(1);
    }
  };

  // Filter audit logs
  const filteredLogs = auditLogs.filter((log) => {
    return logsSearchQuery.trim() === '' ||
      log.id.toLowerCase().includes(logsSearchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(logsSearchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(logsSearchQuery.toLowerCase()) ||
      log.timestamp.toLowerCase().includes(logsSearchQuery.toLowerCase());
  });

  const totalLogs = filteredLogs.length;
  const totalPages = Math.ceil(totalLogs / logsPerPage);
  const paginatedLogs = filteredLogs.slice((currentLogsPage - 1) * logsPerPage, currentLogsPage * logsPerPage);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings & Access Control</h1>
          <p className="page-subtitle">Configure administrative configurations, site credentials, role permissions, and view audit events.</p>
        </div>
      </div>

      {/* Tabs Navigation (Scrollable horizontally) */}
      <div className="tabs-navigation" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--space-6)', overflowX: 'auto', flexWrap: 'nowrap', gap: '0' }}>
        {(['profile', 'security', 'roles', 'general', 'siteConfig', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab-link ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 16px',
              borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : 'none',
              fontWeight: activeTab === tab ? 600 : 500,
              textTransform: 'capitalize'
            }}
          >
            {tab === 'siteConfig' ? 'Site Config' : tab === 'logs' ? 'Audit Logs' : tab}
          </button>
        ))}
      </div>

      {/* TAB 1: PROFILE SETTINGS */}
      {activeTab === 'profile' && (
        <div className="tab-pane active">
          <div className="chart-card" style={{ maxWidth: '600px' }}>
            <h3 className="chart-card-title" style={{ marginBottom: 'var(--space-4)' }}>Personal Profile Details</h3>
            <form onSubmit={handleSaveProfile}>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <img src={profileAvatar} alt="Avatar Edit Preview" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ position: 'relative' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Change Photo</button>
                  <input type="file" onChange={handleAvatarChange} accept="image/*" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Display Name *</label>
                <input type="text" className="form-control" value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input type="email" className="form-control" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary">Save Profile</button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY & 2FA */}
      {activeTab === 'security' && (
        <div className="tab-pane active">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            <div className="chart-card">
              <h3 className="chart-card-title" style={{ marginBottom: 'var(--space-4)' }}>Update Authentication Password</h3>
              <form onSubmit={handleUpdatePassword}>
                <div className="form-group">
                  <label className="form-label">Current Active Password *</label>
                  <input type="password" className="form-control" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <input type="password" className="form-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password *</label>
                  <input type="password" className="form-control" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
                </div>
                <button type="submit" className="btn btn-primary">Update Password</button>
              </form>
            </div>

            <div className="chart-card">
              <h3 className="chart-card-title" style={{ marginBottom: '16px' }}>2FA & Session Configurations</h3>
              <div className="form-group">
                <label className="custom-checkbox" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <input type="checkbox" checked={twoFactorEnabled} onChange={(e) => setTwoFactorEnabled(e.target.checked)} />
                  <span className="checkbox-mark"></span>
                  <span style={{ fontSize: '0.85rem', marginLeft: '8px' }}>Enable Two-Factor Authentication (2FA) via Google Authenticator</span>
                </label>
                {twoFactorEnabled && (
                  <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px', marginBottom: '16px', alignItems: 'center' }}>
                    <div style={{ width: '80px', height: '80px', background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>QR Code Code</div>
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>Scan QR with Authenticator App</p>
                      <code style={{ fontSize: '0.7rem' }}>SECRET_BASE32_KEY_MOCK</code>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Automatic Session Idle Timeout (minutes)</label>
                <input type="number" className="form-control" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} style={{ width: '120px' }} />
              </div>

              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '20px', marginBottom: '10px' }}>Active System Access Logs</h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr><th>IP Address</th><th>Browser / OS</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {loginHistory.map((h) => (
                      <tr key={h.id}><td>{h.ip}</td><td>{h.device}</td><td>{h.time}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROLES MATRIX */}
      {activeTab === 'roles' && (
        <div className="tab-pane active">
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 className="chart-card-title" style={{ margin: 0 }}>Access Roles Matrix Configuration</h3>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddRole}>+ Add New Role</button>
            </div>
            
            <form onSubmit={handleSaveMatrix}>
              <div className="table-responsive">
                <table className="matrix-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '10px' }}>Permission Key</th>
                      {rolesList.map((role) => (
                        <th key={role} style={{ textAlign: 'center', padding: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span>{role}</span>
                            <button type="button" onClick={() => handleDeleteRole(role)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '0.7rem', cursor: 'pointer' }}>Delete</button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'edit_cms', label: 'Modify Website Slogans & CMS Banner' },
                      { key: 'manage_rates', label: 'Upload or Delete Ocean Freight Routes Rates' },
                      { key: 'manage_enquiries', label: 'Assign Enquiries, Update Notes & Statuses' },
                      { key: 'manage_blogs', label: 'Create Articles, Draft Compliance Regulations' },
                      { key: 'view_audit_logs', label: 'Read and Reset Activity History logs stream' },
                      { key: 'manage_users', label: 'Create Administrators & Access matrix' },
                    ].map((row) => (
                      <tr key={row.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 600 }}>{row.label}</div>
                          <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{row.key}</code>
                        </td>
                        {rolesList.map((role) => {
                          const val = permissionsMatrix[role]?.[row.key] ?? false;
                          return (
                            <td key={role} style={{ textAlign: 'center', padding: '10px' }}>
                              <label className="custom-checkbox">
                                <input type="checkbox" checked={val} onChange={(e) => handlePermissionChange(role, row.key, e.target.checked)} />
                                <span className="checkbox-mark" style={{ position: 'relative', display: 'inline-block' }}></span>
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '20px' }} disabled={isSavingMatrix}>
                {isSavingMatrix ? 'Saving Configuration...' : 'Save Access Permission Configuration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: GENERAL SETTINGS */}
      {activeTab === 'general' && (
        <div className="tab-pane active">
          <div className="chart-card" style={{ maxWidth: '640px' }}>
            <h3 className="chart-card-title" style={{ marginBottom: 'var(--space-4)' }}>General Organization Settings</h3>
            <form onSubmit={handleSaveGeneral}>
              <div className="form-group">
                <label className="form-label">Site Name</label>
                <input type="text" className="form-control" value={siteName} onChange={(e) => setSiteName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Company Legal Name</label>
                <input type="text" className="form-control" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Headquarters Address</label>
                <textarea className="form-control" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} rows={3} required></textarea>
              </div>
              <div className="form-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Public Phone Number</label>
                  <input type="text" className="form-control" value={sitePhone} onChange={(e) => setSitePhone(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Public Email</label>
                  <input type="email" className="form-control" value={siteEmail} onChange={(e) => setSiteEmail(e.target.value)} required />
                </div>
              </div>
              <div className="form-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Default System Timezone</label>
                  <select className="form-control" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
                    <option value="UTC">UTC (GMT+0:00)</option>
                    <option value="America/New_York">America/New_York (GMT-5:00)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Date Format Template</label>
                  <select className="form-control" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 04/07/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-07-04)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 07/04/2026)</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Save General Settings</button>
            </form>
          </div>
        </div>
      )}



      {/* TAB 11: SITE CONFIGURATION */}
      {activeTab === 'siteConfig' && (
        <div className="tab-pane active">
          <form onSubmit={handleSaveSiteConfig}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
              <div className="chart-card">
                <h3 className="chart-card-title" style={{ marginBottom: '16px' }}>Site Credentials & Analytics keys</h3>
                <div className="form-group">
                  <label className="form-label">Production Website URL</label>
                  <input type="text" className="form-control" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Google Analytics Measurement ID</label>
                  <input type="text" className="form-control" value={googleAnalyticsId} onChange={(e) => setGoogleAnalyticsId(e.target.value)} placeholder="e.g. G-12345678" />
                </div>
                <div className="form-group">
                  <label className="form-label">Google Tag Manager Container ID</label>
                  <input type="text" className="form-control" value={googleTagManagerId} onChange={(e) => setGoogleTagManagerId(e.target.value)} placeholder="e.g. GTM-XXXXXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">Google Maps Platform JavaScript API Key</label>
                  <input type="password" className="form-control" value={googleMapsKey} onChange={(e) => setGoogleMapsKey(e.target.value)} />
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">reCAPTCHA v3 Site Key</label>
                    <input type="text" className="form-control" value={reCaptchaSiteKey} onChange={(e) => setReCaptchaSiteKey(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">reCAPTCHA Secret Key</label>
                    <input type="password" className="form-control" value={reCaptchaSecretKey} onChange={(e) => setReCaptchaSecretKey(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <h3 className="chart-card-title" style={{ marginBottom: '16px' }}>Maintenance & Crawling SEO</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Enable Maintenance Mode</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Blocks public site traffic with static placeholder page.</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Cookie Consent Banner</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Render standard GDPR cookie notice on landing page.</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={cookieBannerEnabled} onChange={(e) => setCookieBannerEnabled(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Default robots.txt file content</label>
                  <textarea className="form-control" value={robotsTxt} onChange={(e) => setRobotsTxt(e.target.value)} rows={4} style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}></textarea>
                </div>
              </div>
            </div>

            <div className="chart-card" style={{ marginTop: '20px' }}>
              <h3 className="chart-card-title" style={{ marginBottom: '16px' }}>SEO Defaults & Suffixes</h3>
              <div className="form-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">SEO Title Suffix Label</label>
                  <input type="text" className="form-control" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">SEO Default Meta Description Slogan</label>
                  <input type="text" className="form-control" value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Save General Site Configuration</button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 12: AUDIT LOGS HISTORY */}
      {activeTab === 'logs' && (
        <div className="tab-pane active">
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '300px' }}>
                <input
                  type="text"
                  className="form-control"
                  value={logsSearchQuery}
                  onChange={(e) => { setLogsSearchQuery(e.target.value); setCurrentLogsPage(1); }}
                  placeholder="Search logs action..."
                  style={{ height: '36px' }}
                />
              </div>
              <button className="btn btn-danger" onClick={handleClearLogs} disabled={auditLogs.length === 0}>
                Reset Log History Database
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Operator Email</th>
                    <th>Action Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600 }}>{log.id}</td>
                      <td>{log.user}</td>
                      <td>{log.action}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{log.timestamp}</td>
                    </tr>
                  ))}
                  {paginatedLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                        No operation audit history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination currentPage={currentLogsPage} totalPages={totalPages} totalRows={totalLogs} rowsPerPage={logsPerPage} onPageChange={(p) => setCurrentLogsPage(p)} />
          </div>
        </div>
      )}
    </>
  );
}
