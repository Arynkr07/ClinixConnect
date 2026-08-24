import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { appointmentService, downloadIcsFile } from '../../services/appointmentService';
import { patientSidebarItems } from './patientNav';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [takenDoses, setTakenDoses] = useState(() => {
    try {
      const raw = localStorage.getItem('jd_med_reminders_status');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const sidebarItems = patientSidebarItems(t);

  useEffect(() => {
    const load = async () => {
      try {
        const patientId = user?.patientId || user?.id || user?.email || 'JD-1209';
        const list = await appointmentService.getAppointments({ patient: patientId });
        setAppointments(list);
      } catch (err) {
        console.error('Failed to load appointments', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    const handleSync = () => {
      try {
        const raw = localStorage.getItem('jd_med_reminders_status');
        if (raw) setTakenDoses(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('jd_med_status_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('jd_med_status_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const upcoming = appointments.filter((a) => a.status === 'upcoming');
  const past = appointments.filter((a) => a.status === 'completed');

  const handleToggleDose = (id, medName = 'Dose') => {
    setTakenDoses((prev) => {
      const next = !prev[id];
      if (next) {
        notify({ type: 'success', message: `Marked ${medName} as taken for today!` });
      }
      const updated = { ...prev, [id]: next };
      try {
        localStorage.setItem('jd_med_reminders_status', JSON.stringify(updated));
        window.dispatchEvent(new window.CustomEvent('jd_med_status_updated'));
      } catch {
        /* ignore */
      }
      return updated;
    });
  };

  const handleCancel = async (id) => {
    const reason = window.prompt('Please enter a cancellation reason (optional):');
    if (reason === null) return;
    try {
      await appointmentService.cancel(id, reason);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
      );
      notify({ type: 'success', message: 'Appointment cancelled.' });
    } catch {
      notify({ type: 'error', message: 'Could not cancel appointment.' });
    }
  };

  const [dailyMedications, setDailyMedications] = useState([]);

  useEffect(() => {
    const loadMeds = async () => {
      try {
        let stored = [];
        try {
          stored = JSON.parse(localStorage.getItem('savedPrescriptions') || '[]');
        } catch {
          stored = [];
        }
        let customReminders = [];
        try {
          customReminders = JSON.parse(localStorage.getItem('jd_custom_med_reminders') || '[]');
        } catch {
          customReminders = [];
        }

        const pid = (user?.patientId || user?.id || '').toLowerCase();
        const uname = (user?.name || '').toLowerCase();

        const myPrescriptions = Array.isArray(stored)
          ? stored.filter(
              (rx) =>
                !pid ||
                !rx.patientId ||
                rx.patientId.toLowerCase() === pid ||
                rx.patientName?.toLowerCase() === uname ||
                stored.length > 0
            )
          : [];

        const items = [];
        myPrescriptions.forEach((rx) => {
          (rx.medicines || []).forEach((med) => {
            const freq = (med.frequency || '').toLowerCase();
            const sched = med.schedule || {};

            const wantMorning = sched.morning || freq.includes('morning') || freq.includes('once') || freq.includes('daily') || freq.includes('1-0-1') || freq.includes('1-1-1') || (!sched.afternoon && !sched.night && !freq);
            const wantAfternoon = sched.afternoon || freq.includes('afternoon') || freq.includes('1-1-1');
            const wantNight = sched.night || freq.includes('night') || freq.includes('bedtime') || freq.includes('1-0-1') || freq.includes('1-1-1');

            if (wantMorning) {
              items.push({
                id: `${med.id || med.medicineName}-morning`,
                name: med.medicineName || 'Prescribed Medicine',
                time: 'Morning · 08:30 AM',
                dose: med.dosage || '1 Dose',
                instruction: `Prescribed by ${rx.doctorName || 'Doctor'} · ${rx.diagnosis || 'Take after breakfast'}`,
              });
            }
            if (wantAfternoon) {
              items.push({
                id: `${med.id || med.medicineName}-afternoon`,
                name: med.medicineName || 'Prescribed Medicine',
                time: 'Afternoon · 01:30 PM',
                dose: med.dosage || '1 Dose',
                instruction: `Prescribed by ${rx.doctorName || 'Doctor'} · ${rx.diagnosis || 'Take after lunch'}`,
              });
            }
            if (wantNight) {
              items.push({
                id: `${med.id || med.medicineName}-night`,
                name: med.medicineName || 'Prescribed Medicine',
                time: 'Night · 09:30 PM',
                dose: med.dosage || '1 Dose',
                instruction: `Prescribed by ${rx.doctorName || 'Doctor'} · ${rx.diagnosis || 'Take before bedtime'}`,
              });
            }
          });
        });

        if (Array.isArray(customReminders)) {
          customReminders.forEach((c) => {
            items.push({
              id: c.id,
              name: c.medicine,
              time: `${c.slot} · ${c.time}`,
              dose: c.instructions || '1 Dose',
              instruction: c.purpose || 'Daily Reminder',
            });
          });
        }

        setDailyMedications(items);
      } catch (err) {
        console.error('Failed to load real medications:', err);
      }
    };
    loadMeds();
  }, [user]);

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('patient.welcomeBack', { name: user?.name || 'Patient' }),
        subtitle: t('patient.dashboardSubtitle'),
        right: (
          <div className="flex items-center gap-3">
            <Link to="/patient/doctors">
              <Button icon="add_circle" size="md">
                {t('patient.bookNewAppointment')}
              </Button>
            </Link>
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      {/* Quick Action Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-2xl p-6 shadow-elevation2 flex flex-col justify-between">
          <div>
            <span className="inline-flex p-3 rounded-xl bg-white/20 mb-4">
              <span className="material-symbols-outlined text-2xl">calendar_add_on</span>
            </span>
            <h3 className="font-headline text-title-lg font-bold">Book a Consultation</h3>
            <p className="text-body-sm opacity-90 mt-1">
              Select verified specialists, get an AI pre-visit summary, and auto-sync with Google Calendar.
            </p>
          </div>
          <Link to="/patient/doctors" className="mt-6">
            <Button variant="secondary" fullWidth icon="arrow_forward" iconPosition="right">
              Find Doctors
            </Button>
          </Link>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 card-shadow flex flex-col justify-between">
          <div>
            <span className="inline-flex p-3 rounded-xl bg-secondary-container text-on-secondary-container mb-4">
              <span className="material-symbols-outlined text-2xl">alarm_on</span>
            </span>
            <h3 className="font-headline text-title-lg font-bold">Medication Tracker</h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Never miss a dose with frequency-based prescription reminders and daily intake logs.
            </p>
          </div>
          <Link to="/patient/medications" className="mt-6">
            <Button variant="outline" fullWidth icon="checklist">
              View Schedule
            </Button>
          </Link>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 card-shadow flex flex-col justify-between">
          <div>
            <span className="inline-flex p-3 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant mb-4">
              <span className="material-symbols-outlined text-2xl">medical_information</span>
            </span>
            <h3 className="font-headline text-title-lg font-bold">Post-Visit Summaries</h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Access patient-friendly clinical notes and digital prescriptions signed by your doctor.
            </p>
          </div>
          <Link to="/patient/prescriptions" className="mt-6">
            <Button variant="outline" fullWidth icon="receipt_long">
              View Prescriptions
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title={t('patient.upcomingAppointments')}
            icon="event_upcoming"
            subtitle={`${upcoming.length} upcoming scheduled visit(s)`}
            headerRight={
              <Link to="/patient/doctors">
                <Button size="sm" variant="outline" icon="add">
                  {t('patient.bookNewAppointment')}
                </Button>
              </Link>
            }
          >
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2 text-outline">event_busy</span>
                <p className="font-semibold">{t('patient.noUpcoming')}</p>
                <Link to="/patient/doctors" className="inline-block mt-4">
                  <Button size="sm" icon="search">
                    {t('patient.searchSpecialists')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcoming.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-5 hover:border-primary/40 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary text-on-primary flex flex-col items-center justify-center font-headline shrink-0">
                          <span className="text-label-sm font-bold uppercase leading-none">
                            {new Date(apt.date).toLocaleString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-title-lg font-bold leading-none mt-0.5">
                            {new Date(apt.date).getDate()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-headline font-bold text-on-surface text-title-md">
                              {apt.doctorName}
                            </h4>
                            <Badge variant="secondary">{apt.doctorSpecialty}</Badge>
                            <Badge
                              variant={
                                apt.urgency === 'High'
                                  ? 'critical'
                                  : apt.urgency === 'Medium'
                                  ? 'warning'
                                  : 'success'
                              }
                            >
                              AI Triage: {apt.urgency}
                            </Badge>
                          </div>
                          <p className="text-label-md text-on-surface-variant mt-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">schedule</span>
                            {apt.date} at {apt.startTime} {apt.endTime ? `– ${apt.endTime}` : ''} ({apt.notes})
                          </p>
                          {apt.chiefComplaint && (
                            <p className="text-body-sm text-on-surface mt-2 bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/20">
                              <span className="font-semibold text-primary">Chief Complaint: </span>
                              {apt.chiefComplaint}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-end gap-2 shrink-0">
                        <a
                          href={apt.googleCalendarLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block w-full sm:w-auto"
                        >
                          <Button size="sm" variant="secondary" icon="calendar_add_on" fullWidth>
                            Google Calendar
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          icon="download"
                          onClick={() => downloadIcsFile(apt)}
                          title="Download .ics calendar file"
                        >
                          .ics
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-error hover:bg-error-container"
                          onClick={() => handleCancel(apt.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Post-Visit Clinical Summaries */}
          <Card
            title={t('patient.recentSummaries')}
            icon="clinical_notes"
            subtitle="Patient-friendly clinical insights & prescriptions"
          >
            {past.length === 0 ? (
              <p className="text-label-md text-on-surface-variant py-4 text-center">
                No past consultation records yet. Completed visit summaries will appear here.
              </p>
            ) : (
              <div className="space-y-4">
                {past.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface">{apt.doctorName}</span>
                        <span className="text-label-sm text-on-surface-variant">({apt.doctorSpecialty})</span>
                      </div>
                      <span className="text-label-sm text-on-surface-variant font-mono">{apt.date}</span>
                    </div>
                    <div className="text-body-sm text-on-surface whitespace-pre-line bg-surface-container-lowest p-3.5 rounded-lg border border-outline-variant/20 leading-relaxed">
                      {typeof apt.postVisitSummary === 'object'
                        ? apt.postVisitSummary?.patientFriendlySummary || apt.postVisitSummary?.notes || 'Consultation completed.'
                        : apt.postVisitSummary || (apt.diagnosis || apt.advice
                            ? `🩺 Diagnosis: ${apt.diagnosis || 'Clinical evaluation completed.'}\n📋 Doctor's Advice: ${apt.advice || 'Follow prescription guidelines and maintain rest.'}`
                            : `🩺 Doctor's Consultation Summary:\nDoctor evaluated symptoms (${apt.symptoms || apt.purpose || 'General Consultation'}) and formulated a personalized care plan.\n\n💊 Care & Medication Plan:\n• Take all prescribed medications regularly as directed.\n• Maintain proper hydration and adequate rest.\n\n📋 Recommended Follow-up:\n• Schedule a follow-up consultation in 7 days or if symptoms persist.\n• Seek emergency care if high fever or severe symptoms develop.`)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Daily Medication Checklist & Reminders */}
        <div className="space-y-6">
          <Card
            title={t('patient.activeMedications')}
            icon="medication"
            subtitle={t('patient.todaysDoses')}
            headerRight={
              <Badge variant="success" icon="notifications_active">
                Active Reminders
              </Badge>
            }
          >
            {dailyMedications.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl opacity-60 mb-2 block">medication</span>
                <p className="text-body-md font-semibold">No active prescribed medications for today.</p>
                <p className="text-label-sm text-outline mt-1">Prescriptions issued by your doctor will automatically appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dailyMedications.map((med) => {
                  const isTaken = Boolean(takenDoses[med.id]);
                  return (
                    <div
                      key={med.id}
                      className={`rounded-xl p-4 border transition-all ${
                        isTaken
                          ? 'bg-success-container/40 border-success/30 opacity-75'
                          : 'bg-surface-container-low border-outline-variant/30 hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`font-bold ${isTaken ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                            {med.name}
                          </p>
                          <p className="text-label-sm text-primary font-semibold mt-0.5">{med.time}</p>
                          <p className="text-body-sm text-on-surface-variant mt-1">{med.dose}</p>
                          <p className="text-label-xs text-outline mt-1 italic">{med.instruction}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleDose(med.id)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                            isTaken
                              ? 'bg-success text-on-success'
                              : 'bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-on-primary'
                          }`}
                          title={isTaken ? 'Dose marked as taken' : 'Click to mark as taken'}
                        >
                          <span className="material-symbols-outlined text-xl">
                            {isTaken ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-outline-variant/30">
              <Link to="/patient/medications">
                <Button variant="outline" fullWidth icon="alarm">
                  Manage Full Medication Schedule
                </Button>
              </Link>
            </div>
          </Card>

          <Card title="Google Calendar Sync" icon="sync" className="bg-primary-container/30 border-primary/20">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0 mt-0.5">event</span>
              <div>
                <h4 className="font-bold text-on-surface text-label-lg">Seamless Calendar Reminders</h4>
                <p className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                  Every booked appointment can be synced directly to your Google Calendar or downloaded as an .ics file so you and your doctor never miss a visit.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
