import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export const ROLE_LABEL = { manager: 'ผู้จัดการ', staff: 'พนักงาน' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(tokenStore.get()));

  const clear = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  // เปิดเว็บใหม่: ตรวจว่า token เดิมยังใช้ได้ไหม
  useEffect(() => {
    setUnauthorizedHandler(clear);
    if (!tokenStore.get()) return;
    api
      .me()
      .then(({ user: u }) => setUser(u))
      .catch(clear)
      .finally(() => setChecking(false));
  }, [clear]);

  const login = useCallback(async (username, password) => {
    const { token, user: u } = await api.login(username, password);
    tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clear();
    }
  }, [clear]);

  const value = useMemo(
    () => ({ user, checking, login, logout, isManager: user?.role === 'manager' }),
    [user, checking, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth ต้องใช้ภายใน <AuthProvider>');
  return ctx;
}
