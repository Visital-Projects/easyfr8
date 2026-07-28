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
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear session on authentication failure
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

export default api;
