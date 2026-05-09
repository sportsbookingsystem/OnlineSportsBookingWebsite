import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(!!getStoredToken());

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (t) => {
    const tok = t ?? getStoredToken();
    if (!tok) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const data = await apiRequest('/api/auth/me', { token: tok });
      setUser(data.user);
      return data.user;
    } catch {
      setStoredToken(null);
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser(token);
  }, [token, refreshUser]);

  const login = useCallback(async (email, password) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      token: null,
    });
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: payload,
      token: null,
    });
    if (data.pendingVerification) {
      return {
        pendingVerification: true,
        message: data.message,
      };
    }
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return { user: data.user };
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      refreshUser,
      isRole: (r) => user?.role?.name === r,
    }),
    [user, token, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error(' AuthProvider required');
  return ctx;
}
