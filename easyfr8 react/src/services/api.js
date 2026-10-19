import axios from 'axios';

// Fallback to localhost:3001 if VITE_API_URL is not set
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 60000,
});

// Request Interceptor: Inject token if available
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('easyfr8_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Common error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Clear session strictly on unauthenticated / expired session (401)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('easyfr8_token');
        localStorage.removeItem('easyfr8_user');
      }
    }
    const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);

/**
 * Image URL resolver helper.
 * If the path is base64 (data:image) or absolute URL, returns it as-is.
 * Otherwise, prepends the backend host base URL.
 */
export function getImageUrl(path) {
  if (!path) return '';
  
  let targetPath = path;
  
  // Strip out hardcoded local backend domains if stored in DB to normalize them
  if (targetPath.startsWith('http://localhost:3002/')) {
    targetPath = targetPath.replace('http://localhost:3002/', '');
  }
  if (targetPath.startsWith('http://adminfr8.vnvision.in/')) {
    targetPath = targetPath.replace('http://adminfr8.vnvision.in/', '');
  }
  
  // Resolve relative path using current configured API_URL
  if (!targetPath.startsWith('data:') && !targetPath.startsWith('http://') && !targetPath.startsWith('https://')) {
    const cleanPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
    const hostUrl = API_URL.replace(/\/api$/, '');
    targetPath = `${hostUrl}/${cleanPath}`;
  }
  
  // Force HTTPS upgrade for non-local HTTP assets if the user is on an HTTPS connection
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && targetPath.startsWith('http://')) {
    if (!targetPath.includes('localhost') && !targetPath.includes('127.0.0.1')) {
      targetPath = targetPath.replace(/^http:\/\//, 'https://');
    }
  }
  
  return targetPath;
}

/**
 * Normalizes service category string into either 'core' or 'value-added'.
 */
export function normalizeCategory(category) {
  if (!category) return 'core';
  const norm = String(category).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (norm.includes('value') || norm.includes('added')) {
    return 'value-added';
  }
  return 'core';
}

/**
 * Resolve CMS icon keywords or classes into valid flaticon/font classes.
 * Supports canonical names: anchor, plane, truck, package, shield, box, briefcase, umbrella
 */
export function getServiceIconClass(icon) {
  if (!icon) return 'flaticon-transport-4';
  const clean = String(icon).toLowerCase().trim();

  // If already a CSS class
  if (clean.startsWith('flaticon-') || clean.startsWith('fa-') || clean.startsWith('fa ')) {
    return clean;
  }

  const iconMap = {
    anchor: 'flaticon-transport-4',
    ocean: 'flaticon-transport-4',
    sea: 'flaticon-transport-4',
    ship: 'flaticon-transport-4',
    plane: 'flaticon-transport-3',
    air: 'flaticon-transport-3',
    flight: 'flaticon-transport-3',
    airplane: 'flaticon-transport-3',
    truck: 'flaticon-transport-5',
    road: 'flaticon-transport-5',
    transport: 'flaticon-transport-5',
    delivery: 'flaticon-delivery-truck',
    package: 'flaticon-transport-7',
    warehousing: 'flaticon-transport-7',
    warehouse: 'flaticon-transport-7',
    storage: 'flaticon-transport-7',
    shield: 'flaticon-transport-1',
    customs: 'flaticon-transport-1',
    compliance: 'flaticon-shield',
    security: 'flaticon-shield',
    box: 'flaticon-transport-10',
    cfs: 'flaticon-transport-10',
    briefcase: 'flaticon-business',
    business: 'flaticon-business',
    contract: 'flaticon-business',
    umbrella: 'flaticon-interface-1',
    insurance: 'flaticon-interface-1',
  };

  return iconMap[clean] || `flaticon-${clean}`;
}

export default api;
