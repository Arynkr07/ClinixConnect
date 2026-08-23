import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGE_CODES, LANGUAGE_OPTIONS } from '../../i18n';
import { useTheme } from '../../hooks/useTheme';
import { cx } from '../../utils/helpers';

const SETTINGS_KEY = 'jd_settings';

const DEFAULT_SETTINGS = {
  emailNotifs: true,
  smsNotifs: false,
  appNotifs: true,
  language: 'English',
};

const NOTIFICATION_PREFS = [
  { key: 'emailNotifs', labelKey: 'emailNotifs', descKey: 'emailNotifsDesc' },
  { key: 'smsNotifs', labelKey: 'smsNotifs', descKey: 'smsNotifsDesc' },
  { key: 'appNotifs', labelKey: 'appNotifs', descKey: 'appNotifsDesc' },
];

const loadSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export default function SettingsPreferences() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore storage errors */
    }
  }, [settings]);

  const changeLanguage = (lang) => {
    setSettings((s) => ({ ...s, language: lang }));
    const code = LANGUAGE_CODES[lang];
    if (code) i18n.changeLanguage(code);
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="flex items-center gap-2 font-bold text-on-surface mb-3">
          <span className="material-symbols-outlined text-primary text-lg">dark_mode</span>
          {t('settings.appearance')}
        </p>
        <div className="flex items-center justify-between gap-3 bg-surface-container-low rounded-lg p-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined text-primary shrink-0">dark_mode</span>
            <div className="min-w-0">
              <p className="font-bold text-on-surface text-sm">{t('settings.darkMode')}</p>
              <p className="text-label-md text-on-surface-variant">{t('settings.darkModeDesc')}</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            onClick={toggleTheme}
            className={cx(
              'relative inline-flex items-center h-7 w-12 rounded-full transition-colors shrink-0',
              theme === 'dark' ? 'bg-primary' : 'bg-surface-container-highest border border-outline'
            )}
          >
            <span
              className={cx(
                'inline-block w-5 h-5 rounded-full bg-surface-bright shadow transition-transform',
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
      </section>

      <section>
        <p className="flex items-center gap-2 font-bold text-on-surface mb-3">
          <span className="material-symbols-outlined text-primary text-lg">notifications</span>
          {t('settings.notificationPrefs')}
        </p>
        <div className="space-y-2">
          {NOTIFICATION_PREFS.map((pref) => (
            <label
              key={pref.key}
              className="flex items-center justify-between gap-3 cursor-pointer bg-surface-container-low rounded-lg p-4"
            >
              <div className="min-w-0">
                <p className="font-bold text-on-surface text-sm">{t(`settings.${pref.labelKey}`)}</p>
                <p className="text-label-md text-on-surface-variant">{t(`settings.${pref.descKey}`)}</p>
              </div>
              <input
                type="checkbox"
                checked={settings[pref.key]}
                onChange={(e) => setSettings((s) => ({ ...s, [pref.key]: e.target.checked }))}
                className="h-5 w-5 rounded border-outline text-primary focus:ring-primary shrink-0"
              />
            </label>
          ))}
        </div>
      </section>

      <section>
        <p className="flex items-center gap-2 font-bold text-on-surface mb-3">
          <span className="material-symbols-outlined text-primary text-lg">translate</span>
          {t('settings.language')}
        </p>
        <select
          value={settings.language}
          onChange={(e) => changeLanguage(e.target.value)}
          className="w-full h-14 bg-surface-container-low border border-outline-variant rounded-lg px-4 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.label}>
              {opt.nativeLabel}
            </option>
          ))}
        </select>
      </section>
    </div>
  );
}
