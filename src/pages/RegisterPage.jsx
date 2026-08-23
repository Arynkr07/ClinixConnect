import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';
import { useTranslation } from 'react-i18next';
import { APP_NAME, REGISTRATION_ROLES, ROLE_META, ROLE_PORTAL } from '../utils/constants';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(() => {
    const preselected = searchParams.get('role');
    return REGISTRATION_ROLES.includes(preselected) ? preselected : 'doctor';
  });
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { notify } = useNotification();
  const { t } = useTranslation();

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = t('auth.fullNameRequired');
    if (!form.email.trim()) next.email = t('auth.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = t('auth.emailInvalid');
    if (form.phone && !/^[0-9+\-\s]{7,15}$/.test(form.phone)) next.phone = t('auth.phoneInvalid');
    if (!form.password) next.password = t('auth.passwordRequired');
    else if (form.password.length < 8) next.password = t('auth.passwordMinChars');
    if (form.confirmPassword !== form.password) next.confirmPassword = t('auth.passwordsDoNotMatch');
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role,
      });

      notify({ type: 'success', message: t('auth.accountCreated') });
      navigate(ROLE_PORTAL[role] ?? '/', { replace: true });
    } catch (err) {
      const msg = err.message || 'Registration failed.';
      if (msg.toLowerCase().includes('already exists') || err.status === 409) {
        setErrors({ email: 'An account with this email already exists. Please sign in instead.' });
      } else {
        notify({ type: 'error', message: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface">
      <nav className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur border-b border-outline-variant/40">
        <div className="max-w-3xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <img src="/logo.svg" alt={`${APP_NAME} logo`} className="w-7 h-7" />
            </div>
            <div className="leading-tight">
              <p className="font-headline text-title-md font-bold">{t('app.name')}</p>
              <p className="text-label-sm text-on-surface-variant">{t('auth.createAnAccount')}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:inline-flex px-3 py-2 rounded-lg text-label-md font-semibold text-on-surface-variant hover:text-primary hover:bg-primary-fixed/30 transition-colors"
            >
              {t('auth.signIn')}
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <div className="text-center mb-10">
          <h1 className="font-headline text-headline-xl font-bold">{t('auth.registerFor', { app: APP_NAME })}</h1>
          <p className="text-on-surface-variant mt-2">
            {t('auth.registerSubtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-xl card-shadow border border-outline-variant/20 p-6 md:p-10 space-y-8">
          <fieldset>
            <legend className="text-label-lg font-bold mb-4">{t('auth.chooseYourRole')}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {REGISTRATION_ROLES.map((value) => {
                const { icon } = ROLE_META[value];
                const selected = role === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={`text-left rounded-xl border-2 p-5 transition-all ${
                      selected
                        ? 'border-primary bg-primary-fixed/25 shadow-elevation1'
                        : 'border-outline-variant hover:border-outline'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${
                          selected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined">{icon}</span>
                      </span>
                      <span>
                        <span className={`block font-bold ${selected ? 'text-primary' : 'text-on-surface'}`}>
                          {t(`role.${value}`)}
                        </span>
                        <span className="block text-label-sm text-on-surface-variant mt-0.5">
                          {t(`role.${value}Desc`)}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-5">
            <legend className="text-label-lg font-bold">{t('auth.yourDetails')}</legend>
            <Input
              label={t('auth.fullName')}
              value={form.name}
              onChange={update('name')}
              placeholder={t('auth.fullNamePlaceholder')}
              icon="badge"
              error={errors.name}
              autoComplete="name"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label={t('auth.email')}
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder={t('auth.emailPlaceholder')}
                icon="mail"
                error={errors.email}
                autoComplete="email"
              />
              <Input
                label={t('auth.phoneOptional')}
                type="tel"
                value={form.phone}
                onChange={update('phone')}
                placeholder={t('auth.phonePlaceholder')}
                icon="call"
                error={errors.phone}
                autoComplete="tel"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label={t('auth.password')}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={update('password')}
                placeholder={t('auth.passwordMin')}
                icon="lock"
                error={errors.password}
                autoComplete="new-password"
                rightAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-on-surface-variant hover:text-primary"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                }
              />
              <Input
                label={t('auth.confirmPassword')}
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                placeholder={t('auth.reEnterPassword')}
                icon="lock"
                error={errors.confirmPassword}
                autoComplete="new-password"
              />
            </div>
          </fieldset>

          <div className="pt-2">
            <Button type="submit" fullWidth size="lg" loading={loading} icon="person_add">
              {t('auth.createAccount')}
            </Button>
            <p className="text-center text-label-md text-on-surface-variant mt-4">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" className="font-bold text-primary hover:underline">
                {t('auth.signInLink')}
              </Link>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
