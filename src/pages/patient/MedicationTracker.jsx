import { useEffect, useState } from 'react';
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
import { patientSidebarItems } from './patientNav';

const parseScheduleSlots = (med) => {
  const slots = [];
  const freq = (med.frequency || '').toLowerCase();
  const sched = med.schedule || {};

  const wantMorning =
    sched.morning ||
    freq.includes('morning') ||
    freq.includes('once') ||
    freq.includes('daily') ||
    freq.includes('1-0-1') ||
    freq.includes('1-1-1') ||
    freq.includes('twice') ||
    (!sched.afternoon && !sched.night && !freq);

  const wantAfternoon =
    sched.afternoon ||
    freq.includes('afternoon') ||
    freq.includes('twice') ||
    freq.includes('1-1-1') ||
    freq.includes('thrice');

  const wantNight =
    sched.night ||
    freq.includes('night') ||
    freq.includes('bedtime') ||
    freq.includes('1-0-1') ||
    freq.includes('1-1-1') ||
    freq.includes('thrice');

  if (wantMorning) {
    slots.push({
      slot: 'Morning',
      time: '08:30 AM',
      instructions: `${med.dosage || '1 Dose'} after breakfast`,
    });
  }
  if (wantAfternoon) {
    slots.push({
      slot: 'Afternoon',
      time: '01:30 PM',
      instructions: `${med.dosage || '1 Dose'} after lunch`,
    });
  }
  if (wantNight) {
    slots.push({
      slot: 'Night',
      time: '09:00 PM',
      instructions: `${med.dosage || '1 Dose'} before bedtime`,
    });
  }

  return slots;
};

