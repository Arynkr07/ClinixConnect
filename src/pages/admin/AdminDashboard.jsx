import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AdminProfileMenu from '../../components/layout/AdminProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import KPIWidget from '../../components/charts/KPIWidget';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import PieChart from '../../components/charts/PieChart';
import { adminService } from '../../services/adminService';
import { adminSidebarItems } from './adminNav';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const REGIONS = ['All Regions', 'Amroli', 'Devgram', 'Palia', 'Dhamtari Rural', 'Lormi Block', 'Bijapur Sector 2', 'Sundargarh', 'Raigarh'];

  useEffect(() => {
    const load = async () => {
      const overview = await adminService.getOverview();
      setData(overview);
      setLoading(false);
    };
    load();
  }, []);

  const sidebarItems = adminSidebarItems(t);

  const kpis = data
    ? [
        { label: t('admin.totalConsultations'), value: data.totalConsultations, icon: 'monitoring', color: 'primary', trend: data.totalConsultationsTrend },
        { label: t('admin.activeDoctors'), value: data.activeDoctors, icon: 'stethoscope', color: 'secondary', trend: data.activeDoctorsTrend },
        { label: t('admin.resolutionRate'), value: data.resolutionRate, icon: 'verified', color: 'error', trend: data.resolutionRateTrend },
      ]
    : [];

  const riskLabels = [t('queue.low'), t('queue.moderate'), t('queue.high'), t('queue.critical')];
  const riskValues = data
    ? [data.riskDistribution.low, data.riskDistribution.moderate, data.riskDistribution.high, data.riskDistribution.critical]
    : [];

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('admin.title'),
        subtitle: t('admin.subtitle'),
        right: (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant/40">
              <span className="material-symbols-outlined text-primary text-xl">location_on</span>
              <span className="text-label-sm font-semibold text-on-surface shrink-0">Region:</span>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-transparent font-headline font-bold text-label-md text-primary focus:outline-none cursor-pointer"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r} className="bg-surface text-on-surface">
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {data && data.pendingEscalations > 0 ? (
              <Link to="/admin/alerts">
                <Badge variant="critical" icon="priority_high">
                  {t('admin.pendingEscalations', { count: data.pendingEscalations })}
                </Badge>
              </Link>
            ) : null}
            <AdminProfileMenu />
          </div>
        ),
      }}
    >
      {loading || !data ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {kpis.map((kpi) => (
              <KPIWidget key={kpi.label} {...kpi} value={String(kpi.value)} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title={t('admin.consultationVolume')} subtitle={t('admin.last7Days')} className="lg:col-span-2">
              <LineChart labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} data={data.consultationVolume} height={280} />
            </Card>
            <Card title={t('admin.caseDistribution')} subtitle={t('admin.byRiskCategory')}>
              <PieChart
                labels={riskLabels}
                data={riskValues}
                colors={['#1B5E4F', '#7C5800', '#722000', '#BA1A1A']}
                height={240}
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title={t('admin.regionWorkload')} subtitle={t('admin.casesPerRegion')}>
              <BarChart
                labels={data.regionWorkload.map((r) => r.region)}
                data={data.regionWorkload.map((r) => r.cases)}
                colors={['#1B5E4F', '#00639B', '#7C5800', '#722000', '#E8734A']}
                height={240}
                horizontal
              />
            </Card>
            <Card
              title={t('admin.activeAlerts')}
              subtitle={t('admin.needsAttention')}
              headerRight={
                <Link to="/admin/alerts">
                  <Button variant="outline" size="sm" icon="notifications_active">{t('admin.viewAlerts')}</Button>
                </Link>
              }
            >
              <div className="space-y-3">
                {data.activeAlerts >= 3 ? (
                  <>
                    {[
                      { type: 'outbreak', text: t('admin.alertOutbreak'), region: 'Amroli Cluster' },
                      { type: 'escalation', text: t('admin.alertEscalation'), region: 'Devgram Block' },
                      { type: 'workforce', text: t('admin.alertWorkforce'), region: 'Bijapur Sector 2' },
                    ].map((a) => (
                      <div key={a.type} className="flex items-center justify-between bg-surface-container-low rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <Badge variant={a.type === 'outbreak' ? 'critical' : a.type === 'escalation' ? 'warning' : 'secondary'} icon="warning" />
                          <div>
                            <p className="font-bold text-on-surface text-sm">{a.text}</p>
                            <p className="text-label-sm text-on-surface-variant">{a.region}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : null}
                <Link to="/admin/alerts" className="block">
                  <Button variant="outline" fullWidth size="sm">{t('admin.manageAlerts')}</Button>
                </Link>
              </div>
            </Card>
          </div>

          <Card
            title={t('admin.liveActivity')}
            subtitle={t('admin.recentEscalations')}
            headerRight={
              <Link to="/admin/audit-log">
                <Button variant="outline" size="sm">{t('admin.viewFullLog')}</Button>
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-primary text-on-primary">
                    <th className="px-6 py-3 font-headline font-semibold">{t('admin.caseId')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('admin.activity')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('admin.riskLevel')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('admin.handledBy')}</th>
                    <th className="px-6 py-3 font-headline font-semibold">{t('admin.time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentActivity.map((item, i) => (
                    <tr key={i} className="border-b border-outline-variant hover:bg-surface-container-low">
                      <td className="px-6 py-3 font-mono font-semibold text-primary">{item.id}</td>
                      <td className="px-6 py-3 text-on-surface-variant">{item.action}</td>
                      <td className="px-6 py-3">
                        <Badge variant={item.risk === 'Critical' ? 'critical' : 'warning'}>{item.risk}</Badge>
                      </td>
                      <td className="px-6 py-3">{item.actor}</td>
                      <td className="px-6 py-3 text-on-surface-variant">{item.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
