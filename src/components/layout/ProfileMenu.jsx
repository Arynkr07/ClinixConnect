import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Badge from '../common/Badge';
import SettingsPreferences from './SettingsPreferences';
import { doctorService } from '../../services/doctorService';
import { useAuth } from '../../hooks/useAuth';
import { useClickOutside } from '../../hooks/useClickOutside';

const DOCTOR_PROFILE = {
  workerId: 'DR-1024',
  designation: 'General Physician',
  phone: '+91 98765 43210',
  organization: 'Amroli Primary Health Centre',
  experience: '12 years',
  fields: [
    { icon: 'badge', labelKey: 'doctorId', valueKey: 'workerId' },
    { icon: 'work', labelKey: 'specialization', valueKey: 'designation' },
    { icon: 'mail', labelKey: 'email', fromUser: 'email' },
    { icon: 'call', labelKey: 'phoneNumber', valueKey: 'phone' },
    { icon: 'local_hospital', labelKey: 'hospital', valueKey: 'organization' },
    { icon: 'school', labelKey: 'experience', valueKey: 'experience' },
  ],
};

const FAQS = [
  { qKey: 'faq1q', aKey: 'faq1a' },
  { qKey: 'faq2q', aKey: 'faq2a' },
  { qKey: 'faq3q', aKey: 'faq3a' },
];

