import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.easyfr8.vnvision.in/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
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

// Response Interceptor: Common responses formatting
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Standard error logging or redirect triggers can go here
    const backendError = error.response?.data?.error || error.response?.data?.message;
    const baseMessage = backendError || error.message || 'An unexpected API error occurred.';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error.config?.url || 'UNKNOWN';
    const message = `${method} ${url} failed: ${baseMessage}`;

    return Promise.reject(new ApiError(message, error.response?.status, error.response?.data));
  }
);

export default api;
