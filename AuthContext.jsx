import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, getToken, setToken, clearToken } from '../api/client.js';
import { NAV_BY_ROLE } from './permissions.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [systemDate, setSystemDate] = useState(null);
  const [booting, setBooting] = useState(true);

  // Restore an existing session on page load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        setBooting(false);
        return;
      }
      try {
        const { user: me, systemDate: d } = await api.get('/auth/me');
        if (!cancelled) {
          setUser(me);
          setSystemDate(d);
        }
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (staffId, password, role) => {
    const res = await api.post('/auth/login', { staffId, password, role });
    setToken(res.token);
    setUser(res.user);
    setSystemDate(res.systemDate);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Signing out locally matters more than the audit call succeeding.
    }
    clearToken();
    setUser(null);
  }, []);

  const can = useCallback((module) => {
    if (!user) return false;
    return (NAV_BY_ROLE[user.role] || []).includes(module);
  }, [user]);

  const value = useMemo(
    () => ({ user, systemDate, booting, login, logout, can, nav: NAV_BY_ROLE[user?.role] || [] }),
    [user, systemDate, booting, login, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// NAV_BY_ROLE is imported from ./permissions.js rather than re-exported here:
// any non-component export in this module defeats Vite's Fast Refresh.
// eslint-disable-next-line import/no-unused-modules
