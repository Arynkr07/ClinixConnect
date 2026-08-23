import { api, isMockMode } from './api';

const getStorageKey = (userId) => `jd_notifications_${userId || 'guest'}`;

const DEFAULT_WELCOME_NOTIFS = [
  {
    id: 'notif-system-welcome',
    title: 'Welcome to JeevanDoot',
    description: 'Your rural community health portal is connected and active.',
    time: '5m ago',
    icon: 'health_and_safety',
    tone: 'primary',
    unread: true,
  },
  {
    id: 'notif-system-status',
    title: 'Database Synced',
    description: 'Live MongoDB Atlas connectivity active for appointments & consultations.',
    time: '10m ago',
    icon: 'cloud_done',
    tone: 'success',
    unread: false,
  },
];

export const notificationService = {
  getUserNotifications(userId) {
    const list = [];
    const keys = [
      getStorageKey(userId),
      getStorageKey('patient'),
      getStorageKey('doctor'),
      getStorageKey('admin'),
    ];

    keys.forEach((k) => {
      try {
        const stored = localStorage.getItem(k);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) list.push(...parsed);
        }
      } catch {
        /* ignore */
      }
    });

    if (list.length === 0) return DEFAULT_WELCOME_NOTIFS;

    const seen = new Set();
    return list.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  },

  async fetchUserNotifications(userId) {
    const local = this.getUserNotifications(userId);
    if (isMockMode()) {
      return local;
    }
    try {
      const { data } = await api.get('/notifications');
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((n) => ({
          id: n._id || n.id || `notif-${Math.random()}`,
          title: n.title || 'System Notification',
          description: n.description || n.message || '',
          time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          icon: n.icon || 'notifications',
          tone: n.tone || 'primary',
          unread: !n.isRead,
        }));
        return [...mapped, ...local];
      }
    } catch (e) {
      console.warn('[notificationService] fetchUserNotifications fallback:', e.message);
    }
    return local;
  },

  sendToUser(userId, { title, description, icon = 'notifications', tone = 'primary' }) {
    if (!userId) return;
    try {
      const key = getStorageKey(userId);
      const existing = this.getUserNotifications(userId);
      const newNotif = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        description,
        time: 'Just now',
        icon,
        tone,
        unread: true,
        createdAt: new Date().toISOString(),
      };
      const updated = [newNotif, ...existing.filter((n) => n.id !== newNotif.id)];
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jd_notification_event', { detail: { userId, notification: newNotif } }));
      return newNotif;
    } catch (e) {
      console.warn('Failed to send notification:', e);
    }
  },

  markAsRead(userId, notifId) {
    if (!userId) return;
    try {
      const key = getStorageKey(userId);
      const list = this.getUserNotifications(userId);
      const updated = list.map((n) => (n.id === notifId ? { ...n, unread: false } : n));
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jd_notification_event', { detail: { userId } }));
    } catch (e) {
      console.warn(e);
    }
  },

  markAllAsRead(userId) {
    if (!userId) return;
    try {
      const key = getStorageKey(userId);
      const list = this.getUserNotifications(userId);
      const updated = list.map((n) => ({ ...n, unread: false }));
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jd_notification_event', { detail: { userId } }));
    } catch (e) {
      console.warn(e);
    }
  },

  async getAll() {
    if (isMockMode()) {
      return DEFAULT_WELCOME_NOTIFS;
    }
    try {
      const { data } = await api.get('/notifications');
      return data;
    } catch {
      return DEFAULT_WELCOME_NOTIFS;
    }
  },
};

export default notificationService;
