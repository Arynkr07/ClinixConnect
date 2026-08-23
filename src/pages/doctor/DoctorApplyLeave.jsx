import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { doctorService } from '../../services/doctorService';
import { doctorSidebarItems } from './doctorNav';

export default function DoctorApplyLeave() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { notify } = useNotification();
  const sidebarItems = doctorSidebarItems(t);

  const [leaveDate, setLeaveDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    try {
      const all = await doctorService.getLeaveRequests();
      const myId = user?.doctorId || user?.id || 'dr-1';
      const myName = user?.name || 'Dr. Rajesh Sharma';

      const filtered = Array.isArray(all)
        ? all.filter(
            (r) =>
              r.doctorId === myId ||
              r.doctorName?.toLowerCase() === myName.toLowerCase() ||
              all.length === 1
          )
        : [];
      setRequests(filtered);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!leaveDate) {
      notify({ type: 'error', message: 'Please select a leave date.' });
      return;
    }
    if (!reason.trim()) {
      notify({ type: 'error', message: 'Please enter a reason for your leave.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await doctorService.requestLeave({
        doctorId: user?.doctorId || user?.id || 'dr-1',
        doctorName: user?.name || 'Dr. Rajesh Sharma',
        date: leaveDate,
        reason: reason.trim(),
      });

      if (res.success) {
        notify({ type: 'success', message: 'Leave request submitted successfully! Awaiting Admin approval.' });
        setReason('');
        loadRequests();
      } else {
        notify({ type: 'error', message: res.message || 'Could not submit leave request.' });
      }
    } catch {
      notify({ type: 'error', message: 'Failed to submit leave request.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <Badge variant="success" icon="check_circle">Approved by Admin</Badge>;
      case 'Rejected':
        return <Badge variant="error" icon="cancel">Rejected by Admin</Badge>;
      default:
        return <Badge variant="warning" icon="hourglass_empty">Awaiting Admin Approval</Badge>;
    }
  };

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: 'Apply for Doctor Leave',
        subtitle: 'Submit leave requests for Admin review and automated patient rescheduling',
        right: (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEAVE APPLICATION FORM */}
        <Card title="New Leave Application" icon="event_busy" className="lg:col-span-1">
          <form onSubmit={handleSubmitLeave} className="space-y-5">
            <Input
              label="Leave Date *"
              type="date"
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              required
              icon="calendar_month"
            />

            <div>
              <label className="block text-label-lg font-semibold text-on-surface mb-2">
                Reason for Leave *
              </label>
              <textarea
                rows={4}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Attending Annual Medical Conference / Personal Leave..."
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-body-md"
              />
            </div>

            <div className="bg-surface-container-low/80 p-4 rounded-xl text-label-sm text-on-surface-variant leading-relaxed border border-outline-variant/30">
              <span className="material-symbols-outlined text-primary text-base align-middle mr-1">info</span>
              Once approved by the Admin, any scheduled patient consultations on this date will be automatically rescheduled to the next available slot and patients will be notified.
            </div>

            <Button type="submit" fullWidth loading={submitting} size="lg" icon="send">
              Submit Leave Request to Admin
            </Button>
          </form>
        </Card>

        {/* MY LEAVE REQUESTS & ADMIN APPROVAL STATUS */}
        <Card title="My Leave Requests & Admin Status" icon="history" className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-4xl opacity-40">event_available</span>
              <p className="font-semibold text-body-lg">No leave requests submitted yet.</p>
              <p className="text-label-md opacity-80">Use the form on the left to submit a leave request for Admin approval.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl border border-outline-variant/30 bg-surface-container-low/50 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 pb-3">
                    <div>
                      <span className="text-label-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Leave Date</span>
                      <span className="text-title-md font-bold text-on-surface">{req.date}</span>
                    </div>
                    <div>{getStatusBadge(req.status)}</div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-label-sm font-semibold text-on-surface-variant">Reason:</p>
                    <p className="text-body-md text-on-surface bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                      {req.reason}
                    </p>
                  </div>

                  <div className="text-label-xs text-on-surface-variant flex items-center justify-between pt-1">
                    <span>Submitted on: {new Date(req.requestedAt || Date.now()).toLocaleDateString()}</span>
                    {req.approvedAt && <span>Approved on: {new Date(req.approvedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
