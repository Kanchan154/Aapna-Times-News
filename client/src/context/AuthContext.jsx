import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, TOKEN_KEY } from '../lib/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const startSession = useCallback((data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // Restore session on page load.
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(logout).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  const value = useMemo(() => ({
    user, token, loading, logout, setUser,
    login: async (email, password) => startSession((await api.post('/auth/login', { email, password })).data),
    register: async (form) => startSession((await api.post('/auth/register', form)).data),
    refreshToken: (t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); },
    isRole: (...roles) => !!user && roles.includes(user.role),
  }), [user, token, loading, logout, startSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
