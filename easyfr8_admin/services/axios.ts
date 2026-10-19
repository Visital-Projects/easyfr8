import axios from 'axios';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Inject Authorization Bearer Token if active
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

export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    // Set prototype explicitly for ES5/TS compatibility
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Response Interceptor: Common responses formatting and 401 handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const backendError = error.response?.data?.error || error.response?.data?.message;
    const baseMessage = backendError || error.message || 'An unexpected API error occurred.';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error.config?.url || 'UNKNOWN';
    const message = `${method} ${url} failed: ${baseMessage}`;

    // Handle 401 Unauthorized globally
    if (status === 401 && typeof window !== 'undefined') {
      const urlStr = String(url || '');
      const isAuthRoute = urlStr.includes('/auth/login') || urlStr.includes('/auth/register');
      if (!isAuthRoute) {
        // Clear stale local auth state
        localStorage.removeItem('easyfr8_token');
        localStorage.removeItem('easyfr8_currentUser');
        localStorage.removeItem('easyfr8_sessionEmail');

        // Only redirect to login if not already on login or public documentation pages
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && !currentPath.startsWith('/login') && !currentPath.startsWith('/documentation')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(new ApiError(message, status, error.response?.data));
  }
);

// Centralized fetch interceptor to guarantee credentials and bearer token propagation for native fetch()
if (typeof window !== 'undefined' && !(window as any).__EASYFR8_FETCH_INTERCEPTED__) {
  (window as any).__EASYFR8_FETCH_INTERCEPTED__ = true;
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input instanceof Request
        ? input.url
        : '';
    const isApiCall = urlStr.startsWith('/api/') || urlStr.includes('/api/');

    if (isApiCall) {
      const token = localStorage.getItem('easyfr8_token');
      const modifiedInit: RequestInit = {
        ...init,
        credentials: init?.credentials || 'include',
      };

      if (token) {
        const headers = new Headers(init?.headers);
        if (!headers.has('Authorization') && !headers.has('authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        modifiedInit.headers = headers;
      }

      return originalFetch.call(this, input, modifiedInit);
    }

    return originalFetch.call(this, input, init);
  };
}

export default api;
