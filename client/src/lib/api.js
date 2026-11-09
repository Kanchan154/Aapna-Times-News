import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';
export const TOKEN_KEY = 'aapna_token';

export const api = axios.create({ baseURL: `${BASE}/api`, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    // Expired/invalid token: tell the app to log out.
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export const errMsg = (e) =>
  e?.response?.data?.message || (e?.code === 'ERR_NETWORK' ? 'सर्वर से संपर्क नहीं हो पा रहा। इंटरनेट कनेक्शन जाँचिए।' : e?.message) || 'कुछ गड़बड़ हो गई।';

// Turns "/uploads/x.jpg" into a full URL (needed when API is on another domain).
export const img = (url) => (!url ? '' : /^https?:|^data:/.test(url) ? url : `${BASE}${url}`);
export const SOCKET_URL = BASE || window.location.origin;
export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');
