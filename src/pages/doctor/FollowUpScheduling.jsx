import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import { patientService } from '../../services/patientService';
import { appointmentService } from '../../services/appointmentService';
import { doctorService } from '../../services/doctorService';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';

import { doctorSidebarItems } from './doctorNav';

const REASON_OPTIONS = ['reasonPrenatal', 'reasonPostop', 'reasonLab', 'reasonChronic', 'reasonVaccination'];

export default function FollowUpScheduling() {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const { user } = useAuth();
  const sidebarItems = doctorSidebarItems(t);
  const DATE_RANGE_OPTIONS = [
    { value: '7', label: t('followup.range7') },
    { value: '14', label: t('followup.range14') },
    { value: '30', label: t('followup.range30') },
  ];
  const MODE_OPTIONS = [
    { value: 'in-person', labelKey: 'followup.inPerson', icon: 'person' },
    { value: 'home', labelKey: 'followup.homeVisit', icon: 'home' },
  ];
  const [patients, setPatients] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    patientId: '',
    date: '',
    time: '',
    reason: REASON_OPTIONS[0],
    mode: 'in-person',
    range: DATE_RANGE_OPTIONS[0].value,
  });
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const loadMyLeaveRequests = async () => {
    const all = await doctorService.getLeaveRequests();
    setMyLeaveRequests(all);
  };

  useEffect(() => {
    loadMyLeaveRequests();
  }, []);

  const handleRequestLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveDate) {
      notify({ type: 'error', message: 'Please select a leave date.' });
      return;
    }
    setSubmittingLeave(true);
    try {
      const res = await doctorService.requestLeave({
        doctorId: user?.id || user?.doctorId || 'dr-1',
        doctorName: user?.name || 'Dr. Rajesh Sharma',
        date: leaveDate,
        reason: leaveReason || 'Personal Leave',
      });
      notify({ type: 'success', message: res.message });
      setLeaveDate('');
      setLeaveReason('');
      loadMyLeaveRequests();
    } catch {
      notify({ type: 'error', message: 'Could not submit leave request.' });
    } finally {
      setSubmittingLeave(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await patientService.getAll();
        if (!cancelled) setPatients(list);
      } catch {
        if (!cancelled) notify({ type: 'error', message: t('followup.loadFailed') });
      }
      try {
        const items = await appointmentService.getAppointments({ status: 'upcoming' });
        if (!cancelled) setUpcoming(items);
      } catch {
        if (!cancelled) notify({ type: 'error', message: t('followup.loadFailed') });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const selectedPatient = patients.find((p) => String(p.id) === form.patientId);

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!form.patientId) {
      notify({ type: 'error', message: t('followup.selectPatientFirst') });
      return;
    }
    if (!form.date || !form.time) {
      notify({ type: 'error', message: t('followup.pleasePickDateTime') });
      return;
    }
    try {
      const entry = await appointmentService.create({
        patientId: form.patientId,
        patientName: selectedPatient?.name || '',
        patientVillage: selectedPatient?.village || '',
        purpose: form.reason,
        date: form.date,
        startTime: form.time,
        notes: form.mode,
        doctorId: user?.id || 'doctor',
      });
      setUpcoming((prev) => [...prev, entry]);
      notify({ type: 'success', message: t('followup.scheduledFor', { name: selectedPatient?.name || entry.patientName }) });
      setForm((f) => ({ ...f, patientId: '', date: '', time: '' }));
    } catch {
      notify({ type: 'error', message: t('followup.scheduleFailed') });
    }
  };

  const handleReschedule = async (id) => {
    if (!editDate || !editTime) {
      notify({ type: 'error', message: t('followup.pleasePickDateTime') });
      return;
    }
    try {
      const updated = await appointmentService.update(id, { date: editDate, startTime: editTime });
      setUpcoming((prev) => prev.map((a) => (a.id === id ? updated : a)));
      notify({ type: 'success', message: t('followup.rescheduleSuccess') });
      setEditingId(null);
      setEditDate('');
      setEditTime('');
    } catch {
      notify({ type: 'error', message: t('followup.rescheduleFailed') });
    }
  };

  const handleCancel = async (id) => {
    try {
      await appointmentService.cancel(id, cancelReason);
      setUpcoming((prev) => prev.filter((a) => a.id !== id));
      notify({ type: 'success', message: t('followup.cancelSuccess') });
      setCancellingId(null);
      setCancelReason('');
    } catch {
      notify({ type: 'error', message: t('followup.cancelFailed') });
    }
  };

  const rangeLabel = (value) => DATE_RANGE_OPTIONS.find((o) => o.value === value)?.label ?? value;

  const inRange = (date, days) => {
    if (!date) return true;
    const cleanStr = String(date).slice(0, 10);
    const d = new Date(cleanStr.includes('T') ? cleanStr : `${cleanStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return true;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d - now) / 86400000);
    return diff >= -1 && diff <= Number(days || 30);
  };

  const visibleUpcoming = upcoming.filter((a) => inRange(a.date, form.range));

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('followup.title'),
        subtitle: t('followup.subtitle'),
        right: (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <form onSubmit={handleSchedule}>
            <Card title={t('followup.scheduleFollowUp')} icon="event_available">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-label-lg font-semibold text-on-surface ml-1 mb-2">{t('followup.patient')}</label>
                  <select
                    value={form.patientId}
                    onChange={update('patientId')}
                    className="w-full h-14 bg-surface-container-low border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t('followup.selectPatient')}</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} · {p.id}</option>
                    ))}
                  </select>
                </div>
                <Input label={t('followup.date')} type="date" value={form.date} onChange={update('date')} icon="calendar_today" required />
                <Input label={t('followup.time')} type="time" value={form.time} onChange={update('time')} icon="schedule" required />
                <div className="md:col-span-2">
                  <label className="block text-label-lg font-semibold text-on-surface ml-1 mb-2">{t('followup.reason')}</label>
                  <select
                    value={form.reason}
                    onChange={update('reason')}
                    className="w-full h-14 bg-surface-container-low border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary"
                  >
                    {REASON_OPTIONS.map((r) => (
                      <option key={r} value={r}>{t(`followup.${r}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="font-bold text-on-surface mb-2">{t('followup.mode')}</p>
                  <div className="flex gap-2">
                    {MODE_OPTIONS.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, mode: mode.value }))}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg border text-label-md transition-all ${
                          form.mode === mode.value
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface-container-low border-outline-variant text-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">{mode.icon}</span>
                        {t(mode.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Button type="submit" fullWidth className="mt-6" icon="event_available" size="lg">
                {t('followup.scheduleFollowUp')}
              </Button>
            </Card>
          </form>

          <Card title={t('followup.quickFilter')} icon="filter_alt">
            <div className="flex flex-wrap gap-2">
              {DATE_RANGE_OPTIONS.map((range) => (
                <button
                  key={range.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, range: range.value }))}
                  className={`px-4 py-2 rounded-full text-label-md transition-colors ${
                    form.range === range.value ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant border border-outline-variant'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card
            title={t('followup.upcomingFollowUps')}
            subtitle={t('followup.scheduledIn', { count: visibleUpcoming.length, range: rangeLabel(form.range) })}
            icon="upcoming"
            headerRight={
              <Badge variant="secondary" icon="notifications_active">
                {t('followup.remindersEnabled')}
              </Badge>
            }
          >
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              </div>
            ) : visibleUpcoming.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-3 block">event_note</span>
                {t('followup.noFollowUpsYet')}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleUpcoming.map((s) => {
                  const dObj = new Date(String(s.date).includes('T') ? s.date : `${s.date}T00:00:00`);
                  const monthStr = !Number.isNaN(dObj.getTime()) ? dObj.toLocaleString('en-US', { month: 'short' }) : 'Date';
                  const dayNum = !Number.isNaN(dObj.getTime()) ? dObj.getDate() : '--';
                  const displayDate = !Number.isNaN(dObj.getTime()) ? dObj.toLocaleDateString() : s.date;
                  const purposeText = s.purpose?.startsWith('reason') ? t(`followup.${s.purpose}`) : (s.purpose || 'Follow-up Consultation');

                  return (
                    <div key={s.id} className="bg-surface-container-low rounded-lg p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex flex-col items-center justify-center font-headline shrink-0">
                            <span className="text-label-sm font-bold leading-none">{monthStr}</span>
                            <span className="text-title-md font-bold leading-none mt-0.5">{dayNum}</span>
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{s.patientName} · {s.patientId}</p>
                            <p className="text-label-md text-on-surface-variant">
                              {purposeText} · {displayDate} {t('followup.at')} {s.startTime}
                            </p>
                            {s.patientVillage && (
                              <p className="text-label-sm text-on-surface-variant">{s.patientVillage}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" icon={s.notes === 'home' ? 'home' : 'person'}>
                            {s.notes === 'home' ? t('followup.homeVisit') : t('followup.inPerson')}
                          </Badge>
                          <Button size="sm" variant="outline" icon="edit_calendar" onClick={() => {
                            setEditingId(s.id);
                            setEditDate(s.date);
                            setEditTime(s.startTime);
                          }}>
                            {t('followup.reschedule')}
                          </Button>
                          <Button size="sm" variant="ghost" icon="close" onClick={() => setCancellingId(s.id)}>
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>

                    {editingId === s.id && (
                      <div className="mt-4 flex items-end gap-3 flex-wrap">
                        <Input label={t('followup.date')} type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} icon="calendar_today" />
                        <Input label={t('followup.time')} type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} icon="schedule" />
                        <Button size="sm" icon="save" onClick={() => handleReschedule(s.id)}>
                          {t('followup.saveChanges')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    )}

                    {cancellingId === s.id && (
                      <div className="mt-4 space-y-3">
                        <Input
                          label={t('followup.cancelReason')}
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          icon="edit_note"
                          placeholder={t('followup.cancelReasonPlaceholder')}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" icon="close" onClick={() => handleCancel(s.id)}>
                            {t('followup.confirmCancel')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setCancellingId(null)}>
                            {t('common.back')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
