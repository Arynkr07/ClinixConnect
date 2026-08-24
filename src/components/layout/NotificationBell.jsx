import { useEffect, useState, useCallback } from 'react';
import { cx } from '../../utils/helpers';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useAuth } from '../../hooks/useAuth';
import { notificationService } from '../../services/notificationService';

const TONE_STYLES = {
  primary: 'bg-primary-fixed-dim/40 text-primary',
  secondary: 'bg-secondary-container/60 text-on-secondary-container',
  tertiary: 'bg-tertiary-container/40 text-tertiary',
  success: 'bg-success-container text-on-success-container',
  error: 'bg-error-container text-on-error-container',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const userId = user?.patientId || user?.doctorId || user?.id || user?.email;
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false), open);

  const refresh = useCallback(async () => {
    const list = await notificationService.fetchUserNotifications(userId || 'guest');
    setNotifications(list || []);
  }, [userId]);

  useEffect(() => {
    refresh();
    const handler = (e) => {
      const id = e.detail?.userId;
      if (!id || id === userId || id === 'patient' || id === 'doctor' || id === 'admin' || id === 'guest') {
        refresh();
      }
    };
    window.addEventListener('jd_notification_event', handler);
    return () => window.removeEventListener('jd_notification_event', handler);
  }, [userId, refresh]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAsRead = (id) => {
    notificationService.markAsRead(userId, id);
    refresh();
  };

  const markAllRead = () => {
    notificationService.markAllAsRead(userId);
    refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-on-surface-variant hover:text-primary rounded-full transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-error text-on-error rounded-full flex items-center justify-center text-label-sm font-bold border-2 border-surface animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-80 max-w-[calc(100vw-2rem)] bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-elevation3 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container-low">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">notifications</span>
              <p className="font-bold text-on-surface text-sm">Notifications</p>
              {unreadCount > 0 && (
                <span className="bg-primary text-on-primary text-label-sm font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-label-md text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-label-md">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markAsRead(n.id)}
                  className={cx(
                    'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-surface-container-low',
                    !n.unread && 'opacity-70'
                  )}
                >
                  <span
                    className={cx(
                      'mt-0.5 w-9 h-9 rounded-full flex items-center justify-center material-symbols-outlined text-lg shrink-0',
                      TONE_STYLES[n.tone] ?? 'bg-surface-container-high text-on-surface-variant'
                    )}
                  >
                    {n.icon || 'notifications'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx('block text-body-sm', n.unread ? 'font-bold text-on-surface' : 'text-on-surface')}>
                      {n.title}
                    </span>
                    <span className="block text-label-md text-on-surface-variant truncate">{n.description}</span>
                    <span className="block text-label-sm text-on-surface-variant/80 mt-0.5">{n.time || 'Recent'}</span>
                  </span>
                  {n.unread && <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-primary shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
