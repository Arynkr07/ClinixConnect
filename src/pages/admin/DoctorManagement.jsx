import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AdminProfileMenu from '../../components/layout/AdminProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import Input from '../../components/common/Input';
import KPIWidget from '../../components/charts/KPIWidget';
import { adminService } from '../../services/adminService';
import { doctorService } from '../../services/doctorService';
import { useDebounce } from '../../hooks/useDebounce';
import { useNotification } from '../../hooks/useNotification';
import { adminSidebarItems } from './adminNav';
import { SPECIALIZATIONS, SLOT_DURATIONS } from '../../utils/constants';

const EMPTY_FORM = {
  name: '',
  specialty: 'General Medicine',
  email: '',
  phone: '',
  workStart: '09:00',
  workEnd: '17:00',
  slotDuration: 30,
};

export default function DoctorManagement() {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Leave Management State
  const [leaveDoctor, setLeaveDoctor] = useState(null);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [savingLeave, setSavingLeave] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await doctorService.getAll();
      setDoctors(data);
    } catch {
      const data = await adminService.getDoctors();
      setDoctors(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sidebarItems = adminSidebarItems(t);

  const filtered = doctors.filter(
    (d) =>
      !debouncedQuery ||
      d.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      (d.specialty || d.specialization || '').toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      (d.id || '').toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      (d.facility || d.hospital || '').toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.name.trim()) {
      notify({ type: 'error', message: 'Please enter Doctor Full Name.' });
      return;
    }
    setSaving(true);
    try {
      const doctorName = form.name.trim().startsWith('Dr.') ? form.name.trim() : `Dr. ${form.name.trim()}`;
      const created = await doctorService.create({
        name: doctorName,
        specialty: form.specialty,
        specialization: form.specialty,
        email: form.email,
        phone: form.phone,
        workingHours: { start: form.workStart, end: form.workEnd },
        slotDuration: Number(form.slotDuration),
        facility: 'Primary Health Centre',
        hospital: 'Primary Health Centre',
        verification: 'Verified',
        status: 'Online',
        joinedOn: new Date().toLocaleDateString(),
      });
      notify({ type: 'success', message: t('doctorsMgmt.added', { id: created.id || created.doctorId || 'Success' }) });
      setShowModal(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      console.error('[DoctorManagement] handleCreate error:', err);
      notify({ type: 'error', message: err?.response?.data?.message || err?.message || 'Could not create doctor profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (doctor) => {
    await adminService.verifyDoctor(doctor.id);
    setDoctors((prev) => prev.map((d) => (d.id === doctor.id ? { ...d, verification: 'Verified' } : d)));
    notify({ type: 'success', message: t('doctorsMgmt.verified', { name: doctor.name }) });
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveDoctor || !leaveDate) {
      notify({ type: 'error', message: 'Please select a valid leave date.' });
      return;
    }

    setSavingLeave(true);
    try {
      const res = await doctorService.markLeave(leaveDoctor.id, leaveDate, leaveReason);
      notify({
        type: 'success',
        message: res.message || `Leave recorded for ${leaveDoctor.name}.`,
      });
      setLeaveDoctor(null);
      setLeaveDate('');
      setLeaveReason('');
      load(); // Refresh state
    } catch {
      notify({ type: 'error', message: 'Could not apply leave schedule.' });
    } finally {
      setSavingLeave(false);
    }
  };

  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditModal = (doc) => {
    setEditingDoctor(doc);
    setEditForm({
      name: doc.name || '',
      specialty: doc.specialty || doc.specialization || 'General Medicine',
      workStart: doc.workingHours?.start || '09:00',
      workEnd: doc.workingHours?.end || '17:00',
      slotDuration: doc.slotDuration || 30,
      email: doc.email || '',
      phone: doc.phone || '',
      facility: doc.facility || doc.hospital || 'District Health Centre',
    });
  };

  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;

    setSavingEdit(true);
    try {
      const doctorName = editForm.name.trim().startsWith('Dr.') ? editForm.name.trim() : `Dr. ${editForm.name.trim()}`;
      await doctorService.update(editingDoctor.id, {
        name: doctorName,
        specialty: editForm.specialty,
        specialization: editForm.specialty,
        email: editForm.email,
        phone: editForm.phone,
        workingHours: { start: editForm.workStart, end: editForm.workEnd },
        slotDuration: Number(editForm.slotDuration),
        facility: editForm.facility || 'District Health Centre',
        hospital: editForm.facility || 'District Health Centre',
      });

      notify({ type: 'success', message: `${doctorName}'s working hours and slot duration updated successfully!` });
      setEditingDoctor(null);
      await load();
    } catch (err) {
      notify({ type: 'error', message: err.message || 'Could not update doctor details.' });
    } finally {
      setSavingEdit(false);
    }
  };

  const [leaveRequests, setLeaveRequests] = useState([]);

  const loadLeaveRequests = useCallback(async () => {
    try {
      const reqs = await doctorService.getLeaveRequests();
      setLeaveRequests(Array.isArray(reqs) ? reqs : []);
    } catch (e) {
      console.error('Failed to load leave requests:', e);
    }
  }, []);

  useEffect(() => {
    loadLeaveRequests();
    const handleFocus = () => loadLeaveRequests();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleFocus);
    const interval = setInterval(loadLeaveRequests, 3000);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleFocus);
      clearInterval(interval);
    };
  }, [loadLeaveRequests]);

  const handleApproveLeave = async (req) => {
    const res = await doctorService.approveLeaveRequest(req.id);
    if (res.success) {
      notify({ type: 'success', message: res.message });
      loadLeaveRequests();
      load();
    }
  };

  const handleRejectLeave = async (req) => {
    const res = await doctorService.rejectLeaveRequest(req.id);
    if (res.success) {
      notify({ type: 'info', message: 'Leave request rejected.' });
      loadLeaveRequests();
    }
  };

  const onlineCount = doctors.filter((d) => d.status === 'Online').length;
  const pendingCount = doctors.filter((d) => d.verification === 'Pending').length;
  const avgRating = doctors.length
    ? (doctors.reduce((acc, d) => acc + (Number(d.rating) || 0), 0) / doctors.length).toFixed(1)
    : '—';

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('doctorsMgmt.title'),
        subtitle: t('doctorsMgmt.doctorsRegistered', { count: doctors.length }),
        right: (
          <div className="flex items-center gap-3">
            <Button icon="person_add" onClick={() => setShowModal(true)}>
              {t('doctorsMgmt.addDoctor')}
            </Button>
            <AdminProfileMenu />
          </div>
        ),
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <KPIWidget label={t('doctorsMgmt.totalDoctors')} value={doctors.length} icon="medical_services" color="primary" trend={8} />
        <KPIWidget label={t('doctorsMgmt.onlineNow')} value={onlineCount} icon="online_prediction" color="secondary" trend={4} />
        <KPIWidget label={t('doctorsMgmt.pendingVerification')} value={pendingCount} icon="verified_user" color="tertiary" trend={-2} />
        <KPIWidget label={t('doctorsMgmt.avgRating')} value={avgRating} icon="star" color="error" trend={1} />
      </div>

      <div className="mb-8">
        <Card
          title="Doctor Leave Requests & Approvals"
          icon="event_busy"
          subtitle="Review pending doctor leave requests to approve automatic patient rescheduling"
          headerRight={
            <Button size="sm" variant="outline" icon="refresh" onClick={loadLeaveRequests}>
              Refresh Requests
            </Button>
          }
        >
          {leaveRequests.length === 0 ? (
            <div className="text-center py-6 text-on-surface-variant flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-xl opacity-60">check_circle</span>
              <span className="text-body-md">No pending doctor leave requests at this time.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {leaveRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between bg-surface-container-low p-4 rounded-xl flex-wrap gap-3 border border-outline-variant/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface text-body-lg">{req.doctorName}</span>
                      <span className="text-label-sm text-on-surface-variant">({req.doctorId || 'Doctor'})</span>
                      <Badge variant={req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'error' : 'warning'}>
                        {req.status}
                      </Badge>
                    </div>
                    <p className="text-label-md text-on-surface-variant mt-1">
                      Leave Date: <span className="font-bold text-on-surface">{req.date}</span> · Reason: <span className="font-semibold text-on-surface">{req.reason || 'Personal Leave'}</span>
                    </p>
                  </div>
                  {req.status === 'Pending Approval' && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" icon="check_circle" onClick={() => handleApproveLeave(req)}>
                        Approve & Auto-Reschedule Patients
                      </Button>
                      <Button size="sm" variant="outline" icon="cancel" onClick={() => handleRejectLeave(req)}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card
        title={t('doctorsMgmt.registeredDoctors')}
        subtitle={t('doctorsMgmt.manageProfiles')}
        headerRight={<SearchBar placeholder={t('doctorsMgmt.searchDoctors')} onSearch={setQuery} containerClassName="w-72" />}
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-primary text-on-primary text-label-md">
                  <th className="px-5 py-3.5 font-headline font-semibold">{t('doctorsMgmt.doctor')}</th>
                  <th className="px-5 py-3.5 font-headline font-semibold">Specialty</th>
                  <th className="px-5 py-3.5 font-headline font-semibold">Hours & Slots</th>
                  <th className="px-5 py-3.5 font-headline font-semibold">{t('doctorsMgmt.facility')}</th>
                  <th className="px-5 py-3.5 font-headline font-semibold">Leave Days</th>
                  <th className="px-5 py-3.5 font-headline font-semibold">{t('doctorsMgmt.status')}</th>
                  <th className="px-5 py-3.5 font-headline font-semibold">{t('doctorsMgmt.actions')}</th>
                </tr>
              </thead>
              <tbody className="text-body-sm">
                {filtered.map((d) => {
                  const hasLeave = (d.leaveDays || []).length > 0;
                  return (
                    <tr key={d.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline font-bold shrink-0">
                            {d.name.replace('Dr. ', '').split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <span className="font-bold text-on-surface block">{d.name}</span>
                            <span className="text-label-xs text-primary font-mono">{d.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-on-surface-variant">
                        {d.specialty || d.specialization || 'General Medicine'}
                      </td>
                      <td className="px-5 py-4 text-on-surface-variant">
                        <div>
                          <span className="font-semibold text-on-surface">{d.workingHours?.start || '09:00'} – {d.workingHours?.end || '17:00'}</span>
                          <span className="text-label-xs block text-outline">{d.slotDuration || 30} mins slot</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-on-surface-variant">{d.facility || d.hospital || 'District Hospital'}</td>
                      <td className="px-5 py-4">
                        {hasLeave ? (
                          <span className="text-error font-semibold text-label-sm">
                            {d.leaveDays.map((l) => String(l).slice(5, 10)).join(', ')}
                          </span>
                        ) : (
                          <span className="text-outline text-label-sm">No leave</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={d.status === 'On Leave' || hasLeave ? 'error' : d.status === 'Online' ? 'success' : 'neutral'}
                          dot
                          dotColor={d.status === 'On Leave' || hasLeave ? 'bg-error' : d.status === 'Online' ? 'bg-success' : 'bg-outline'}
                        >
                          {d.status === 'On Leave' || hasLeave ? 'On Leave' : d.status || 'Active'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            icon="edit"
                            onClick={() => openEditModal(d)}
                          >
                            Edit Schedule
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon="event_busy"
                            onClick={() => {
                              setLeaveDoctor(d);
                              setLeaveDate(new Date().toISOString().slice(0, 10));
                            }}
                          >
                            Mark Leave
                          </Button>
                          {d.verification === 'Pending' && (
                            <Button size="sm" variant="outline" icon="verified_user" onClick={() => handleVerify(d)}>
                              {t('doctorsMgmt.verify')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Doctor Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={t('doctorsMgmt.addNewDoctor')} icon="person_add" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Doctor Full Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Dr. Rajesh Sharma"
            icon="person"
            required
          />
          <div>
            <label className="block text-label-lg font-semibold text-on-surface ml-1 mb-2">Specialisation</label>
            <select
              value={form.specialty}
              onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
              className="w-full h-14 bg-surface-container-low border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary"
            >
              {SPECIALIZATIONS.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Working Start Time"
              type="time"
              value={form.workStart}
              onChange={(e) => setForm((f) => ({ ...f, workStart: e.target.value }))}
              required
            />
            <Input
              label="Working End Time"
              type="time"
              value={form.workEnd}
              onChange={(e) => setForm((f) => ({ ...f, workEnd: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-label-lg font-semibold text-on-surface ml-1 mb-2">Slot Duration (Minutes)</label>
            <select
              value={form.slotDuration}
              onChange={(e) => setForm((f) => ({ ...f, slotDuration: Number(e.target.value) }))}
              className="w-full h-14 bg-surface-container-low border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary"
            >
              {SLOT_DURATIONS.map((dur) => (
                <option key={dur} value={dur}>{dur} Minutes</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('doctorsMgmt.email')}
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder={t('doctorsMgmt.emailPlaceholder')}
              icon="mail"
              required
            />
            <Input
              label={t('doctorsMgmt.phone')}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder={t('doctorsMgmt.phonePlaceholder')}
              icon="call"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving} icon="person_add">{t('doctorsMgmt.addDoctor')}</Button>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Doctor Leave Management Modal */}
      {leaveDoctor && (
        <Modal
          open={Boolean(leaveDoctor)}
          onClose={() => setLeaveDoctor(null)}
          title={t('leaveMgmt.title')}
          icon="event_busy"
          size="md"
        >
          <form onSubmit={handleLeaveSubmit} className="space-y-5">
            <div className="bg-surface-container-low p-4 rounded-xl text-label-md">
              <span className="text-on-surface-variant block">Doctor Profile</span>
              <span className="font-bold text-on-surface text-title-sm">{leaveDoctor.name} ({leaveDoctor.specialty || leaveDoctor.specialization})</span>
            </div>

            <Input
              label={t('leaveMgmt.leaveDate')}
              type="date"
              value={leaveDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setLeaveDate(e.target.value)}
              icon="calendar_today"
              required
            />

            <Input
              label={t('leaveMgmt.reason')}
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder={t('leaveMgmt.reasonPlaceholder')}
              icon="description"
            />

            <div className="bg-error-container/20 border border-error/30 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-error text-xl shrink-0 mt-0.5">warning</span>
              <p className="text-body-sm text-on-surface leading-relaxed">
                {t('leaveMgmt.affectedWarning')}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={savingLeave} icon="event_busy" variant="danger">
                {t('leaveMgmt.confirmLeave')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setLeaveDoctor(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Doctor & Working Schedule Modal */}
      {editingDoctor && (
        <Modal
          open={Boolean(editingDoctor)}
          onClose={() => setEditingDoctor(null)}
          title="Edit Doctor & Working Schedule"
          icon="edit_calendar"
          size="md"
        >
          <form onSubmit={handleUpdateDoctor} className="space-y-4">
            <Input
              label="Doctor Full Name *"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Dr. Rajesh Sharma"
              icon="person"
              required
            />
            <div>
              <label className="block text-label-lg font-semibold text-on-surface ml-1 mb-2">Specialisation</label>
              <select
                value={editForm.specialty}
                onChange={(e) => setEditForm((f) => ({ ...f, specialty: e.target.value }))}
                className="w-full h-14 bg-surface-container-low border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary"
              >
                {SPECIALIZATIONS.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Working Start Time *"
                type="time"
                value={editForm.workStart}
                onChange={(e) => setEditForm((f) => ({ ...f, workStart: e.target.value }))}
                required
              />
              <Input
                label="Working End Time *"
                type="time"
                value={editForm.workEnd}
                onChange={(e) => setEditForm((f) => ({ ...f, workEnd: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-label-lg font-semibold text-on-surface ml-1 mb-2">Slot Duration (Minutes) *</label>
              <select
                value={editForm.slotDuration}
                onChange={(e) => setEditForm((f) => ({ ...f, slotDuration: Number(e.target.value) }))}
                className="w-full h-14 bg-surface-container-low border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary"
              >
                {SLOT_DURATIONS.map((dur) => (
                  <option key={dur} value={dur}>{dur} Minutes</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email Address"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                icon="mail"
                required
              />
              <Input
                label="Phone Number"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                icon="call"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={savingEdit} icon="check_circle">
                Save Schedule & Profile Changes
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingDoctor(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}
