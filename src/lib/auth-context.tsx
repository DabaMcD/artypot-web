'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { auth, setToken, clearToken, ensureSessionCookie } from './api';
import { useRouter, usePathname, routing } from '@/i18n/routing';
import { pickPreferredLocale } from './preferred-locale';
import type { User } from './types';

export interface RegisterPayload {
  name: string;
  email?: string;
  phone_number?: string;
  password: string;
  password_confirmation: string;
  preferred_locale?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string, code?: string) => Promise<{ twoFactorRequired: boolean }>;
  register: (payload: RegisterPayload) => Promise<{ phone_verification_required?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  useEffect(() => {
    const token = localStorage.getItem('artypot_token');
    if (token) {
      // Backfill the session cookie used by the Edge middleware. Existing
      // users who logged in before this cookie was wired up would otherwise
      // be locked out of /admin and /obelisk until they log out and back in.
      ensureSessionCookie();
      auth
        .me()
        .then((res) => {
          setUser(res.data);
          // A logged-in user's account `preferred_locale` is the source of
          // truth — force the NEXT_LOCALE cookie to match it so the
          // locale-detection middleware and this client can't disagree and
          // ping-pong (the /dashboard ⇄ /<locale>/dashboard bounce that happens
          // when a stale cookie says one locale and the account says another).
          const pref = res.data.preferred_locale;
          if (typeof document !== 'undefined'
              && pref && (routing.locales as readonly string[]).includes(pref)) {
            const secure = location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `NEXT_LOCALE=${pref}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
          }
          // Honor their saved language as a one-shot redirect when the current
          // URL locale differs (cookie now already agrees, so this won't bounce).
          const loc = pickPreferredLocale(res.data, currentLocale);
          if (loc) router.replace(pathname, { locale: loc });
        })
        .catch(() => clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (identifier: string, password: string, code?: string) => {
    const res = await auth.login(identifier, password, code);
    // Credentials were valid but two-factor is enabled — the caller needs to
    // collect a code and call login() again with it. No token is issued yet.
    if (res.two_factor_required) {
      return { twoFactorRequired: true };
    }
    setToken(res.token!);
    const me = await auth.me();
    setUser(me.data);
    return { twoFactorRequired: false };
  };

  const register = async (payload: RegisterPayload) => {
    const res = await auth.register(payload);
    setToken(res.token);
    const me = await auth.me();
    setUser(me.data);
    return { phone_verification_required: res.phone_verification_required };
  };

  const logout = async () => {
    await auth.logout().catch(() => {});
    clearToken();
    setUser(null);
  };

  const refreshUser = async (): Promise<User> => {
    const res = await auth.me();
    setUser(res.data);
    return res.data;
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
