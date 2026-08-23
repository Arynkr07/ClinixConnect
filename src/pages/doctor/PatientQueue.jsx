import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/SearchBar';
import Select from '../../components/common/Select';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { patientService } from '../../services/patientService';
import { useDebounce } from '../../hooks/useDebounce';
import { TRIAGE_BY_RISK, RISK_ORDER } from '../../utils/constants';
import { cx } from '../../utils/helpers';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';

import { doctorSidebarItems } from './doctorNav';

const TRIAGE_TAG = {
  red: { bg: 'bg-error-container text-on-error-container border-error/30', dot: 'bg-error' },
  yellow: { bg: 'bg-secondary-container text-on-secondary-container border-secondary/30', dot: 'bg-secondary' },
  green: { bg: 'bg-success-container text-on-success-container border-success/30', dot: 'bg-success' },
};

const TRIAGE_LEGEND = [
  { color: 'red', labelKey: 'queue.triageRed' },
  { color: 'yellow', labelKey: 'queue.triageYellow' },
  { color: 'green', labelKey: 'queue.triageGreen' },
];

export default function PatientQueue() {
  const { t } = useTranslation();
  const sidebarItems = doctorSidebarItems(t);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const all = await patientService.getAll();
      if (!active) return;
      setPatients(all);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = patients
    .filter((p) => {
      const matchesQuery =
        !debouncedQuery ||
        p.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        p.village.toLowerCase().includes(debouncedQuery.toLowerCase());
      const matchesRisk = !riskFilter || p.risk === riskFilter;
      return matchesQuery && matchesRisk;
    })
    .sort((a, b) => RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk));

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('queue.title'),
        subtitle: t('queue.subtitle'),
        right: (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      <Card
        title={t('queue.currentQueue')}
        subtitle={t('queue.patientsShown', { count: filtered.length })}
        headerRight={
          <div className="flex items-center gap-3">
            <SearchBar placeholder={t('queue.search')} value={query} onSearch={setQuery} containerClassName="w-72" />
            <Select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              options={[{ value: '', label: t('queue.allRiskLevels') }, ...['Critical', 'High', 'Moderate', 'Low'].map((r) => ({ value: r, label: t(`queue.${r.toLowerCase()}`) }))]}
              className="!h-11 w-44"
            />
          </div>
        }
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="person_off" title={t('queue.noPatientsFound')} description={t('queue.tryAdjusting')} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b border-outline-variant bg-surface-container-low">
              <span className="text-label-lg font-bold text-on-surface-variant">{t('queue.triage')}</span>
              <div className="flex flex-wrap items-center gap-4">
                {TRIAGE_LEGEND.map(({ color, labelKey }) => (
                  <span key={color} className="inline-flex items-center gap-2 text-label-md text-on-surface-variant">
                    <span className={cx('w-3 h-3 rounded-full', TRIAGE_TAG[color].dot)} />
                    {t(labelKey)}
                  </span>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-primary text-on-primary">
                    <th className="px-6 py-3 font-headline font-semibold">{t('doctor.patientId')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('common.name')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('common.village')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('doctor.complaint')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('common.status')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('common.risk')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('queue.checkIn')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-primary">{p.id}</td>
                      <td className="px-6 py-4 font-semibold text-on-surface">{p.name}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{p.village}</td>
                      <td className="px-6 py-4 text-on-surface-variant max-w-[240px] truncate">{p.complaint}</td>
                      <td className="px-6 py-4">
                        <Badge variant={p.status === 'Waiting' ? 'warning' : p.status === 'In Review' ? 'secondary' : 'success'} dot>
                          {p.status === 'Waiting' ? t('queue.waiting') : p.status === 'In Review' ? t('queue.inReview') : p.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cx(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-label-md border',
                            TRIAGE_TAG[TRIAGE_BY_RISK[p.risk] || 'green']?.bg
                          )}
                        >
                          <span className={cx('w-2 h-2 rounded-full', TRIAGE_TAG[TRIAGE_BY_RISK[p.risk] || 'green']?.dot)} />
                          {p.risk ? t(`queue.${p.risk.toLowerCase()}`, p.risk) : t('queue.low')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{p.lastCheckIn}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link to={`/doctor/case/${p.id}`}>
                            <Button size="sm" variant="outline">{t('common.view')}</Button>
                          </Link>
                          <Link to="/doctor/prescription">
                            <Button size="sm">{t('queue.start')}</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination items={filtered} perPage={8} />
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
