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
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Remove leading slash if any
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // The host URL is the API URL without the '/api' suffix
  const hostUrl = API_URL.replace(/\/api$/, '');
  return `${hostUrl}/${cleanPath}`;
}

export default api;
