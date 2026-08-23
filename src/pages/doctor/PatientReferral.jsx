import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import { referralService } from '../../services/referralService';
import { useNotification } from '../../hooks/useNotification';
import { REFERRAL_DESTINATIONS } from '../../utils/constants';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';

const SIDEBAR = {
  items: [
    { labelKey: 'dashboard', to: '/doctor/dashboard', icon: 'dashboard', end: true },
    { labelKey: 'patientQueue', to: '/doctor/queue', icon: 'groups' },
    { labelKey: 'liveConsultation', to: '/doctor/consultation', icon: 'call' },
    { labelKey: 'followUp', to: '/doctor/followup', icon: 'event_repeat' },
    { labelKey: 'consultationHistory', to: '/doctor/consultation-history', icon: 'video_library' },
    { labelKey: 'performanceAnalytics', to: '/doctor/performance', icon: 'query_stats' },
  ],
};

const PRIORITY_LEVELS = ['Urgent', 'High', 'Normal'];

export default function PatientReferral() {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const sidebarItems = SIDEBAR.items.map((item) => ({ ...item, label: t(`nav.${item.labelKey}`) }));
  const PRIORITY_LABELS = {
    Urgent: t('referral.urgent'),
    High: t('referral.high'),
    Normal: t('referral.normal'),
  };
  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    destination: '',
    priority: 'Urgent',
    reason: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await referralService.create(form);
    setSubmitting(false);
    setSubmitted(result);
    notify({ type: 'success', message: t('referral.sent', { id: result.id }) });
  };

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('referral.title'),
        subtitle: t('referral.subtitle'),
        right: (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <Card title={t('referral.referralDetails')} icon="emergency_home">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t('referral.patientId')} value={form.patientId} onChange={update('patientId')} icon="badge" required />
              <Input label={t('referral.patientName')} value={form.patientName} onChange={update('patientName')} icon="person" required />
              <div className="md:col-span-2">
                <Select
                  label={t('referral.destinationFacility')}
                  value={form.destination}
                  onChange={update('destination')}
                  options={REFERRAL_DESTINATIONS}
                  placeholder={t('referral.selectDestination')}
                  required
                />
              </div>
              <div>
                <Select label={t('referral.priority')} value={form.priority} onChange={update('priority')} options={PRIORITY_LEVELS.map((p) => ({ value: p, label: PRIORITY_LABELS[p] || p }))} required />
              </div>
              <Input label={t('referral.reasonForReferral')} value={form.reason} onChange={update('reason')} placeholder={t('referral.reasonPlaceholder')} icon="stethoscope" required />
            </div>
            <div className="mt-4">
              <label className="block text-label-lg font-semibold text-on-surface ml-1 mb-2">{t('referral.clinicalNotes')}</label>
              <textarea
                value={form.notes}
                onChange={update('notes')}
                rows={4}
                placeholder={t('referral.notesPlaceholder')}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <Button type="submit" loading={submitting} icon="send" size="lg">
                {t('referral.sendReferral')}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => window.history.back()}>
                {t('common.cancel')}
              </Button>
            </div>
          </Card>
        </form>

        <div className="space-y-6">
          {submitted ? (
            <Card title={t('referral.referralConfirmed')} icon="verified" className="border-l-4 border-l-success">
              <div className="space-y-3">
                <Badge variant="success" icon="check">{t('referral.referralId', { id: submitted.id })}</Badge>
                <div className="bg-surface-container-low rounded-lg p-4 space-y-2 text-label-md">
                  <p><span className="text-on-surface-variant">{t('referral.status')}</span> <span className="font-bold text-on-surface">{submitted.status}</span></p>
                  <p><span className="text-on-surface-variant">{t('referral.facility')}</span> <span className="font-bold text-on-surface">{form.destination}</span></p>
                  <p><span className="text-on-surface-variant">{t('referral.priorityLabel')}</span> <span className="font-bold text-on-surface">{PRIORITY_LABELS[form.priority] || form.priority}</span></p>
                </div>
                <p className="text-label-sm text-on-surface-variant">
                  {t('referral.facilityNotified')}
                </p>
              </div>
            </Card>
          ) : (
            <Card title={t('referral.referralGuidelines')} icon="policy">
              <ul className="space-y-3 text-label-md text-on-surface-variant">
                <li className="flex gap-2"><span className="material-symbols-outlined text-sm text-primary">verified_user</span> {t('referral.guideline1')}</li>
                <li className="flex gap-2"><span className="material-symbols-outlined text-sm text-primary">verified_user</span> {t('referral.guideline2')}</li>
                <li className="flex gap-2"><span className="material-symbols-outlined text-sm text-primary">verified_user</span> {t('referral.guideline3')}</li>
                <li className="flex gap-2"><span className="material-symbols-outlined text-sm text-primary">verified_user</span> {t('referral.guideline4')}</li>
              </ul>
            </Card>
          )}

          <Card title={t('referral.recentReferrals')} icon="history">
            <p className="text-label-md text-on-surface-variant py-4 text-center">No recent referrals recorded.</p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
