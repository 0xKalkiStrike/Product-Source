import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    let url = import.meta.env.VITE_API_BASE_URL.trim();
    if (!url.endsWith('/api/v1') && !url.endsWith('/api/v1/')) {
      url = url.replace(/\/+$/, '') + '/api/v1';
    }
    return url;
  }

  // Same-origin relative path works for unified FastAPI single-port deployment & local Vite dev server
  return '/api/v1';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.url && (config.url.includes('/projects/undefined') || config.url.endsWith('/projects/undefined'))) {
    console.warn('[API Interceptor] Blocked request with undefined project ID:', config.url);
    return Promise.reject(new axios.Cancel('Request cancelled: project ID is undefined'));
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('auth_token');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