function ProfileField({ label, value, icon }) {
  return (
    <div className="bg-surface-container-low rounded-lg p-4 flex items-center gap-3 min-w-0">
      <span className="material-symbols-outlined text-primary shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-label-md text-on-surface-variant">{label}</p>
        <p className="font-bold text-on-surface truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

function SectionHeading({ icon, children }) {
  return (
    <p className="flex items-center gap-2 font-bold text-on-surface mb-3">
      <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
      {children}
    </p>
  );
}

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = DOCTOR_PROFILE;
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [bugReport, setBugReport] = useState('');
  const [availability, setAvailability] = useState(() => {
    try {
      return localStorage.getItem('jd_doctor_availability') || 'online';
    } catch {
      return 'online';
    }
  });
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false);
  const ref = useClickOutside(() => setOpen(false), open);

  const initials =
    String(user?.name ?? t(`role.${user?.role ?? 'doctor'}`))
      .replace('Dr. ', '')
      .split(' ')
      .map((n) => n[0])
      .join('') || 'D';

  const saveSettings = () => {
    setModal(null);
    toast.success(t('settings.settingsSaved'));
  };

  const changePassword = () => {
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      toast.error(t('settings.fillAllPasswordFields'));
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error(t('settings.passwordMismatch'));
      return;
    }
    if (passwords.next.length < 6) {
      toast.error(t('settings.passwordTooShort'));
      return;
    }
    setPasswords({ current: '', next: '', confirm: '' });
    toast.success(t('settings.passwordUpdated'));
  };

  const submitBug = () => {
    if (!bugReport.trim()) {
      toast.error(t('settings.describeBug'));
      return;
    }
    setBugReport('');
    toast.success(t('settings.bugSubmitted'));
  };

  const handleLogout = () => {
    logout();
    navigate(`/${user?.role ?? 'doctor'}/login`, { replace: true });
  };

  const handleAvailabilityToggle = async () => {
    const next = availability === 'online' ? 'offline' : 'online';
    setAvailabilityUpdating(true);
    try {
      await doctorService.updateAvailability(next);
      setAvailability(next);
      localStorage.setItem('jd_doctor_availability', next);
      toast.success(t(`settings.availabilityUpdated.${next}`));
    } catch {
      toast.error(t('settings.availabilityFailed'));
    } finally {
      setAvailabilityUpdating(false);
    }
  };

  const menuItems = [
    { key: 'profile', labelKey: 'myProfile', icon: 'person' },
    { key: 'settings', labelKey: 'settings', icon: 'settings' },
    { key: 'help', labelKey: 'helpSupport', icon: 'support_agent' },
  ];

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
          <p className="text-label-sm text-on-surface-variant capitalize">{user?.role || 'User'}</p>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant hidden sm:block text-sm">expand_more</span>
      </button>

      <button
        type="button"
        onClick={() => setConfirmLogout(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-error/30 text-error hover:bg-error-container text-xs font-bold transition-all shadow-sm"
        title="Sign out of account"
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

          <div className="py-2">
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  setModal(item.key);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-body-md text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-primary text-lg">{item.icon}</span>
                {t(`settings.${item.labelKey}`)}
              </button>
            ))}
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
        open={modal === 'profile'}
        onClose={() => setModal(null)}
        title={t('settings.myProfile')}
        icon="person"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline text-2xl font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-headline text-title-lg font-bold text-on-surface truncate">{user?.name}</p>
            <p className="text-on-surface-variant">
              {profile.designation} · {profile.organization}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profile.fields.map((field) => (
            <ProfileField
              key={field.labelKey}
              icon={field.icon}
              label={t(`settings.${field.labelKey}`)}
              value={field.fromUser ? user?.[field.fromUser] : profile[field.valueKey]}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 bg-surface-container-low rounded-lg p-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined text-primary shrink-0">monitor_heart</span>
            <div className="min-w-0">
              <p className="font-bold text-on-surface text-sm">{t('settings.availabilityStatus')}</p>
              <p className="text-label-md text-on-surface-variant">{t('settings.visibilityNote')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={availability === 'online' ? 'success' : 'neutral'} dot dotColor={availability === 'online' ? 'bg-success' : 'bg-outline'}>
              {availability === 'online' ? t('common.available') : t('common.offline')}
            </Badge>
            <Button size="sm" variant={availability === 'online' ? 'outline' : 'primary'} onClick={handleAvailabilityToggle} loading={availabilityUpdating} icon={availability === 'online' ? 'logout' : 'login'}>
              {availability === 'online' ? t('settings.goOffline') : t('settings.goOnline')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === 'settings'}
        onClose={() => setModal(null)}
        title={t('settings.settings')}
        icon="settings"
        size="md"
        footer={<Button onClick={saveSettings} icon="save">{t('settings.saveChanges')}</Button>}
      >
        <div className="space-y-6">
          <section>
            <SectionHeading icon="key">{t('settings.changePassword')}</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="password"
                label={t('settings.currentPassword')}
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                icon="lock"
                placeholder="••••••••"
              />
              <Input
                type="password"
                label={t('settings.newPassword')}
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                icon="lock"
                placeholder={t('settings.minChars')}
              />
              <Input
                type="password"
                label={t('settings.confirmNewPassword')}
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                icon="lock"
                placeholder="••••••••"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="secondary" size="sm" icon="key" onClick={changePassword}>
                {t('settings.changePasswordBtn')}
              </Button>
            </div>
          </section>

          <SettingsPreferences />
        </div>
      </Modal>

      <Modal
        open={modal === 'help'}
        onClose={() => setModal(null)}
        title={t('settings.helpSupport')}
        icon="support_agent"
        size="md"
      >
        <div className="space-y-6">
          <section>
            <SectionHeading icon="headset_mic">{t('settings.contactSupport')}</SectionHeading>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface-container-low rounded-lg p-4">
              <div className="min-w-0">
                <p className="font-bold text-on-surface text-sm">{t('settings.supportTeam')}</p>
                <p className="text-label-md text-on-surface-variant">support@jeevandoot.org · +91 1800 123 456</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon="mail"
                onClick={() => toast.success(t('settings.supportRequestSent'))}
              >
                {t('settings.contactSupport')}
              </Button>
            </div>
          </section>

          <section>
            <SectionHeading icon="quiz">{t('settings.faq')}</SectionHeading>
            <div className="space-y-2">
              {FAQS.map((faq) => (
                <details key={faq.qKey} className="bg-surface-container-low rounded-lg p-4 group">
                  <summary className="cursor-pointer font-bold text-on-surface text-sm list-none flex items-center justify-between gap-3">
                    {t(`settings.${faq.qKey}`)}
                    <span className="material-symbols-outlined text-primary text-sm shrink-0 transition-transform group-open:rotate-180">
                      expand_more
                    </span>
                  </summary>
                  <p className="mt-2 text-body-sm text-on-surface-variant">{t(`settings.${faq.aKey}`)}</p>
                </details>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading icon="bug_report">{t('settings.reportBug')}</SectionHeading>
            <textarea
              value={bugReport}
              onChange={(e) => setBugReport(e.target.value)}
              rows={3}
              placeholder={t('settings.describeIssue')}
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="mt-3 flex justify-end">
              <Button variant="secondary" size="sm" icon="send" onClick={submitBug}>
                {t('settings.submitReport')}
              </Button>
            </div>
          </section>
        </div>
      </Modal>

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
