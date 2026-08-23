import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { useTranslation } from 'react-i18next';
import { APP_NAME, REGISTRATION_ROLES, ROLE_META } from '../utils/constants';

export default function SignInPage() {
  const { t } = useTranslation();
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
          <Link to="/register">
            <Button size="sm" icon="person_add">
              {t('auth.register')}
            </Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-10 md:py-16">
        <div className="text-center mb-10">
          <h1 className="font-headline text-headline-xl font-bold">{t('auth.signInTo', { app: APP_NAME })}</h1>
          <p className="text-on-surface-variant mt-2">{t('auth.chooseRole')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REGISTRATION_ROLES.map((role) => {
            const meta = ROLE_META[role];
            return (
              <Link
                key={role}
                to={`/login/${role}`}
                className="group bg-surface-container-lowest rounded-xl card-shadow border border-outline-variant/20 p-6 flex items-center gap-4 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-elevation2"
              >
                <span className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center ${meta.color}`}>
                  <span className="material-symbols-outlined text-[28px]">{meta.icon}</span>
                </span>
                <span className="flex-1">
                  <span className="block font-headline text-title-md font-bold group-hover:text-primary transition-colors">
                    {t(`role.${role}`)}
                  </span>
                  <span className="block text-label-sm text-on-surface-variant mt-0.5">
                    {t(`role.${role}Desc`)}
                  </span>
                </span>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                  arrow_forward
                </span>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-10 space-y-2 text-label-md">
          <p className="text-on-surface-variant">
            {t('auth.newTo', { app: APP_NAME })}{' '}
            <Link to="/register" className="font-bold text-primary hover:underline">
              {t('auth.createAnAccount')}
            </Link>
          </p>
          <p>
            <Link to="/admin/login" className="text-on-surface-variant hover:text-primary transition-colors">
              {t('auth.administrator')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
