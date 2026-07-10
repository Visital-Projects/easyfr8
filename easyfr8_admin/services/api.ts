import api from './axios';
import axios from 'axios';
import { API_ENDPOINTS } from './endpoints';
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
  defaultAppSettings,
  HeroSlide,
} from '../lib/store';

// All frontend operations run in mock mode — the store acts as the source of truth.
const isMockMode = () => false;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const AuthService = {
  login: async (credentials: { email: string; password?: string }): Promise<{ token: string; user: CurrentUser }> => {
    if (isMockMode()) {
      return {
        token: 'mock_jwt_token_payload_xyz',
        user: {
          name: credentials.email.toLowerCase().includes('biswa') ? 'Biswajit Shaw' : 'Anish Kumar',
          email: credentials.email,
          role: credentials.email.toLowerCase().includes('biswa') ? 'Administrator' : 'Manager',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150',
        },
      };
    }
    return api.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
  },

  logout: async (): Promise<void> => {
    if (isMockMode()) return;
    return api.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  register: async (data: Record<string, unknown>): Promise<{ success: boolean }> => {
    if (isMockMode()) return { success: true };
    return api.post(API_ENDPOINTS.AUTH.REGISTER, data);
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    if (isMockMode()) return { success: true, message: 'Reset email sent.' };
    return api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  },

  resetPassword: async (data: Record<string, unknown>): Promise<{ success: boolean }> => {
    if (isMockMode()) return { success: true };
    return api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, data);
  },

  refreshToken: async (): Promise<{ token: string }> => {
    if (isMockMode()) return { token: 'mock_jwt_refreshed_token' };
    return api.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN);
  },

  getProfile: async (): Promise<CurrentUser> => {
    if (isMockMode()) {
      return {
        name: 'Biswajit Shaw',
        email: 'biswa@easyfr8.com',
        role: 'Administrator',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150',
      };
    }
    return api.get(API_ENDPOINTS.AUTH.PROFILE);
  },

  changePassword: async (data: { oldPassword: string; newPassword: string; confirmPassword?: string }): Promise<{ success: boolean; message: string }> => {
    if (isMockMode()) return { success: true, message: 'Password updated successfully' };
    // Backend expects 'currentPassword' instead of 'oldPassword'
    return api.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      currentPassword: data.oldPassword,
      newPassword: data.newPassword,
    });
  },

  updateProfile: async (data: { name: string; email: string; avatar?: string; phone?: string }): Promise<{ success: boolean; user: CurrentUser }> => {
    if (isMockMode()) {
      return {
        success: true,
        user: {
          name: data.name,
          email: data.email,
          role: 'Administrator',
          avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150',
        }
      };
    }
    return api.put(API_ENDPOINTS.AUTH.PROFILE, data);
  },
};

// ── CMS ───────────────────────────────────────────────────────────────────────
export const CMSService = {
  getHomepage: async (): Promise<CMSData> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_cms');
      return stored ? JSON.parse(stored) : defaultCMSData;
    }
    return api.get(API_ENDPOINTS.CMS.HOMEPAGE);
  },

  updateCMSData: async (data: CMSData): Promise<CMSData> => {
    if (isMockMode()) {
      localStorage.setItem('easyfr8_cms', JSON.stringify(data));
      return data;
    }
    return api.post(API_ENDPOINTS.CMS.HOMEPAGE, data);
  },
};

