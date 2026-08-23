import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useClickOutside } from '../../hooks/useClickOutside';

/**
 * AdminProfileMenu - avatar dropdown for the Admin Portal header
 * with a Logout action (confirmation modal included).
 */
export default function AdminProfileMenu() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const ref = useClickOutside(() => setOpen(false), open);

  const initials =
    String(user?.name ?? t(`role.${user?.role ?? 'admin'}`))
      .split(' ')
      .map((n) => n[0])
      .join('') || 'A';

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="flex items-center gap-3" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-full p-1 -m-1 hover:bg-surface-container-low transition-colors"
        aria-label={t('settings.accountMenu')}
        aria-expanded={open}
      >
        <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline font-bold text-sm">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="font-bold text-on-surface text-xs leading-snug">{user?.name}</p>
          <p className="text-label-sm text-on-surface-variant">{t('role.admin')}</p>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant hidden sm:block text-sm">expand_more</span>
      </button>

      <button
        type="button"
        onClick={() => setConfirmLogout(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-error/30 text-error hover:bg-error-container text-xs font-bold transition-all shadow-sm"
        title="Sign out of admin portal"
      >
        <span className="material-symbols-outlined text-base">logout</span>
        <span className="hidden md:inline">{t('common.logout')}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-64 max-w-[calc(100vw-2rem)] bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-elevation3 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low">
            <p className="font-bold text-on-surface text-sm truncate">{user?.name}</p>
            <p className="text-label-md text-on-surface-variant truncate">{user?.email}</p>
          </div>

          <div className="border-t border-outline-variant py-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmLogout(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-body-md text-error hover:bg-error-container transition-colors"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              {t('common.logout')}
            </button>
          </div>
        </div>
      )}

      <Modal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title={t('common.logout')}
        icon="logout"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmLogout(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" icon="logout" onClick={handleLogout}>
              {t('common.logout')}
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface">{t('common.logoutConfirm')}</p>
      </Modal>
    </div>
  );
}
