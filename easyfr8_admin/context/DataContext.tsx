'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
  Service,
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
  PartnersService,
  StatisticsService,
  IndustriesService,
  MediaService,
  ServicesService,
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
  updateCMS: (updated: CMSData) => Promise<void>;
  updateCMSStateOnly: (updated: CMSData) => void;
  addService: (service: Partial<Service>) => Promise<Service>;
  updateService: (id: string | number, updated: Partial<Service>) => Promise<Service>;
  deleteService: (id: string | number) => Promise<void>;

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
  loadMedia: () => Promise<void>;
  addMedia: (fileName: string, fileUrl: string, fileType: string, fileSize: string) => Promise<any>;
  deleteMedia: (id: string) => Promise<void>;
  replaceMedia: (id: string, fileName: string, fileUrl: string, fileType: string, fileSize: string) => Promise<any>;

  // Rate History
  rateHistory: any[];
  loadRateHistory: () => Promise<void>;

  // Data Refresh
  refreshData: () => Promise<void>;
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
  const loadDataPromiseRef = useRef<Promise<void> | null>(null);

  const loadData = useCallback(() => {
    if (loadDataPromiseRef.current) {
      return loadDataPromiseRef.current;
    }

    loadDataPromiseRef.current = (async () => {
      try {
        const [
          cmsData,
          enqs,
          rts,
          usrs,
          blgs,
          logs,
          settings,
          historyList,
          slides,
          partnersData,
          statisticsData,
          industriesData,
        ] = await Promise.all([
          CMSService.getHomepage().catch(err => {
            console.error('Failed to load CMS homepage:', err);
            return defaultCMSData;
          }),
          EnquiryService.getList().catch(err => {
            console.error('Failed to load enquiries:', err);
            return defaultEnquiries;
          }),
          RateService.getList().catch(err => {
            console.error('Failed to load rates:', err);
            return defaultRates;
          }),
          UserService.getList().catch(err => {
            console.error('Failed to load users:', err);
            return defaultUsers;
          }),
          BlogService.getList().catch(err => {
            console.error('Failed to load blogs:', err);
            return defaultBlogs;
          }),
          AuditLogService.getList().catch(err => {
            console.error('Failed to load audit logs:', err);
            return defaultAuditLogs;
          }),
          SettingsService.get().catch(err => {
            console.error('Failed to load settings:', err);
            return defaultAppSettings;
          }),
          RateService.getHistory().catch(() => []),
          HeroSlidesService.getAdminList().catch(err => {
            console.warn('Hero slides not loaded from local API, using defaults:', err);
            return defaultHeroSlides;
          }),
          PartnersService.getAdminList().catch(err => {
            console.warn('Partners not loaded from local API, using defaults:', err);
            return defaultPartners;
          }),
          StatisticsService.getAdminList().catch(err => {
            console.warn('Statistics not loaded from local API, using defaults:', err);
            return defaultStatistics;
          }),
          IndustriesService.getAdminList().catch(err => {
            console.warn('Industries not loaded from local API, using defaults:', err);
            return defaultIndustries;
          }),
        ]);

        if (cmsData) setCms(cmsData);
        if (enqs) setEnquiries(enqs);
        if (rts) setRates(rts);
        if (usrs) setUsers(usrs);
        if (blgs) setBlogs(blgs);
        if (logs) setAuditLogs(logs);
        if (settings) setAppSettings(settings);
        if (historyList) setRateHistory(historyList);
        if (Array.isArray(slides)) setHeroSlides(slides);
        if (Array.isArray(partnersData)) setPartners(partnersData);
        if (Array.isArray(statisticsData)) setStatistics(statisticsData);
        if (Array.isArray(industriesData)) setIndustries(industriesData);
      } finally {
        setIsLoading(false);
        loadDataPromiseRef.current = null;
      }
    })();

    return loadDataPromiseRef.current;
  }, []);

  // Hydrate from API on mount
  useEffect(() => {
    const storedTheme = loadFromStorage<'light' | 'dark'>('easyfr8_theme', 'light');
    setTheme(storedTheme);
    document.documentElement.setAttribute('data-theme', storedTheme);

    const token = typeof window !== 'undefined' ? localStorage.getItem('easyfr8_token') : null;
    const storedUser = loadFromStorage<CurrentUser | null>('easyfr8_currentUser', null);

    if (token) {
      if (storedUser) {
        setCurrentUser(storedUser);
      }
      AuthService.getProfile()
        .then((profile) => {
          setCurrentUser(profile);
          setSessionActive(true);
          saveToStorage('easyfr8_currentUser', profile);
          loadData();
        })
        .catch((err) => {
          console.warn('Session verification failed, resetting auth state:', err?.message || err);
          logout();
          setIsLoading(false);
        });
    } else {
      // Unauthenticated visitor: do not fetch protected admin routes
      setIsLoading(false);
      CMSService.getHomepage()
        .then((cmsData) => {
          if (cmsData) setCms(cmsData);
        })
        .catch(() => {});
    }
  }, [loadData]);

  // ── CMS ──────────────────────────────────────────────────────────────────────
  const updateCMS = async (updated: CMSData): Promise<void> => {
    setCms(updated);
    try {
      const fresh = await CMSService.updateCMSData(updated);
      if (fresh) {
        setCms(fresh);
      }
    } catch (e: any) {
      console.error('[DataContext updateCMS error]', e);
      showToast(e.message || 'Failed to save CMS changes to server', 'danger');
      throw e;
    }
  };

  const updateCMSStateOnly = (updated: CMSData) => {
    setCms(updated);
  };

  // ── Services Mutations ──────────────────────────────────────────────────────
  const addService = async (service: Partial<Service>): Promise<Service> => {
    try {
      const newService = await ServicesService.create(service);
      setCms((prev) => {
        const list = [...(prev.services || []), newService];
        list.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
        return { ...prev, services: list };
      });
      return newService;
    } catch (e: any) {
      throw e;
    }
  };

  const updateService = async (id: string | number, updated: Partial<Service>): Promise<Service> => {
    try {
      const updatedService = await ServicesService.update(id, updated);
      setCms((prev) => {
        const list = (prev.services || []).map((s) => (String(s.id) === String(id) ? updatedService : s));
        list.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
        return { ...prev, services: list };
      });
      return updatedService;
    } catch (e: any) {
      throw e;
    }
  };

  const deleteService = async (id: string | number): Promise<void> => {
    try {
      await ServicesService.delete(id);
      setCms((prev) => ({
        ...prev,
        services: (prev.services || []).filter((s) => String(s.id) !== String(id)),
      }));
    } catch (e: any) {
      throw e;
    }
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

  const deleteRate = async (id: string) => {
    try {
      await RateService.delete(id);
      const updated = rates.filter((r) => r.id !== id);
      setRates(updated);
      showToast('Rate deleted successfully', 'warning');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete rate', 'danger');
    }
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

  const deleteUser = async (id: string) => {
    try {
      await UserService.delete(id);
      const updated = users.filter((u) => u.id !== id);
      setUsers(updated);
      showToast('User account record cleared.', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete user account.', 'danger');
      throw e;
    }
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

  const deleteBlog = async (id: string) => {
    try {
      await BlogService.delete(id);
      const updated = blogs.filter((b) => b.id !== id);
      setBlogs(updated);
      showToast('Blog post deleted.', 'warning');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete blog article', 'danger');
    }
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
    // Immediately load all protected data using the new credentials
    loadData();
  };

  const logout = () => {
    // Notify server to clear HTTP-only easyfr8_token cookie
    AuthService.logout().catch(() => {});
    setCurrentUser(null);
    setSessionActive(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('easyfr8_token');
      localStorage.removeItem('easyfr8_currentUser');
      localStorage.removeItem('easyfr8_sessionEmail');
    }
    // Cleanly reset protected datasets to default states
    setUsers(defaultUsers);
    setAuditLogs(defaultAuditLogs);
    setEnquiries(defaultEnquiries);
    setRates(defaultRates);
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
      const newPartner = await PartnersService.create(partner);
      setPartners((prev) => [...prev, newPartner]);
      showToast('Partner added successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to add partner', 'danger');
      throw e;
    }
  };

  const updatePartner = async (id: string, updated: Partial<Partner>) => {
    try {
      const updatedPartner = await PartnersService.update(id, updated);
      setPartners((prev) => prev.map((p) => (p.id === id ? updatedPartner : p)));
      showToast('Partner updated successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update partner', 'danger');
      throw e;
    }
  };

  const deletePartner = async (id: string) => {
    try {
      await PartnersService.delete(id);
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
      const newStat = await StatisticsService.create(stat);
      setStatistics((prev) => [...prev, newStat]);
      showToast('Statistic added successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to add statistic', 'danger');
      throw e;
    }
  };

  const updateStatistic = async (id: string, updated: Partial<Statistic>) => {
    try {
      const updatedStat = await StatisticsService.update(id, updated);
      setStatistics((prev) => prev.map((s) => (s.id === id ? updatedStat : s)));
      showToast('Statistic updated successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update statistic', 'danger');
      throw e;
    }
  };

  const deleteStatistic = async (id: string) => {
    try {
      await StatisticsService.delete(id);
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
      const newInd = await IndustriesService.create(ind);
      setIndustries((prev) => [...prev, newInd]);
      showToast('Industry added successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to add industry', 'danger');
      throw e;
    }
  };

  const updateIndustry = async (id: string, updated: Partial<Industry>) => {
    try {
      const updatedInd = await IndustriesService.update(id, updated);
      setIndustries((prev) => prev.map((i) => (i.id === id ? updatedInd : i)));
      showToast('Industry updated successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update industry', 'danger');
      throw e;
    }
  };

  const deleteIndustry = async (id: string) => {
    try {
      await IndustriesService.delete(id);
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

  const loadMedia = async () => {
    try {
      const list = await MediaService.getList();
      if (Array.isArray(list)) setMedia(list);
    } catch (e) {
      console.error('Failed to load media list:', e);
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
        cms, updateCMS, updateCMSStateOnly,
        addService, updateService, deleteService,
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
        media, loadMedia, addMedia, deleteMedia, replaceMedia,
        rateHistory, loadRateHistory,
        refreshData: loadData,
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
