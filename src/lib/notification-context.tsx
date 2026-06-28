'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { notifications as notificationsApi, getToken } from './api';
import { useAuth } from './auth-context';
import type { UserNotification } from './types';

interface NotificationContextType {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  /** Fetches a page of notifications and returns the raw data array. */
  fetchNotifications: (page?: number) => Promise<UserNotification[]>;
  markRead: (id: number) => Promise<void>;
  markBulkRead: (ids: number[]) => Promise<void>;
  totalPages: number;
  currentPage: number;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes in ms

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [notifs, setNotifs] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUnreadCount = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await notificationsApi.unreadCount();
      setUnreadCount(res.unread_count);
      // The tab-title unread badge is applied by <UnreadTitleBadge>, which
      // prefixes the real page title instead of overwriting it.
    } catch {
      // Silently ignore errors (user may not be logged in)
    }
  }, []);

  const fetchNotifications = useCallback(async (page = 1): Promise<UserNotification[]> => {
    if (!getToken()) return [];
    setLoading(true);
    try {
      const res = await notificationsApi.list(page);
      setNotifs(res.data);
      setCurrentPage(res.current_page);
      setTotalPages(res.last_page);
      if (page === 1) {
        await fetchUnreadCount();
      }
      return res.data;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchUnreadCount]);

  /** Mark a single notification as read optimistically + via API. */
  const markRead = useCallback(async (id: number) => {
    try {
      const updated = await notificationsApi.markRead(id);
      setNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: updated.read_at } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }, []);

  /**
   * Mark a specific set of notifications (by ID) as read.
   * Called when the notification bell dropdown closes.
   */
  const markBulkRead = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;
    try {
      await notificationsApi.bulkRead(ids);
      const now = new Date().toISOString();
      // Optimistically mark as read in local state
      setNotifs((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n))
      );
      // Recount properly from the server
      await fetchUnreadCount();
    } catch {
      // ignore
    }
  }, [fetchUnreadCount]);

  // Keep the unread badge in sync with auth state + ambient events. Keying on
  // the authenticated user's id means a login refetches immediately — crucially
  // for OAuth, which sets the user client-side (refreshUser) and navigates via
  // router.replace WITHOUT remounting this provider, so a mount-only fetch never
  // re-ran and the badge stayed empty until the 5-minute poll. Logout (userId →
  // null) clears the badge + list so a stale count from the previous session
  // can't linger. While logged in we also poll every 5 minutes and refetch when
  // the tab regains focus (e.g. returning from email or a bank's 3DS page).
  useEffect(() => {
    if (userId == null) {
      setUnreadCount(0);
      setNotifs([]);
      setCurrentPage(1);
      setTotalPages(1);
      return;
    }
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchUnreadCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications: notifs,
        unreadCount,
        loading,
        fetchNotifications,
        markRead,
        markBulkRead,
        totalPages,
        currentPage,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
