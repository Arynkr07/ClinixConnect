import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer({ links = [], legal }) {
  const { t } = useTranslation();
  const defaultLinks = [
    { label: 'Help Center', to: '/help' },
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Security', to: '/security' },
  ];

  const resolvedLinks = links.length ? links : defaultLinks;
  const legalText = legal || t('app.secured', { year: '2024' });

  return (
    <footer className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 text-outline text-label-md">
      <div className="flex items-center gap-6 flex-wrap">
        {resolvedLinks.map((link) => (
          <Link
            key={link.label}
            to={link.to ?? '#'}
            className="hover:text-primary transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <p className="text-center md:text-right">{legalText}</p>
    </footer>
  );
}
