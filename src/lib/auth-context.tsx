'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, setToken, clearToken } from './api';
import type { User } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    password_confirmation: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('artypot_token');
    if (token) {
      auth
        .me()
        .then((res) => setUser(res.data))
        .catch(() => clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await auth.login(email, password);
    setToken(res.token);
    const me = await auth.me();
    setUser(me.data);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    password_confirmation: string,
  ) => {
    const res = await auth.register(name, email, password, password_confirmation);
    setToken(res.token);
    const me = await auth.me();
    setUser(me.data);
  };

  const logout = async () => {
    await auth.logout().catch(() => {});
    clearToken();
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await auth.me();
    setUser(res.data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
