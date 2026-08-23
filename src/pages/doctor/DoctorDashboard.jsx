import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import KPIWidget from '../../components/charts/KPIWidget';
import LineChart from '../../components/charts/LineChart';
import PieChart from '../../components/charts/PieChart';
import { doctorService } from '../../services/doctorService';
import { patientService } from '../../services/patientService';
import { appointmentService } from '../../services/appointmentService';
import { useAuth } from '../../hooks/useAuth';

import { doctorSidebarItems } from './doctorNav';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const sidebarItems = doctorSidebarItems(t);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, patientsData] = await Promise.all([
          doctorService.getDashboard(),
          patientService.getAll(),
        ]);

        // Resolve the doctor's own ID from user session or local storage
        const doctorId = user?.doctorId || user?.id || (() => {
          try {
            const docs = JSON.parse(localStorage.getItem('jd_doctors_db') || '[]');
            const match = docs.find(
              (d) =>
                d.email?.toLowerCase() === user?.email?.toLowerCase() ||
                d.name?.toLowerCase() === user?.name?.toLowerCase()
            );
            return match?.id || match?.doctorId || null;
          } catch { return null; }
        })();

        // Fetch all upcoming appointments then filter to this doctor's own queue
        const allApts = await appointmentService.getAppointments({ status: 'upcoming' });

        let aptsData = doctorId
          ? allApts.filter((a) => {
              const aptDocId = String(a.doctorId || a.doctor?.id || '').toLowerCase();
              const aptDocName = String(a.doctorName || a.doctor?.name || '').toLowerCase();
              const myId = String(doctorId).toLowerCase();
              const myName = String(user?.name || '').toLowerCase().replace('dr. ', '');
              return (
                aptDocId === myId ||
                (myName && aptDocName && aptDocName.includes(myName))
              );
            })
          : allApts;

        // Fallback: show all if filter yields empty in demo/offline mode
        if (aptsData.length === 0 && allApts.length > 0 && !doctorId) {
          aptsData = allApts;
        }

        const uniquePatientIds = new Set([
          ...aptsData.map((a) => a.patientId || a.patient?.id || a.patientName),
          ...patientsData.map((p) => p.id || p.patientId),
        ].filter(Boolean));

        const urgentCount = [
          ...aptsData.filter((a) => (a.urgency || '').toLowerCase() === 'high' || (a.urgency || '').toLowerCase() === 'critical'),
          ...patientsData.filter((p) => (p.risk || '').toLowerCase() === 'high' || (p.risk || '').toLowerCase() === 'critical'),
        ].length;

        setStats({
          ...statsData,
          patientsToday: aptsData.length,
          totalPatients: uniquePatientIds.size,
          urgentCases: urgentCount,
        });
        setPatients(patientsData);
        setAppointments(aptsData);
      } catch (err) {
        console.error('Failed to load doctor dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const highRisk = (patients || []).filter((p) => (p.risk || '').toLowerCase() === 'critical' || (p.risk || '').toLowerCase() === 'high').slice(0, 4);

  const headerRight = (
    <>
      <NotificationBell />
      <ProfileMenu />
    </>
  );

  if (loading) {
    return (
      <DashboardLayout sidebarProps={{ items: sidebarItems }} headerProps={{ title: t('nav.dashboard'), subtitle: t('doctor.overview'), right: headerRight }}>
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const currentStats = stats || {
    patientsToday: appointments.length || 0,
    totalPatients: appointments.length || 0,
    urgentCases: appointments.filter((a) => a.urgency === 'High' || a.urgency === 'Critical').length || 0,
    avgResponse: '10m',
    consultations: [0, 0, 0, 0, 0, 0, 0],
    outcomes: [0, 0, 0],
  };

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{ title: t('doctor.welcomeBack', { name: user?.name ?? t('role.doctor') }), subtitle: t('doctor.overviewToday'), right: headerRight }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPIWidget label={t('doctor.patientsToday')} value={currentStats.patientsToday ?? 0} icon="group" color="primary" trend={12} />
        <KPIWidget label={t('doctor.totalPatients')} value={(currentStats.totalPatients ?? 0).toLocaleString()} icon="group" color="secondary" trend={5} />
        <KPIWidget label={t('doctor.urgentCases')} value={currentStats.urgentCases ?? 0} icon="warning" color="error" trend={-3} />
        <KPIWidget label={t('doctor.avgResponseTime')} value={currentStats.avgResponse || '10m'} unit="" icon="timer" color="tertiary" trend={8} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title={t('doctor.consultationTrends')}
          subtitle={t('doctor.thisWeek')}
          className="lg:col-span-2"
          headerRight={
            <select className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 text-label-md">
              <option>{t('doctor.weekly')}</option>
              <option>{t('doctor.monthly')}</option>
            </select>
          }
        >
          <LineChart
            labels={[t('schedule.mon'), t('schedule.tue'), t('schedule.wed'), t('schedule.thu'), t('schedule.fri'), t('schedule.sat'), t('schedule.sun')]}
            data={currentStats.consultations?.length ? currentStats.consultations : [0, 0, 0, 0, 0, 0, 0]}
            height={280}
          />
        </Card>

        <Card title={t('doctor.outcomeDistribution')} subtitle={t('doctor.resolvedVsReferred')}>
          <PieChart
            labels={[t('doctor.resolved'), t('doctor.referred'), t('doctor.followUp')]}
            data={currentStats.outcomes?.length ? currentStats.outcomes : [1, 0, 0]}
            colors={['#1B5E4F', '#C8B900', '#E8734A']}
            height={220}
          />
          <div className="flex flex-col gap-3 mt-4">
            {['resolved', 'referred', 'followUp'].map((key, i) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: ['#1B5E4F', '#C8B900', '#E8734A'][i] }} />
                  <span className="text-label-md text-on-surface-variant">{t(`doctor.${key}`)}</span>
                </div>
                <span className="font-bold text-on-surface">{currentStats.outcomes?.[i] ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Upcoming Scheduled Patient Visits with AI Pre-Visit Triage */}
      <Card
        title="Upcoming Patient Appointments & AI Pre-Visit Triage"
        subtitle="Review AI symptom analysis before patient arrives"
        headerRight={
          <Link to="/doctor/queue">
            <Button variant="outline" size="sm">View Patient Queue</Button>
          </Link>
        }
      >
        {appointments.length === 0 ? (
          <p className="text-label-md text-on-surface-variant py-4 text-center">
            No upcoming appointments scheduled for today.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="bg-primary text-on-primary text-label-md">
                  <th className="px-5 py-3 font-headline font-semibold">Patient</th>
                  <th className="px-5 py-3 font-headline font-semibold">Date & Time</th>
                  <th className="px-5 py-3 font-headline font-semibold">Chief Complaint</th>
                  <th className="px-5 py-3 font-headline font-semibold">AI Triage Urgency</th>
                  <th className="px-5 py-3 font-headline font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.slice(0, 5).map((apt) => (
                  <tr key={apt.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-on-surface block">{apt.patientName}</span>
                      <span className="text-label-xs text-primary font-mono">{apt.patientId}</span>
                    </td>
                    <td className="px-5 py-3.5 text-on-surface-variant">
                      <span className="font-semibold text-on-surface">{apt.date}</span> at {apt.startTime} ({apt.notes})
                    </td>
                    <td className="px-5 py-3.5 text-on-surface-variant max-w-[280px] truncate">
                      {apt.chiefComplaint || apt.purpose || 'General Consultation'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          apt.urgency === 'High'
                            ? 'critical'
                            : apt.urgency === 'Medium'
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {apt.urgency} Urgency
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link to={`/doctor/case/${apt.patientId || 'JD-9921'}`}>
                        <Button size="sm">Review Pre-Visit</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {highRisk.length > 0 && (
        <div className="bg-error-container rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-3xl text-on-error-container">emergency</span>
            <div>
              <h4 className="font-headline font-bold text-on-error-container">{t('doctor.highRiskAlert')}</h4>
              <p className="text-sm text-on-error-container/80">
                {t('doctor.criticalPatientsCount', { count: highRisk.length })}
              </p>
            </div>
          </div>
          <Link to="/doctor/queue">
            <Button variant="danger">{t('doctor.reviewNow')}</Button>
          </Link>
        </div>
      )}
    </DashboardLayout>
  );
}
