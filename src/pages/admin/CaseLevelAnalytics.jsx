import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AdminProfileMenu from '../../components/layout/AdminProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import KPIWidget from '../../components/charts/KPIWidget';
import BarChart from '../../components/charts/BarChart';
import HeatMap from '../../components/charts/HeatMap';
import { adminService } from '../../services/adminService';
import { adminSidebarItems } from './adminNav';

const RISK_ROWS = [
  { label: 'Meera Sharma', values: [2, 4, 4, 4, 4, 3, 4] },
  { label: 'Gopal Prasad', values: [1, 2, 4, 4, 3, 2, 2] },
  { label: 'Rajesh Kumar', values: [0, 1, 2, 2, 3, 2, 1] },
  { label: 'Arjun Singh', values: [1, 1, 2, 1, 0, 1, 1] },
];

export default function CaseLevelAnalytics() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const analytics = await adminService.getCaseAnalytics();
      setData(analytics);
      setLoading(false);
    };
    load();
  }, []);

  const sidebarItems = adminSidebarItems(t);

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{ title: t('analytics.title'), subtitle: t('analytics.subtitle'), right: <AdminProfileMenu /> }}
    >
      {loading || !data ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <KPIWidget label={t('analytics.totalCases')} value={(data?.totalCases ?? 0).toLocaleString()} icon="description" color="primary" trend={9} />
            <KPIWidget label={t('analytics.resolved')} value={(data?.resolved ?? 0).toLocaleString()} icon="verified" color="secondary" trend={12} />
            <KPIWidget label={t('analytics.escalated')} value={(data?.escalated ?? 0).toLocaleString()} icon="north_east" color="tertiary" trend={-5} />
            <KPIWidget label={t('analytics.inFollowUp')} value={(data?.inFollowUp ?? 0).toLocaleString()} icon="schedule" color="error" trend={3} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title={t('analytics.casesByDiagnosis')} subtitle={t('analytics.topConditions')} className="lg:col-span-2">
              <BarChart
                labels={data.diagnosisTrends.labels}
                data={data.diagnosisTrends.data}
                colors={['#1B5E4F', '#00639B', '#7C5800', '#722000', '#E8734A', '#C8B900']}
                height={300}
              />
            </Card>
            <Card title={t('analytics.caseOutcomeFlow')} subtitle={t('analytics.escalationFunnel')}>
              <div className="space-y-4">
                {[
                  { label: t('analytics.resolvedAtPhc'), value: 100 - data.referralRate, color: 'bg-primary' },
                  { label: t('analytics.referredToChc'), value: data.referralRate, color: 'bg-tertiary' },
                  { label: t('analytics.hospitalized'), value: 6, color: 'bg-error' },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="flex justify-between text-label-md mb-1">
                      <span className="text-on-surface-variant">{r.label}</span>
                      <span className="font-bold text-on-surface">{r.value}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-surface-container-high overflow-hidden">
                      <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title={t('analytics.triageAccuracy')} subtitle={t('analytics.triageAccuracySub')}>
              <div className="text-center py-8">
                <p className="font-headline text-headline-2xl font-bold text-primary">{data.triageAccuracy}%</p>
                <p className="text-on-surface-variant text-label-md mt-1">{t('analytics.triageAccuracyHint')}</p>
              </div>
            </Card>
            <Card title={t('analytics.referralRate')} subtitle={t('analytics.referralRateSub')}>
              <div className="text-center py-8">
                <p className="font-headline text-headline-2xl font-bold text-tertiary">{data.referralRate}%</p>
                <p className="text-on-surface-variant text-label-md mt-1">{t('analytics.referralRateHint')}</p>
              </div>
            </Card>
            <Card title={t('analytics.criticalCases')} subtitle={t('analytics.activeHighRisk')}>
              <div className="space-y-3">
                {['JD-9921', 'JD-1209', 'JD-1023'].map((id) => (
                  <div key={id} className="flex items-center justify-between bg-surface-container-low rounded-lg p-3">
                    <span className="font-mono font-semibold text-primary">{id}</span>
                    <Badge variant="critical">{t('queue.critical')}</Badge>
                  </div>
                ))}
                <p className="text-label-sm text-on-surface-variant">{t('analytics.flaggedForReview', { count: 3 })}</p>
              </div>
            </Card>
          </div>

          <Card title={t('analytics.byRegion')} subtitle={t('analytics.byRegionSub')}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-primary text-on-primary">
                    <th className="px-6 py-3 font-headline font-semibold">{t('analytics.region')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('analytics.totalCases')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('analytics.resolved')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('analytics.escalated')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('analytics.resolutionRateShort')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byRegion.map((r) => (
                    <tr key={r.region} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4 font-bold text-on-surface">{r.region}</td>
                      <td className="px-6 py-4 font-semibold">{r.total.toLocaleString()}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{r.resolved.toLocaleString()}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{r.escalated.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <Badge variant={r.total ? 'success' : 'neutral'}>{Math.round((r.resolved / r.total) * 100)}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={t('analytics.riskEvolution')} subtitle={t('analytics.riskIntensity')}>
            <HeatMap rows={RISK_ROWS} weekLabels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} />
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
