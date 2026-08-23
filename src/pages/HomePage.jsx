import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { APP_NAME, REGISTRATION_ROLES, ROLE_LABELS, ROLE_META, ROLE_PORTAL } from '../utils/constants';

const HOME_LINKS = [
  { labelKey: 'doctorLogin', to: '/login/doctor' },
  { labelKey: 'adminLogin', to: '/admin/login' },
];

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface">
      <nav className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur border-b border-outline-variant/40">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <img src="/logo.svg" alt={`${APP_NAME} logo`} className="w-7 h-7" />
            </div>
            <div className="leading-tight">
              <p className="font-headline text-title-md font-bold">{t('app.name')}</p>
              <p className="text-label-sm text-on-surface-variant">{t('app.tagline')}</p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 md:gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-label-md text-on-surface-variant">
                  {user.name} · {ROLE_LABELS[user.role] ?? user.role}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  {t('home.signOut')}
                </Button>
              </div>
            ) : (
              <Link to="/register">
                <Button size="sm" icon="person_add">
                  {t('home.register')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {isAuthenticated && (
        <div className="bg-primary text-on-primary">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex flex-wrap items-center gap-3 text-body-md">
            <span className="material-symbols-outlined">verified</span>
            <span className="font-semibold">{t('home.welcomeBack', { name: user.name })}</span>
            <span className="opacity-80">{t('home.signedInAs', { role: ROLE_LABELS[user.role] ?? user.role })}</span>
            {ROLE_PORTAL[user.role] && (
              <Link to={ROLE_PORTAL[user.role]} className="text-on-primary underline underline-offset-2 hover:opacity-80">
                {t('home.goToDashboard')}
              </Link>
            )}
            <Link to="/register" className="ml-auto text-on-primary underline underline-offset-2 hover:opacity-80">
              {t('home.registerAnother')}
            </Link>
          </div>
        </div>
      )}

      <main>
        <section className="illustration-side relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-20 md:py-28 text-center text-on-primary relative z-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-label-md font-semibold mb-6">
              <span className="material-symbols-outlined text-primary-fixed">health_and_safety</span>
              {t('home.platformBadge')}
            </span>
            <h1 className="font-headline text-headline-2xl md:text-6xl font-bold max-w-3xl mx-auto leading-tight">
              {t('home.heroTitle')}
            </h1>
            <p className="text-body-lg opacity-90 max-w-2xl mx-auto mt-6">
              {t('home.heroText', { app: APP_NAME })}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
              <Link to="/register">
                <Button size="lg" icon="person_add" iconPosition="right" className="bg-white text-primary hover:bg-primary-fixed">
                  {t('home.createAccount')}
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="bg-white text-primary hover:bg-primary-fixed border-white/40">
                  {t('home.signIn')}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="font-headline text-headline-lg font-bold">{t('home.joinPlatform')}</h2>
            <p className="text-on-surface-variant mt-3 max-w-xl mx-auto">
              {t('home.joinPlatformText')}
            </p>
          </div>

          <div
            className={`grid grid-cols-1 gap-6 ${
              REGISTRATION_ROLES.length >= 4
                ? 'sm:grid-cols-2 lg:grid-cols-4'
                : REGISTRATION_ROLES.length >= 2
                  ? 'sm:grid-cols-2 lg:grid-cols-3'
                  : 'max-w-md mx-auto'
            }`}
          >
            {REGISTRATION_ROLES.map((role) => {
              const { icon, color } = ROLE_META[role];
              return (
                <Link
                  key={role}
                  to={`/register?role=${role}`}
                  className="group bg-surface-container-lowest rounded-xl card-shadow border border-outline-variant/20 p-6 flex flex-col gap-4 transition-all hover:-translate-y-1 hover:shadow-elevation2"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
                    <span className="material-symbols-outlined text-[28px]">{icon}</span>
                  </div>
                  <div>
                    <h3 className="font-headline text-title-md font-bold group-hover:text-primary transition-colors">
                      {t(`role.${role}`)}
                    </h3>
                    <p className="text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">{t(`role.${role}Desc`)}</p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-label-md font-bold text-primary">
                    {t('home.registerAs', { label: t(`role.${role}`) })}
                    <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="bg-surface-container-low">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: 'vaccines',
                title: t('home.featureVaccinationTitle'),
                text: t('home.featureVaccinationText'),
              },
              {
                icon: 'public',
                title: t('home.featureSurveillanceTitle'),
                text: t('home.featureSurveillanceText'),
              },
              {
                icon: 'monitoring',
                title: t('home.featureAnalyticsTitle'),
                text: t('home.featureAnalyticsText'),
              },
            ].map(({ icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <span className="w-12 h-12 shrink-0 rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center">
                  <span className="material-symbols-outlined">{icon}</span>
                </span>
                <div>
                  <h3 className="font-headline text-title-md font-bold">{title}</h3>
                  <p className="text-body-sm text-on-surface-variant mt-1.5">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant/40">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-label-md text-on-surface-variant">
          <p>{t('app.legal', { year: new Date().getFullYear(), app: APP_NAME })}</p>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            {HOME_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="hover:text-primary transition-colors">
                {t(`home.${link.labelKey}`)}
              </Link>
            ))}
            <Link to="/register" className="hover:text-primary transition-colors">
              {t('home.register')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
