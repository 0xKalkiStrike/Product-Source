import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    let url = import.meta.env.VITE_API_BASE_URL.trim();
    if (!url.endsWith('/api/v1') && !url.endsWith('/api/v1/')) {
      url = url.replace(/\/+$/, '') + '/api/v1';
    }
    return url;
  }

  // Dynamic endpoint resolution for Render static site host
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('.onrender.com')) {
      if (hostname.includes('frontend')) {
        const backendHost = hostname.replace('frontend', 'backend');
        return `${window.location.protocol}//${backendHost}/api/v1`;
      }
      return `${window.location.protocol}//product-intelligence-backend-xnwn.onrender.com/api/v1`;
    }
  }

  return '/api/v1';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