export default function MedicationTracker() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { notify } = useNotification();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [takenStatus, setTakenStatus] = useState(() => {
    try {
      const raw = localStorage.getItem('jd_med_reminders_status');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [activeSlot, setActiveSlot] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [customForm, setCustomForm] = useState({
    medicineName: '',
    dosage: '1 Tablet',
    slot: 'Morning',
    time: '08:30 AM',
    instructions: 'Take with water after meal',
  });

  const sidebarItems = patientSidebarItems(t);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem('savedPrescriptions') || '[]');
        const customReminders = JSON.parse(localStorage.getItem('jd_custom_med_reminders') || '[]');
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
            const slots = parseScheduleSlots(med);
            slots.forEach((s) => {
              items.push({
                id: `${med.id || med.medicineName}-${s.slot.toLowerCase()}`,
                medicine: med.medicineName || 'Prescribed Medicine',
                slot: s.slot,
                time: s.time,
                instructions: `${med.dosage || '1 Dose'} (${med.duration ? `${med.duration} days` : 'Daily'}) · ${s.instructions}`,
                purpose: rx.diagnosis || 'Clinical Prescription',
                prescribedBy: rx.doctorName || 'Attending Physician',
              });
            });
          });
        });

        // Append user custom added reminders
        if (Array.isArray(customReminders)) {
          customReminders.forEach((c) => {
            items.push(c);
          });
        }

        const rawDeleted = localStorage.getItem('jd_deleted_reminders');
        const deletedSet = new Set(rawDeleted ? JSON.parse(rawDeleted) : []);

        setSchedule(items.filter((m) => !deletedSet.has(m.id)));
      } catch (err) {
        console.error('Failed to load medication schedule:', err);
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
        if (raw) setTakenStatus(JSON.parse(raw));

        const rawDeleted = localStorage.getItem('jd_deleted_reminders');
        const deletedSet = new Set(rawDeleted ? JSON.parse(rawDeleted) : []);
        setSchedule((prev) => prev.filter((item) => !deletedSet.has(item.id)));
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

  const handleDeleteReminder = (id, medName) => {
    if (!window.confirm(`Are you sure you want to remove the reminder for ${medName}?`)) return;

    try {
      const rawDeleted = localStorage.getItem('jd_deleted_reminders');
      const deletedList = rawDeleted ? JSON.parse(rawDeleted) : [];
      if (!deletedList.includes(id)) {
        deletedList.push(id);
        localStorage.setItem('jd_deleted_reminders', JSON.stringify(deletedList));
      }

      const customReminders = JSON.parse(localStorage.getItem('jd_custom_med_reminders') || '[]');
      const updatedCustom = customReminders.filter((c) => c.id !== id);
      localStorage.setItem('jd_custom_med_reminders', JSON.stringify(updatedCustom));

      window.dispatchEvent(new window.CustomEvent('jd_med_status_updated'));
    } catch (e) {
      console.warn('Failed to delete reminder:', e);
    }

    setSchedule((prev) => prev.filter((item) => item.id !== id));
    notify({ type: 'info', message: `Removed reminder for ${medName}.` });
  };

  const toggleDose = (id, medName) => {
    setTakenStatus((prev) => {
      const nextState = !prev[id];
      if (nextState) {
        notify({ type: 'success', message: `Marked ${medName} as taken!` });
      }
      const updated = { ...prev, [id]: nextState };
      try {
        localStorage.setItem('jd_med_reminders_status', JSON.stringify(updated));
        window.dispatchEvent(new window.CustomEvent('jd_med_status_updated'));
      } catch {
        /* ignore */
      }
      return updated;
    });
  };

  const handleAddCustomReminder = (e) => {
    e.preventDefault();
    if (!customForm.medicineName.trim()) {
      notify({ type: 'error', message: 'Please enter medicine name.' });
      return;
    }

    const newReminder = {
      id: `custom-med-${Date.now()}`,
      medicine: customForm.medicineName,
      slot: customForm.slot,
      time: customForm.time,
      instructions: `${customForm.dosage} · ${customForm.instructions}`,
      purpose: 'Self-Added Reminder',
      prescribedBy: 'Personal Tracker',
    };

    try {
      const existing = JSON.parse(localStorage.getItem('jd_custom_med_reminders') || '[]');
      existing.push(newReminder);
      localStorage.setItem('jd_custom_med_reminders', JSON.stringify(existing));
    } catch {
      /* ignore */
    }

    setSchedule((prev) => [...prev, newReminder]);
    setShowAddModal(false);
    setCustomForm({
      medicineName: '',
      dosage: '1 Tablet',
      slot: 'Morning',
      time: '08:30 AM',
      instructions: 'Take with water after meal',
    });
    notify({ type: 'success', message: `Added reminder for ${customForm.medicineName}` });
  };

  const filtered = schedule.filter((m) => activeSlot === 'All' || m.slot === activeSlot);

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('patient.medicationTracker'),
        subtitle: 'Daily medication reminders and dosage tracking',
        right: (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {['All', 'Morning', 'Afternoon', 'Night'].map((slot) => (
              <Button
                key={slot}
                variant={activeSlot === slot ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveSlot(slot)}
              >
                {slot}
              </Button>
            ))}
          </div>

          <Button size="sm" icon="add_alarm" onClick={() => setShowAddModal(true)}>
            Add Custom Reminder
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-4 text-primary">
              <span className="material-symbols-outlined text-4xl">medication</span>
            </div>
            <h3 className="font-headline text-title-lg font-bold text-on-surface">No Active Medication Reminders</h3>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto mt-2 mb-6">
              You currently have no dosage reminders scheduled. When a doctor issues a prescription or when you add custom reminders, your daily morning, afternoon, and night dosage notifications will appear here.
            </p>
            <Button icon="add_alarm" onClick={() => setShowAddModal(true)}>
              Add Custom Reminder
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((item) => {
              const isTaken = Boolean(takenStatus[item.id]);
              return (
                <Card
                  key={item.id}
                  className={`transition-all ${isTaken ? 'opacity-70 bg-surface-container-low border-outline-variant/30' : 'hover:border-primary/40'}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <Badge variant={item.slot === 'Morning' ? 'warning' : item.slot === 'Afternoon' ? 'neutral' : 'primary'}>
                        {item.slot} · {item.time}
                      </Badge>
                      <h4 className="font-headline text-title-md font-bold text-on-surface mt-2">{item.medicine}</h4>
                    </div>
                  </div>

                  <p className="text-body-md text-on-surface-variant font-medium mb-1">{item.instructions}</p>
                  <p className="text-label-sm text-outline mb-4">Reason: {item.purpose}</p>

                  <div className="border-t border-outline-variant/30 pt-3 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-label-sm text-on-surface-variant">By {item.prescribedBy}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        icon="delete"
                        className="text-error hover:bg-error-container/20 border-error/40 px-2.5"
                        onClick={() => handleDeleteReminder(item.id, item.medicine)}
                      >
                        Remove
                      </Button>
                      <Button
                        size="sm"
                        variant={isTaken ? 'outline' : 'primary'}
                        icon={isTaken ? 'check_circle' : 'circle'}
                        onClick={() => toggleDose(item.id, item.medicine)}
                      >
                        {isTaken ? 'Dose Taken' : 'Mark as Taken'}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Custom Reminder Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Medication Reminder" icon="add_alarm" size="md">
        <form onSubmit={handleAddCustomReminder} className="space-y-4">
          <Input
            label="Medicine Name *"
            value={customForm.medicineName}
            onChange={(e) => setCustomForm((f) => ({ ...f, medicineName: e.target.value }))}
            placeholder="e.g. Paracetamol 500mg"
            icon="medication"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Dosage"
              value={customForm.dosage}
              onChange={(e) => setCustomForm((f) => ({ ...f, dosage: e.target.value }))}
              placeholder="e.g. 1 Tablet"
              icon="edit_note"
            />
            <div>
              <label className="block text-label-lg font-semibold text-on-surface ml-1 mb-2">Time Slot</label>
              <select
                value={customForm.slot}
                onChange={(e) => {
                  const s = e.target.value;
                  const tStr = s === 'Morning' ? '08:30 AM' : s === 'Afternoon' ? '01:30 PM' : '09:00 PM';
                  setCustomForm((f) => ({ ...f, slot: s, time: tStr }));
                }}
                className="w-full h-14 bg-surface-container-low border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary"
              >
                <option value="Morning">Morning (08:30 AM)</option>
                <option value="Afternoon">Afternoon (01:30 PM)</option>
                <option value="Night">Night (09:00 PM)</option>
              </select>
            </div>
          </div>

          <Input
            label="Instructions"
            value={customForm.instructions}
            onChange={(e) => setCustomForm((f) => ({ ...f, instructions: e.target.value }))}
            placeholder="e.g. Take after meal with warm water"
            icon="description"
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" icon="save">Save Reminder</Button>
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
