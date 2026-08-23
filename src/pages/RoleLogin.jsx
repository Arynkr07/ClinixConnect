import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';
import { useTranslation } from 'react-i18next';
import { APP_NAME, REGISTRATION_ROLES, ROLE_META, ROLE_PORTAL } from '../utils/constants';
import ForgotPasswordModal from '../components/common/ForgotPasswordModal';

export default function RoleLogin() {
  const { role } = useParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { notify } = useNotification();
  const { t } = useTranslation();

  if (!REGISTRATION_ROLES.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  const meta = ROLE_META[role];

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = t('auth.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t('auth.emailInvalid');
    if (!password) next.password = t('auth.passwordRequired');
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await login(role, email, password);
      notify({ type: 'success', message: t('auth.welcomeBack') });
      navigate(ROLE_PORTAL[role] ?? '/', { replace: true });
    } catch (err) {
      notify({ type: 'error', message: err.message || 'Login failed. Please check credentials.' });
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
              <p className="text-label-sm text-on-surface-variant">{t('auth.signIn')}</p>
            </div>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-label-md font-semibold text-on-surface-variant hover:text-primary hover:bg-primary-fixed/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {t('auth.chooseARole')}
          </Link>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-10 md:py-14">
        <div className="bg-surface-container-lowest rounded-xl card-shadow border border-outline-variant/20 p-8 md:p-10 space-y-6">
          <div className="text-center">
            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${meta.color}`}>
              <span className="material-symbols-outlined text-3xl">{meta.icon}</span>
            </div>
            <h1 className="font-headline text-headline-lg font-bold mt-4">{t('auth.signInAs', { label: t(`role.${role}`) })}</h1>
            <p className="text-on-surface-variant mt-1">{t('auth.welcomeBackTo', { app: APP_NAME })}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              icon="mail"
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label={t('auth.password')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              icon="lock"
              error={errors.password}
              autoComplete="current-password"
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

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-label-md font-semibold text-primary hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading} icon="login">
              {t('auth.signIn')}
            </Button>
          </form>

          <ForgotPasswordModal open={showForgot} onClose={() => setShowForgot(false)} defaultEmail={email} />

          <p className="text-center text-label-md text-on-surface-variant">
            {t('auth.demo')}
          </p>

          <div className="border-t border-outline-variant pt-5 text-center space-y-2 text-label-md">
            <p className="text-on-surface-variant">
              {t('auth.newHere')}{' '}
              <Link to={`/register?role=${role}`} className="font-bold text-primary hover:underline">
                {t('auth.createAccountAs', { label: t(`role.${role}`) })}
              </Link>
            </p>
            <p>
              <Link to="/login" className="text-on-surface-variant hover:text-primary transition-colors">
                {t('auth.chooseDifferentRole')}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}