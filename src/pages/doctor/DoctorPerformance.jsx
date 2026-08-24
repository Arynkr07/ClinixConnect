import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import KPIWidget from '../../components/charts/KPIWidget';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import HeatMap from '../../components/charts/HeatMap';
import { doctorService } from '../../services/doctorService';

import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';
import { doctorSidebarItems } from './doctorNav';

export default function DoctorPerformance() {
  const { t } = useTranslation();
  const sidebarItems = doctorSidebarItems(t);
  const HEATMAP_ROWS = [
    { label: t('performance.general'), values: [1, 2, 3, 2, 1, 0, 0] },
    { label: t('performance.prenatal'), values: [0, 1, 2, 2, 3, 1, 0] },
    { label: t('performance.vaccination'), values: [2, 2, 1, 0, 1, 3, 2] },
    { label: t('performance.chronic'), values: [3, 2, 2, 1, 2, 1, 1] },
  ];
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      const data = await doctorService.getDashboard();
      setStats(data);
    };
    load();
  }, []);

  const achievements = [
    { label: t('performance.ach1'), icon: 'verified', done: true },
    { label: t('performance.ach2'), icon: 'group', done: true },
    { label: t('performance.ach3'), icon: 'timer', done: true },
    { label: t('performance.ach4'), icon: 'videocam', done: false },
  ];

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('performance.title'),
        subtitle: t('performance.subtitle'),
        right: (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      {!stats ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <KPIWidget label={t('performance.totalPatients')} value={(stats?.totalPatients ?? 0).toLocaleString()} icon="group" color="primary" trend={8} />
            <KPIWidget label={t('performance.resolutionRate')} value="92%" icon="verified" color="secondary" trend={3} />
            <KPIWidget label={t('performance.avgConsultTime')} value="18m" icon="timer" color="tertiary" trend={-5} />
            <KPIWidget label={t('performance.patientSatisfaction')} value="4.8/5" icon="star" color="error" trend={2} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title={t('performance.weeklyConsultations')} subtitle={t('performance.trendLastWeek')}>
              <LineChart
                labels={[t('schedule.mon'), t('schedule.tue'), t('schedule.wed'), t('schedule.thu'), t('schedule.fri'), t('schedule.sat'), t('schedule.sun')]}
                data={stats?.consultations?.length ? stats.consultations : [0, 0, 0, 0, 0, 0, 0]}
                height={280}
              />
            </Card>
            <Card title={t('performance.byType')} subtitle={t('performance.typeDistribution')}>
              <BarChart
                labels={[t('performance.general'), t('performance.prenatal'), t('performance.vaccination'), t('performance.chronic'), t('performance.emergency')]}
                data={[140, 95, 120, 80, 45]}
                colors={['#1B5E4F', '#E8734A', '#7C5800', '#00639B', '#BA1A1A']}
                height={280}
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title={t('performance.serviceCoverage')} subtitle={t('performance.visitsPerWeekday')} className="lg:col-span-2">
              <HeatMap rows={HEATMAP_ROWS} />
            </Card>
            <Card title={t('performance.achievements')} icon="workspace_premium" subtitle={t('performance.thisQuarter')}>
              <div className="space-y-3">
                {achievements.map((a) => (
                  <div key={a.label} className="flex items-center gap-3 bg-surface-container-low rounded-lg p-3">
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        a.done ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest text-outline'
                      }`}
                    >
                      <span className="material-symbols-outlined">{a.icon}</span>
                    </span>
                    <p className={`flex-1 font-medium ${a.done ? 'text-on-surface' : 'text-on-surface-variant'}`}>{a.label}</p>
                    <Badge variant={a.done ? 'success' : 'neutral'}>{a.done ? t('performance.earned') : t('performance.pending')}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
