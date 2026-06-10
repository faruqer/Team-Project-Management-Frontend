'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationsApi, Notification } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import ui from '@/components/ui/ui.module.css';
import styles from './notifications.module.css';

interface NotificationBellProps {
  token: string | null;
}

export function NotificationBell({ token }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [listRes, countRes] = await Promise.all([
      notificationsApi.list(token),
      notificationsApi.unreadCount(token),
    ]);
    setNotifications(listRes.notifications);
    setUnreadCount(countRes.count);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket(token, {
    onNotification: (data) => {
      const n = data as Notification;
      setNotifications((prev) => [n, ...prev]);
      setUnreadCount((c) => c + 1);
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function handleMarkRead(id: string) {
    if (!token) return;
    await notificationsApi.markRead(token, id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleMarkAllRead() {
    if (!token) return;
    await notificationsApi.markAllRead(token);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
    setUnreadCount(0);
  }

  return (
    <div className={styles.bellWrap} ref={panelRef}>
      <button
        className={styles.bellBtn}
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <span className={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className={`${ui.button} ${ui.ghost} ${ui.sm}`} onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <ul className={styles.list}>
            {notifications.length === 0 ? (
              <li className={styles.empty}>No notifications</li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={`${styles.item} ${!n.readAt ? styles.unread : ''}`}
                  onClick={() => !n.readAt && handleMarkRead(n.id)}
                >
                  <div className={styles.itemTitle}>{n.title}</div>
                  <div className={styles.itemMessage}>{n.message}</div>
                  <div className={styles.itemTime}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
