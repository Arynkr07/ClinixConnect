import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import {
  appointmentService,
  generateGoogleCalendarLink,
  downloadIcsFile,
} from '../../services/appointmentService';
import { doctorService } from '../../services/doctorService';
import { patientSidebarItems } from './patientNav';

export default function MyAppointments() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { notify } = useNotification();

  const sidebarItems = patientSidebarItems(t);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  // Reschedule Modal state
  const [reschedulingApt, setReschedulingApt] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [savingReschedule, setSavingReschedule] = useState(false);

  // Selected Detail Modal
  const [selectedApt, setSelectedApt] = useState(null);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const patientId = user?.patientId || user?.id || user?.email || 'JD-1209';
      const list = await appointmentService.getAppointments({ patient: patientId });
      setAppointments(list);
    } catch (err) {
      console.error('Failed to load appointments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) {
      notify({ type: 'error', message: 'Please specify both a new date and time.' });
      return;
    }
    setSavingReschedule(true);
    try {
      const updated = await appointmentService.reschedule(reschedulingApt.id, newDate, newTime);
      setAppointments((prev) =>
        prev.map((a) => (a.id === reschedulingApt.id ? updated : a))
      );
      notify({ type: 'success', message: 'Appointment rescheduled! Notifications and emails sent.' });
      setReschedulingApt(null);
    } catch {
      notify({ type: 'error', message: 'Could not reschedule appointment.' });
    } finally {
      setSavingReschedule(false);
    }
  };

  const handleAcceptReschedule = async (apt) => {
    try {
      await doctorService.patientAcceptReschedule(apt.id);
      notify({ type: 'success', message: `Rescheduled appointment confirmed!` });
      loadAppointments();
    } catch {
      notify({ type: 'error', message: 'Could not confirm rescheduled slot.' });
    }
  };

  const handleCancelReschedule = async (apt) => {
    try {
      await doctorService.patientCancelReschedule(apt.id, 'Declined rescheduled date');
      notify({ type: 'info', message: 'Appointment cancelled.' });
      loadAppointments();
    } catch {
      notify({ type: 'error', message: 'Could not cancel appointment.' });
    }
  };

  const filtered = appointments.filter((a) => {
    if (activeTab === 'upcoming') return a.status === 'upcoming' || a.status === 'rescheduled_pending_patient';
    if (activeTab === 'completed') return a.status === 'completed';
    if (activeTab === 'cancelled') return a.status === 'cancelled';
    return true;
  });

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('patient.upcomingAppointments'),
        subtitle: 'View, reschedule, and manage all your clinic & virtual consultations',
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
      {/* Tabs */}
      <div className="flex items-center gap-3 mb-8 border-b border-outline-variant/40 pb-3">
        {[
          { id: 'upcoming', label: 'Upcoming', count: appointments.filter((a) => a.status === 'upcoming').length },
          { id: 'completed', label: 'Completed', count: appointments.filter((a) => a.status === 'completed').length },
          { id: 'cancelled', label: 'Cancelled', count: appointments.filter((a) => a.status === 'cancelled').length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-xl font-bold text-label-md transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-surface-container-highest'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-outline mb-2">event_busy</span>
          <h3 className="font-headline font-bold text-title-lg text-on-surface">No {activeTab} appointments found</h3>
          <p className="text-on-surface-variant mt-1">Book a new appointment with our doctors to get started.</p>
          <Link to="/patient/doctors" className="inline-block mt-4">
            <Button icon="search">Find Doctors</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((apt) => (
            <Card key={apt.id} className="hover:border-primary/40 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary-container text-on-primary-container flex flex-col items-center justify-center font-headline shrink-0">
                    <span className="text-label-xs font-bold uppercase leading-none">
                      {new Date(apt.date).toLocaleString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-title-lg font-bold leading-none mt-1">
                      {new Date(apt.date).getDate()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-headline font-bold text-title-md text-on-surface">
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
                      <Badge variant={apt.status === 'upcoming' ? 'success' : apt.status === 'completed' ? 'neutral' : 'warning'}>
                        {apt.status}
                      </Badge>
                    </div>

                    <p className="text-label-md text-on-surface-variant flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">schedule</span>
                      {apt.date} at {apt.startTime} {apt.endTime ? `– ${apt.endTime}` : ''} ({apt.notes})
                    </p>

                    {apt.chiefComplaint && (
                      <p className="text-body-sm text-on-surface bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20">
                        <span className="font-semibold text-primary">Chief Complaint: </span>
                        {apt.chiefComplaint}
                      </p>
                    )}

                    {apt.status === 'rescheduled_pending_patient' && (
                      <div className="w-full bg-warning-container/30 border border-warning/40 rounded-xl p-4 mt-3">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <p className="font-bold text-on-warning-container flex items-center gap-2">
                              <span className="material-symbols-outlined text-warning">event_repeat</span>
                              Doctor on Leave — Auto-Rescheduled Slot Offered
                            </p>
                            <p className="text-body-sm text-on-surface-variant mt-1">
                              Dr. {apt.doctorName} is on leave on {apt.date}. Your appointment is automatically rescheduled to:{' '}
                              <span className="font-bold text-primary">{apt.rescheduledDate} at {apt.startTime}</span>.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" icon="check_circle" onClick={() => handleAcceptReschedule(apt)}>
                              Accept New Slot
                            </Button>
                            <Button size="sm" variant="outline" icon="cancel" onClick={() => handleCancelReschedule(apt)}>
                              Cancel Consultation
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    icon="visibility"
                    onClick={() => setSelectedApt(apt)}
                  >
                    View Details
                  </Button>

                  {apt.status === 'upcoming' && (
                    <>
                      <a
                        href={apt.googleCalendarLink || generateGoogleCalendarLink(apt)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="secondary" icon="calendar_add_on">
                          Google Cal
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        icon="download"
                        onClick={() => downloadIcsFile(apt)}
                      >
                        .ics
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        icon="edit_calendar"
                        onClick={() => {
                          setReschedulingApt(apt);
                          setNewDate(apt.date);
                          setNewTime(apt.startTime);
                        }}
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-error hover:bg-error-container"
                        onClick={() => handleCancel(apt.id)}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedApt && (
        <Modal
          open={Boolean(selectedApt)}
          onClose={() => setSelectedApt(null)}
          title="Appointment & Clinical Summary"
          icon="medical_information"
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl text-label-md">
              <div>
                <span className="text-on-surface-variant block">Doctor</span>
                <span className="font-bold text-on-surface">{selectedApt.doctorName}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block">Date & Time</span>
                <span className="font-bold text-on-surface">{selectedApt.date} at {selectedApt.startTime}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block">Triage Urgency</span>
                <span className="font-bold text-primary">{selectedApt.urgency}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block">Status</span>
                <span className="font-bold uppercase text-on-surface">{selectedApt.status}</span>
              </div>
            </div>

            {/* Pre-Visit Note (Doctor View Only Notice) */}
            <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 text-label-md text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">medical_information</span>
              <span>Pre-Visit Symptom Summary is automatically shared strictly with your attending doctor before your consultation.</span>
            </div>

            {/* Post-Visit Clinical Summary (Visible to Patient & Doctor) */}
            {selectedApt.postVisitSummary ? (
              <div className="space-y-2 bg-primary-container/30 p-4 rounded-xl border border-primary/20">
                <h4 className="font-bold text-on-surface flex items-center gap-2 text-label-lg">
                  <span className="material-symbols-outlined text-primary">clinical_notes</span>
                  Post-Visit Consultation Summary & Doctor Advice
                </h4>
                <p className="text-body-sm text-on-surface whitespace-pre-line leading-relaxed">
                  {selectedApt.postVisitSummary}
                </p>
              </div>
            ) : selectedApt.status === 'completed' && selectedApt.diagnosis ? (
              <div className="space-y-2 bg-primary-container/30 p-4 rounded-xl border border-primary/20">
                <h4 className="font-bold text-on-surface flex items-center gap-2 text-label-lg">
                  <span className="material-symbols-outlined text-primary">clinical_notes</span>
                  Post-Visit Clinical Diagnosis
                </h4>
                <p className="text-body-sm font-bold text-on-surface">{selectedApt.diagnosis}</p>
                {selectedApt.advice && <p className="text-body-sm text-on-surface-variant mt-1">Doctor Advice: {selectedApt.advice}</p>}
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedApt(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {reschedulingApt && (
        <Modal
          open={Boolean(reschedulingApt)}
          onClose={() => setReschedulingApt(null)}
          title="Reschedule Appointment"
          icon="edit_calendar"
          size="md"
        >
          <form onSubmit={handleRescheduleSubmit} className="space-y-4">
            <p className="text-label-md text-on-surface-variant">
              Select a new date and time for your consultation with <span className="font-bold text-on-surface">{reschedulingApt.doctorName}</span>.
            </p>
            <Input
              label="New Date"
              type="date"
              value={newDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setNewDate(e.target.value)}
              required
            />
            <Input
              label="New Time"
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              required
            />
            <div className="flex gap-3 pt-3">
              <Button type="submit" loading={savingReschedule} icon="save">
                Confirm Reschedule
              </Button>
              <Button type="button" variant="outline" onClick={() => setReschedulingApt(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}
