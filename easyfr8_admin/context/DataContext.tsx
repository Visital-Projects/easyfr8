'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  CMSData,
  Enquiry,
  FreightRate,
  UserAccount,
  KYCDocument,
  Blog,
  AuditLog,
  CurrentUser,
  AppSettings,
  defaultCMSData,
  defaultEnquiries,
  defaultRates,
  defaultUsers,
  defaultDocuments,
  defaultBlogs,
  defaultAuditLogs,
  defaultAppSettings,
  defaultHeroSlides,
  defaultPartners,
  defaultStatistics,
  defaultIndustries,
  HeroSlide,
  Partner,
  Statistic,
  Industry,
} from '../lib/store';
import {
  AuthService,
  CMSService,
  EnquiryService,
  RateService,
  UserService,
  DocumentService,
  BlogService,
  AuditLogService,
  SettingsService,
  HeroSlidesService,
  MediaService,
} from '../services/api';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface DataContextType {
  // CMS
  cms: CMSData;
  updateCMS: (updated: CMSData) => void;

  // Enquiries
  enquiries: Enquiry[];
  addEnquiry: (enquiry: Omit<Enquiry, 'id' | 'date'>) => void;
  updateEnquiry: (id: string, updated: Partial<Enquiry>) => void;
  deleteEnquiry: (id: string) => void;
  bulkDeleteEnquiries: (ids: string[]) => void;
  bulkUpdateEnquiryStatus: (ids: string[], status: Enquiry['status']) => void;

  // Rates
  rates: FreightRate[];
  addRate: (rate: FreightRate) => void;
  updateRate: (id: string, updated: Partial<FreightRate>) => void;
  deleteRate: (id: string) => void;
  bulkUpdateRates: (newRates: FreightRate[]) => void;

  // Users
  users: UserAccount[];
  addUser: (user: UserAccount) => void;
  updateUser: (id: string, updated: Partial<UserAccount>) => void;
  deleteUser: (id: string) => void;



  // Blogs
  blogs: Blog[];
  addBlog: (blog: Blog) => void;
  updateBlog: (id: string, updated: Partial<Blog>) => void;
  deleteBlog: (id: string) => void;

  // Audit Logs
  auditLogs: AuditLog[];
  addAuditLog: (action: string) => void;
  clearAuditLogs: () => void;

  // Auth
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  sessionActive: boolean;
  login: (email: string, user: CurrentUser, token: string) => void;
  logout: () => void;

  // App Settings
  appSettings: AppSettings;
  updateAppSettings: (updated: Partial<AppSettings>) => void;

  // Toast
  toasts: ToastMessage[];
  showToast: (message: string, type: ToastType) => void;
  dismissToast: (id: string) => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Global Initial loading state
  isLoading: boolean;

  // Hero Slides
  heroSlides: HeroSlide[];
  addHeroSlide: (slide: Omit<HeroSlide, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateHeroSlide: (id: string, updated: Partial<HeroSlide>) => Promise<void>;
  deleteHeroSlide: (id: string) => Promise<void>;

  // Partners
  partners: Partner[];
  addPartner: (partner: Omit<Partner, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePartner: (id: string, updated: Partial<Partner>) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;

  // Statistics
  statistics: Statistic[];
  addStatistic: (stat: Omit<Statistic, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateStatistic: (id: string, updated: Partial<Statistic>) => Promise<void>;
  deleteStatistic: (id: string) => Promise<void>;

  // Industries
  industries: Industry[];
  addIndustry: (ind: Omit<Industry, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateIndustry: (id: string, updated: Partial<Industry>) => Promise<void>;
  deleteIndustry: (id: string) => Promise<void>;

  // Media Library
  media: any[];
  addMedia: (fileName: string, fileUrl: string, fileType: string, fileSize: string) => Promise<any>;
  deleteMedia: (id: string) => Promise<void>;
  replaceMedia: (id: string, fileName: string, fileUrl: string, fileType: string, fileSize: string) => Promise<any>;

  // Rate History
  rateHistory: any[];
  loadRateHistory: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [cms, setCms] = useState<CMSData>(defaultCMSData);
  const [isLoading, setIsLoading] = useState(true);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(defaultHeroSlides);
  const [partners, setPartners] = useState<Partner[]>(defaultPartners);
  const [statistics, setStatistics] = useState<Statistic[]>(defaultStatistics);
  const [industries, setIndustries] = useState<Industry[]>(defaultIndustries);
  const [enquiries, setEnquiries] = useState<Enquiry[]>(defaultEnquiries);
  const [rates, setRates] = useState<FreightRate[]>(defaultRates);
  const [users, setUsers] = useState<UserAccount[]>(defaultUsers);
  const [blogs, setBlogs] = useState<Blog[]>(defaultBlogs);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(defaultAuditLogs);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [media, setMedia] = useState<any[]>([]);
  const [rateHistory, setRateHistory] = useState<any[]>([]);

  // Hydrate from API on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [cmsData, enqs, rts, usrs, blgs, logs, settings, mediaList, historyList] = await Promise.all([
          CMSService.getHomepage(),
          EnquiryService.getList(),
          RateService.getList(),
          UserService.getList(),
          BlogService.getList(),
          AuditLogService.getList(),
          SettingsService.get(),
          MediaService.getList().catch(() => []),
          RateService.getHistory().catch(() => []),
        ]);

        setCms(cmsData);
        setEnquiries(enqs);
        setRates(rts);
        setUsers(usrs);
        setBlogs(blgs);
        setAuditLogs(logs);
        setAppSettings(settings);
        setMedia(mediaList);
        setRateHistory(historyList);
      } catch (err) {
        console.error('Failed to load data from API:', err);
      }

      // Hero slides are fetched separately from the local Next.js API
      // so a failure here never blocks the rest of the admin panel from loading
      try {
        const slides = await HeroSlidesService.getAdminList();
        if (Array.isArray(slides)) setHeroSlides(slides);
      } catch (err) {
        console.warn('Hero slides not loaded from local API, using defaults:', err);
        // defaultHeroSlides is already set as initial state — no action needed
      }

      // Partners and Statistics are also fetched from local API
      try {
        const [partnersData, statisticsData, industriesData] = await Promise.all([
          fetch('/api/admin/cms/partners').then(r => r.json()),
          fetch('/api/admin/cms/statistics').then(r => r.json()),
          fetch('/api/admin/cms/industries').then(r => r.json()),
        ]);
        if (Array.isArray(partnersData)) setPartners(partnersData);
        if (Array.isArray(statisticsData)) setStatistics(statisticsData);
        if (Array.isArray(industriesData)) setIndustries(industriesData);
      } catch (err) {
        console.warn('Partners/Statistics/Industries not loaded from local API, using defaults:', err);
      }

      setIsLoading(false);
    }

    const storedTheme = loadFromStorage<'light' | 'dark'>('easyfr8_theme', 'light');
    setTheme(storedTheme);
    document.documentElement.setAttribute('data-theme', storedTheme);

    const token = typeof window !== 'undefined' ? localStorage.getItem('easyfr8_token') : null;
    if (token) {
      AuthService.getProfile()
        .then(profile => {
          setCurrentUser(profile);
          setSessionActive(true);
          loadData();
        })
        .catch(() => {
          logout();
          setIsLoading(false);
        });
    } else {
      loadData();
    }
  }, []);

  // ── CMS ──────────────────────────────────────────────────────────────────────
  const updateCMS = (updated: CMSData) => {
    setCms(updated);
    CMSService.updateCMSData(updated).catch(e => {
      console.error(e);
      showToast('Failed to save CMS changes to server', 'danger');
    });
  };

  // ── Enquiries ─────────────────────────────────────────────────────────────────
  const addEnquiry = (enq: Omit<Enquiry, 'id' | 'date'>) => {
    EnquiryService.create(enq)
      .then(newEnq => {
        setEnquiries(prev => [newEnq, ...prev]);
        showToast('Enquiry saved to server', 'success');
      })
      .catch(e => {
        console.error(e);
        showToast('Failed to save enquiry to server', 'danger');
      });
  };

  const updateEnquiry = (id: string, data: Partial<Enquiry>) => {
    const updated = enquiries.map((e) => (e.id === id ? { ...e, ...data } : e));
    setEnquiries(updated);
    EnquiryService.update(id, data).catch(e => {
      console.error(e);
      showToast('Failed to update enquiry status', 'danger');
    });
  };

  const deleteEnquiry = (id: string) => {
    const updated = enquiries.filter((e) => e.id !== id);
    setEnquiries(updated);
    EnquiryService.delete(id).catch(e => {
      console.error(e);
      showToast('Failed to delete enquiry from server', 'danger');
    });
  };

  const bulkDeleteEnquiries = (ids: string[]) => {
    const updated = enquiries.filter((e) => !ids.includes(e.id));
    setEnquiries(updated);
    Promise.all(ids.map(id => EnquiryService.delete(id))).catch(e => {
      console.error(e);
      showToast('Failed to bulk delete enquiries', 'danger');
    });
  };

  const bulkUpdateEnquiryStatus = (ids: string[], status: Enquiry['status']) => {
    const updated = enquiries.map((e) => (ids.includes(e.id) ? { ...e, status } : e));
    setEnquiries(updated);
    Promise.all(ids.map(id => EnquiryService.update(id, { status }))).catch(e => {
      console.error(e);
      showToast('Failed to bulk update enquiry status', 'danger');
    });
  };

  // ── Rates ─────────────────────────────────────────────────────────────────────
  const addRate = (rate: FreightRate) => {
    const updated = [rate, ...rates];
    setRates(updated);
    RateService.create(rate).catch(e => {
      console.error(e);
      showToast('Failed to save freight rate route', 'danger');
    });
  };

  const updateRate = (id: string, data: Partial<FreightRate>) => {
    const updated = rates.map((r) => (r.id === id ? { ...r, ...data } : r));
    setRates(updated);
    RateService.update(id, data).catch(e => {
      console.error(e);
      showToast('Failed to update rate details', 'danger');
    });
  };

  const deleteRate = (id: string) => {
    const updated = rates.filter((r) => r.id !== id);
    setRates(updated);
    RateService.delete(id).catch(e => {
      console.error(e);
      showToast('Failed to delete rate', 'danger');
    });
  };

  const bulkUpdateRates = (newRates: FreightRate[]) => {
    setRates(newRates);
    RateService.bulkUpload(newRates).catch(e => {
      console.error(e);
      showToast('Failed to upload rates to server', 'danger');
    });
  };

  // ── Users ─────────────────────────────────────────────────────────────────────
  const addUser = (user: UserAccount) => {
    const updated = [...users, user];
    setUsers(updated);
    UserService.create(user).catch(e => {
      console.error(e);
      showToast('Failed to save user to server', 'danger');
    });
  };

  const updateUser = (id: string, data: Partial<UserAccount>) => {
    const updated = users.map((u) => (u.id === id ? { ...u, ...data } : u));
    setUsers(updated);
    UserService.update(id, data).catch(e => {
      console.error(e);
      showToast('Failed to update user', 'danger');
    });
  };

  const deleteUser = (id: string) => {
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    UserService.delete(id).catch(e => {
      console.error(e);
      showToast('Failed to delete user', 'danger');
    });
  };



  // ── Blogs ─────────────────────────────────────────────────────────────────────
  const addBlog = (blog: Blog) => {
    const updated = [blog, ...blogs];
    setBlogs(updated);
    BlogService.create(blog).catch(e => {
      console.error(e);
      showToast('Failed to publish blog article to server', 'danger');
    });
  };

  const updateBlog = (id: string, data: Partial<Blog>) => {
    const updated = blogs.map((b) => (b.id === id ? { ...b, ...data } : b));
    setBlogs(updated);
    BlogService.update(id, data).catch(e => {
      console.error(e);
      showToast('Failed to update blog article', 'danger');
    });
  };

  const deleteBlog = (id: string) => {
    const updated = blogs.filter((b) => b.id !== id);
    setBlogs(updated);
    BlogService.delete(id).catch(e => {
      console.error(e);
      showToast('Failed to delete blog article', 'danger');
    });
  };

  // ── Audit Logs ────────────────────────────────────────────────────────────────
  const addAuditLog = (action: string) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      user: currentUser?.email ?? 'system',
      action,
      timestamp: new Date().toLocaleString('en-IN'),
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    saveToStorage('easyfr8_auditLogs', updated);
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
    AuditLogService.clear().catch(e => {
      console.error(e);
      showToast('Failed to clear logs', 'danger');
    });
  };

  // ── Auth ──────────────────────────────────────────────────────────────────────
  const login = (email: string, user: CurrentUser, token: string) => {
    setCurrentUser(user);
    setSessionActive(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('easyfr8_token', token);
    }
    saveToStorage('easyfr8_currentUser', user);
    saveToStorage('easyfr8_sessionEmail', email);
  };

  const logout = () => {
    setCurrentUser(null);
    setSessionActive(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('easyfr8_token');
      localStorage.removeItem('easyfr8_currentUser');
      localStorage.removeItem('easyfr8_sessionEmail');
    }
  };

  // ── Hero Slides Mutations ──────────────────────────────────────────────────
  const addHeroSlide = async (slide: Omit<HeroSlide, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newSlide = await HeroSlidesService.create(slide);
      setHeroSlides((prev) => [...prev, newSlide]);
      showToast('Hero slide created successfully', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to create hero slide', 'danger');
      throw e;
    }
  };

  const updateHeroSlide = async (id: string, updated: Partial<HeroSlide>) => {
    try {
      const updatedSlide = await HeroSlidesService.update(id, updated);
      setHeroSlides((prev) =>
        prev.map((s) => (s.id === id ? updatedSlide : s))
      );
      showToast('Hero slide updated successfully', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to update hero slide', 'danger');
      throw e;
    }
  };

  const deleteHeroSlide = async (id: string) => {
    try {
      await HeroSlidesService.delete(id);
      setHeroSlides((prev) => prev.filter((s) => s.id !== id));
      showToast('Hero slide deleted successfully', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete hero slide', 'danger');
      throw e;
    }
  };

  // ── Partners Mutations ────────────────────────────────────────────────────
  const addPartner = async (partner: Omit<Partner, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/admin/cms/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partner),
      });
      const newPartner: Partner = await res.json();
      setPartners((prev) => [...prev, newPartner]);
      showToast('Partner added successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to add partner', 'danger');
      throw e;
    }
  };

  const updatePartner = async (id: string, updated: Partial<Partner>) => {
    try {
      const res = await fetch(`/api/admin/cms/partners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const updatedPartner: Partner = await res.json();
      setPartners((prev) => prev.map((p) => (p.id === id ? updatedPartner : p)));
      showToast('Partner updated successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update partner', 'danger');
      throw e;
    }
  };

  const deletePartner = async (id: string) => {
    try {
      await fetch(`/api/admin/cms/partners/${id}`, { method: 'DELETE' });
      setPartners((prev) => prev.filter((p) => p.id !== id));
      showToast('Partner deleted successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to delete partner', 'danger');
      throw e;
    }
  };

  // ── Statistics Mutations ──────────────────────────────────────────────────
  const addStatistic = async (stat: Omit<Statistic, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/admin/cms/statistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stat),
      });
      const newStat: Statistic = await res.json();
      setStatistics((prev) => [...prev, newStat]);
      showToast('Statistic added successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to add statistic', 'danger');
      throw e;
    }
  };

  const updateStatistic = async (id: string, updated: Partial<Statistic>) => {
    try {
      const res = await fetch(`/api/admin/cms/statistics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const updatedStat: Statistic = await res.json();
      setStatistics((prev) => prev.map((s) => (s.id === id ? updatedStat : s)));
      showToast('Statistic updated successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update statistic', 'danger');
      throw e;
    }
  };

  const deleteStatistic = async (id: string) => {
    try {
      await fetch(`/api/admin/cms/statistics/${id}`, { method: 'DELETE' });
      setStatistics((prev) => prev.filter((s) => s.id !== id));
      showToast('Statistic deleted successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to delete statistic', 'danger');
      throw e;
    }
  };

  // ── Industries ────────────────────────────────────────────────────────────────
  const addIndustry = async (ind: Omit<Industry, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/admin/cms/industries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ind),
      });
      const newInd: Industry = await res.json();
      setIndustries((prev) => [...prev, newInd]);
      showToast('Industry added successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to add industry', 'danger');
      throw e;
    }
  };

  const updateIndustry = async (id: string, updated: Partial<Industry>) => {
    try {
      const res = await fetch(`/api/admin/cms/industries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const updatedInd: Industry = await res.json();
      setIndustries((prev) => prev.map((i) => (i.id === id ? updatedInd : i)));
      showToast('Industry updated successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update industry', 'danger');
      throw e;
    }
  };

  const deleteIndustry = async (id: string) => {
    try {
      await fetch(`/api/admin/cms/industries/${id}`, { method: 'DELETE' });
      setIndustries((prev) => prev.filter((i) => i.id !== id));
      showToast('Industry deleted successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to delete industry', 'danger');
      throw e;
    }
  };

  // ── App Settings ──────────────────────────────────────────────────────────────
  const updateAppSettings = (partial: Partial<AppSettings>) => {
    const updated = { ...appSettings, ...partial };
    setAppSettings(updated);
    
    // Save sections asynchronously
    Object.entries(partial).forEach(([section, data]) => {
      SettingsService.update(section as keyof AppSettings, data as any).catch(e => {
        console.error(e);
        showToast(`Failed to update ${section} settings on server`, 'danger');
      });
    });
  };

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const showToast = (message: string, type: ToastType) => {
    const id = `toast-${Date.now()}`;
    const toast: ToastMessage = { id, message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Theme ─────────────────────────────────────────────────────────────────────
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    saveToStorage('easyfr8_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const addMedia = async (fileName: string, fileUrl: string, fileType: string, fileSize: string) => {
    try {
      const response = await MediaService.upload({
        fileName,
        fileUrl,
        fileType,
        fileSize,
        userEmail: currentUser?.email || undefined,
        userName: currentUser?.name || undefined
      });
      if (response.success) {
        setMedia(prev => [response.media, ...prev]);
        showToast('File uploaded successfully', 'success');
        addAuditLog(`Uploaded media file: ${fileName}`);
        return response.media;
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to upload file', 'danger');
      throw e;
    }
  };

  const deleteMedia = async (id: string) => {
    try {
      const response = await MediaService.delete(id, {
        userEmail: currentUser?.email || 'admin',
        userName: currentUser?.name || 'Administrator'
      });
      if (response.success) {
        setMedia(prev => prev.filter(m => m.id !== id));
        showToast('File deleted successfully', 'success');
        addAuditLog(`Deleted media file with ID: ${id}`);
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to delete file', 'danger');
      throw e;
    }
  };

  const replaceMedia = async (id: string, fileName: string, fileUrl: string, fileType: string, fileSize: string) => {
    try {
      const response = await MediaService.replace(id, {
        fileName,
        fileUrl,
        fileType,
        fileSize,
        userEmail: currentUser?.email || undefined,
        userName: currentUser?.name || undefined
      });
      if (response.success) {
        setMedia(prev => prev.map(m => m.id === id ? response.media : m));
        showToast('File replaced successfully', 'success');
        addAuditLog(`Replaced media file: ${fileName}`);
        return response.media;
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to replace file', 'danger');
      throw e;
    }
  };

  const loadRateHistory = async () => {
    try {
      const list = await RateService.getHistory();
      if (Array.isArray(list)) setRateHistory(list);
    } catch (e) {
      console.error('Failed to load rate activity history:', e);
    }
  };

  return (
    <DataContext.Provider
      value={{
        cms, updateCMS,
        enquiries, addEnquiry, updateEnquiry, deleteEnquiry, bulkDeleteEnquiries, bulkUpdateEnquiryStatus,
        rates, addRate, updateRate, deleteRate, bulkUpdateRates,
        users, addUser, updateUser, deleteUser,
        blogs, addBlog, updateBlog, deleteBlog,
        auditLogs, addAuditLog, clearAuditLogs,
        currentUser, setCurrentUser, sessionActive, login, logout,
        appSettings, updateAppSettings,
        toasts, showToast, dismissToast,
        theme, toggleTheme,
        isLoading,
        heroSlides, addHeroSlide, updateHeroSlide, deleteHeroSlide,
        partners, addPartner, updatePartner, deletePartner,
        statistics, addStatistic, updateStatistic, deleteStatistic,
        industries, addIndustry, updateIndustry, deleteIndustry,
        media, addMedia, deleteMedia, replaceMedia,
        rateHistory, loadRateHistory,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