// ── Enquiries ─────────────────────────────────────────────────────────────────
export const EnquiryService = {
  getList: async (): Promise<Enquiry[]> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_enquiries');
      return stored ? JSON.parse(stored) : [];
    }
    return api.get(API_ENDPOINTS.ENQUIRIES.LIST);
  },

  create: async (data: Omit<Enquiry, 'id' | 'date'>): Promise<Enquiry> => {
    if (isMockMode()) {
      const newEnq: Enquiry = {
        ...data,
        id: `ENQ-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
      };
      return newEnq;
    }
    return api.post(API_ENDPOINTS.ENQUIRIES.LIST, data);
  },

  update: async (id: string, data: Partial<Enquiry>): Promise<Enquiry> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_enquiries');
      if (stored) {
        const enqs = JSON.parse(stored) as Enquiry[];
        const idx = enqs.findIndex((e) => e.id === id);
        if (idx !== -1) {
          enqs[idx] = { ...enqs[idx], ...data };
          localStorage.setItem('easyfr8_enquiries', JSON.stringify(enqs));
          return enqs[idx];
        }
      }
      throw new Error('Enquiry not found');
    }
    return api.put(API_ENDPOINTS.ENQUIRIES.UPDATE(id), data);
  },

  delete: async (id: string): Promise<void> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_enquiries');
      if (stored) {
        const enqs = JSON.parse(stored) as Enquiry[];
        localStorage.setItem('easyfr8_enquiries', JSON.stringify(enqs.filter((e) => e.id !== id)));
      }
      return;
    }
    return api.delete(API_ENDPOINTS.ENQUIRIES.DELETE(id));
  },

  exportCsv: async (rows: Enquiry[]): Promise<Enquiry[]> => {
    if (isMockMode()) return rows;
    return api.get(`${API_ENDPOINTS.ENQUIRIES.LIST}/export`);
  },

  importCsv: async (rows: Partial<Enquiry>[]): Promise<{ imported: number }> => {
    if (isMockMode()) return { imported: rows.length };
    return api.post(`${API_ENDPOINTS.ENQUIRIES.LIST}/import`, { rows });
  },
};

// ── Rates ─────────────────────────────────────────────────────────────────────
export const RateService = {
  getList: async (): Promise<FreightRate[]> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_rates');
      return stored ? JSON.parse(stored) : [];
    }
    return api.get(API_ENDPOINTS.RATES.LIST);
  },

  create: async (rate: FreightRate): Promise<FreightRate> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_rates');
      const rates = stored ? (JSON.parse(stored) as FreightRate[]) : [];
      rates.unshift(rate);
      localStorage.setItem('easyfr8_rates', JSON.stringify(rates));
      return rate;
    }
    return api.post(API_ENDPOINTS.RATES.CREATE, rate);
  },

  update: async (id: string, data: Partial<FreightRate>): Promise<FreightRate> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_rates');
      if (stored) {
        const rates = JSON.parse(stored) as FreightRate[];
        const idx = rates.findIndex((r) => r.id === id);
        if (idx !== -1) {
          rates[idx] = { ...rates[idx], ...data };
          localStorage.setItem('easyfr8_rates', JSON.stringify(rates));
          return rates[idx];
        }
      }
      throw new Error('Rate not found');
    }
    return api.put(API_ENDPOINTS.RATES.UPDATE(id), data);
  },

  delete: async (id: string): Promise<void> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_rates');
      if (stored) {
        const rates = JSON.parse(stored) as FreightRate[];
        localStorage.setItem('easyfr8_rates', JSON.stringify(rates.filter((r) => r.id !== id)));
      }
      return;
    }
    return api.delete(API_ENDPOINTS.RATES.DELETE(id));
  },

  getHistory: async (): Promise<any[]> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_rates_history') || '[]';
      return JSON.parse(stored);
    }
    return api.get(API_ENDPOINTS.RATES.HISTORY);
  },

  bulkUpload: async (newRates: FreightRate[]): Promise<FreightRate[]> => {
    if (isMockMode()) {
      localStorage.setItem('easyfr8_rates', JSON.stringify(newRates));
      return newRates;
    }
    return api.post(API_ENDPOINTS.RATES.BULK_UPLOAD, { rates: newRates });
  },

  exportCsv: async (rows: FreightRate[]): Promise<FreightRate[]> => {
    if (isMockMode()) return rows;
    return api.get(`${API_ENDPOINTS.RATES.LIST}/export`);
  },
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const UserService = {
  getList: async (): Promise<UserAccount[]> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_users');
      return stored ? JSON.parse(stored) : [];
    }
    return api.get(API_ENDPOINTS.USERS.LIST);
  },

  create: async (user: UserAccount): Promise<UserAccount> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_users');
      const users = stored ? (JSON.parse(stored) as UserAccount[]) : [];
      users.push(user);
      localStorage.setItem('easyfr8_users', JSON.stringify(users));
      return user;
    }
    return api.post(API_ENDPOINTS.USERS.CREATE, user);
  },

  update: async (id: string, data: Partial<UserAccount>): Promise<UserAccount> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_users');
      if (stored) {
        const users = JSON.parse(stored) as UserAccount[];
        const idx = users.findIndex((u) => u.id === id);
        if (idx !== -1) {
          users[idx] = { ...users[idx], ...data };
          localStorage.setItem('easyfr8_users', JSON.stringify(users));
          return users[idx];
        }
      }
      throw new Error('User not found');
    }
    return api.put(API_ENDPOINTS.USERS.UPDATE(id), data);
  },

  delete: async (id: string): Promise<void> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_users');
      if (stored) {
        const users = JSON.parse(stored) as UserAccount[];
        localStorage.setItem('easyfr8_users', JSON.stringify(users.filter((u) => u.id !== id)));
      }
      return;
    }
    return api.delete(API_ENDPOINTS.USERS.DELETE(id));
  },

  resetPassword: async (id: string): Promise<{ success: boolean }> => {
    if (isMockMode()) return { success: true };
    return api.post(`${API_ENDPOINTS.USERS.LIST}/${id}/reset-password`);
  },

  exportCsv: async (rows: UserAccount[]): Promise<UserAccount[]> => {
    if (isMockMode()) return rows;
    return api.get(`${API_ENDPOINTS.USERS.LIST}/export`);
  },
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const DocumentService = {
  getList: async (): Promise<KYCDocument[]> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_documents');
      return stored ? JSON.parse(stored) : [];
    }
    return api.get(API_ENDPOINTS.DOCUMENTS.LIST);
  },

  update: async (id: string, data: Partial<KYCDocument>): Promise<KYCDocument> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_documents');
      if (stored) {
        const docs = JSON.parse(stored) as KYCDocument[];
        const idx = docs.findIndex((d) => d.id === id);
        if (idx !== -1) {
          docs[idx] = { ...docs[idx], ...data };
          localStorage.setItem('easyfr8_documents', JSON.stringify(docs));
          return docs[idx];
        }
      }
      throw new Error('Document not found');
    }
    return api.put(API_ENDPOINTS.DOCUMENTS.UPDATE(id), data);
  },

  create: async (doc: KYCDocument): Promise<KYCDocument> => {
    if (isMockMode()) return doc;
    return api.post(API_ENDPOINTS.DOCUMENTS.LIST, doc);
  },
};

// ── Blogs ─────────────────────────────────────────────────────────────────────
export const BlogService = {
  getList: async (): Promise<Blog[]> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_blogs');
      return stored ? JSON.parse(stored) : [];
    }
    return api.get(API_ENDPOINTS.BLOGS.LIST);
  },

  create: async (blog: Blog): Promise<Blog> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_blogs');
      const blogs = stored ? (JSON.parse(stored) as Blog[]) : [];
      blogs.unshift(blog);
      localStorage.setItem('easyfr8_blogs', JSON.stringify(blogs));
      return blog;
    }
    return api.post(API_ENDPOINTS.BLOGS.CREATE, blog);
  },

  update: async (id: string, data: Partial<Blog>): Promise<Blog> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_blogs');
      if (stored) {
        const blogs = JSON.parse(stored) as Blog[];
        const idx = blogs.findIndex((b) => b.id === id);
        if (idx !== -1) {
          blogs[idx] = { ...blogs[idx], ...data };
          localStorage.setItem('easyfr8_blogs', JSON.stringify(blogs));
          return blogs[idx];
        }
      }
      throw new Error('Blog post not found');
    }
    return api.put(API_ENDPOINTS.BLOGS.UPDATE(id), data);
  },

  delete: async (id: string): Promise<void> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_blogs');
      if (stored) {
        const blogs = JSON.parse(stored) as Blog[];
        localStorage.setItem('easyfr8_blogs', JSON.stringify(blogs.filter((b) => b.id !== id)));
      }
      return;
    }
    return api.delete(API_ENDPOINTS.BLOGS.DELETE(id));
  },
};

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const AuditLogService = {
  getList: async (): Promise<AuditLog[]> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_auditLogs');
      return stored ? JSON.parse(stored) : [];
    }
    return api.get(API_ENDPOINTS.AUDIT_LOGS.LIST);
  },

  clear: async (): Promise<void> => {
    if (isMockMode()) {
      localStorage.setItem('easyfr8_auditLogs', JSON.stringify([]));
      return;
    }
    return api.post(API_ENDPOINTS.AUDIT_LOGS.CLEAR);
  },
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const SettingsService = {
  get: async (): Promise<AppSettings> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_appSettings');
      return stored ? JSON.parse(stored) : defaultAppSettings;
    }
    return api.get('/settings');
  },

  update: async (section: keyof AppSettings, data: Partial<AppSettings[keyof AppSettings]>): Promise<AppSettings> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_appSettings');
      const settings: AppSettings = stored ? JSON.parse(stored) : defaultAppSettings;
      const updated = { ...settings, [section]: { ...(settings[section] as object), ...data } };
      localStorage.setItem('easyfr8_appSettings', JSON.stringify(updated));
      return updated;
    }
    return api.put(`/settings/${section}`, data);
  },

  testEmail: async (email: string): Promise<{ success: boolean; message: string }> => {
    if (isMockMode()) return { success: true, message: `Test email sent to ${email}` };
    return api.post('/settings/smtp/test', { email });
  },

  testSms: async (phone: string): Promise<{ success: boolean; message: string }> => {
    if (isMockMode()) return { success: true, message: `Test SMS sent to ${phone}` };
    return api.post('/settings/sms/test', { phone });
  },
};

// ── Hero Slides ──────────────────────────────────────────────────────────────
// Uses a local axios instance pointing to this Next.js app's own API routes
// (not the external production API, which doesn't have these admin endpoints)
const localApi = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  timeout: 60000,
});

localApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('easyfr8_token');
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

localApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data;
    const message = errorData?.error || errorData?.message || error.message || 'Hero Slides API error.';
    const customError = new Error(message);
    (customError as any).status = error.response?.status;
    return Promise.reject(customError);
  }
);

export const HeroSlidesService = {
  getPublicList: async (): Promise<HeroSlide[]> => {
    return localApi.get('/api/cms/hero-slides');
  },

  getAdminList: async (): Promise<HeroSlide[]> => {
    return localApi.get('/api/admin/cms/hero-slides');
  },

  create: async (data: Omit<HeroSlide, 'id' | 'created_at' | 'updated_at'>): Promise<HeroSlide> => {
    return localApi.post('/api/admin/cms/hero-slides', data);
  },

  update: async (id: string, data: Partial<HeroSlide>): Promise<HeroSlide> => {
    return localApi.put(`/api/admin/cms/hero-slides/${id}`, data);
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return localApi.delete(`/api/admin/cms/hero-slides/${id}`);
  },
};

// ── Media Library ────────────────────────────────────────────────────────────
export const MediaService = {
  getList: async (): Promise<any[]> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_media') || '[]';
      return JSON.parse(stored);
    }
    return api.get(API_ENDPOINTS.MEDIA.LIST);
  },

  upload: async (data: { fileName: string; fileUrl: string; fileType: string; fileSize: string; userEmail?: string; userName?: string }): Promise<{ success: boolean; media: any }> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_media') || '[]';
      const mediaList = JSON.parse(stored);
      const newItem = {
        id: `MED-${Date.now()}`,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        uploadedAt: new Date().toISOString()
      };
      mediaList.unshift(newItem);
      localStorage.setItem('easyfr8_media', JSON.stringify(mediaList));
      return { success: true, media: newItem };
    }
    return api.post(API_ENDPOINTS.MEDIA.UPLOAD, data);
  },

  delete: async (id: string, userParams?: { userEmail: string; userName: string }): Promise<{ success: boolean }> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_media') || '[]';
      const mediaList = JSON.parse(stored);
      localStorage.setItem('easyfr8_media', JSON.stringify(mediaList.filter((m: any) => m.id !== id)));
      return { success: true };
    }
    const query = userParams ? `?userEmail=${encodeURIComponent(userParams.userEmail)}&userName=${encodeURIComponent(userParams.userName)}` : '';
    return api.delete(`${API_ENDPOINTS.MEDIA.DELETE(id)}${query}`);
  },

  replace: async (id: string, data: { fileName: string; fileUrl: string; fileType: string; fileSize: string; userEmail?: string; userName?: string }): Promise<{ success: boolean; media: any }> => {
    if (isMockMode()) {
      const stored = localStorage.getItem('easyfr8_media') || '[]';
      const mediaList = JSON.parse(stored);
      const idx = mediaList.findIndex((m: any) => m.id === id);
      if (idx !== -1) {
        mediaList[idx] = {
          ...mediaList[idx],
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileType: data.fileType,
          fileSize: data.fileSize,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('easyfr8_media', JSON.stringify(mediaList));
        return { success: true, media: mediaList[idx] };
      }
      throw new Error('Media item not found');
    }
    return api.put(API_ENDPOINTS.MEDIA.DELETE(id), data);
  }
};
