import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AdminProfileMenu from '../../components/layout/AdminProfileMenu';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { useNotification } from '../../hooks/useNotification';
import { adminSidebarItems } from './adminNav';

const CONFIG_STORAGE_KEY = 'jd_platform_config';

const DEFAULT_CONFIG = {
  twoFactor: true,
  emailAlerts: true,
  smsAlerts: true,
  autoAudit: true,
  offlineMode: false,
  mlRisk: true,
  defaultLanguage: 'English',
  timeZone: 'Asia/Kolkata (IST)',
  emergencyContact: '+91 1800-00-0101',
  dataRetention: 60,
};

function Toggle({ label, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-outline-variant last:border-0">
      <div>
        <p className="font-bold text-on-surface">{label}</p>
        <p className="text-label-md text-on-surface-variant">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-surface-container-highest border border-outline-variant'}`}
        aria-label={label}
      >
        <span
          className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${enabled ? 'left-7' : 'left-1'}`}
        />
      </button>
    </div>
  );
}

export default function PlatformConfiguration() {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* ignore storage errors */
    }
  }, [config]);

  const toggle = (key) => setConfig((c) => ({ ...c, [key]: !c[key] }));
  const updateField = (key, val) => setConfig((c) => ({ ...c, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      notify({ type: 'success', message: 'Platform configuration updated & saved successfully!' });
    } catch {
      notify({ type: 'error', message: 'Could not save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetData = () => {
    if (adminPin !== '1234' && adminPin !== 'admin') {
      notify({ type: 'error', message: 'Invalid Admin PIN. Enter 1234 or admin to confirm.' });
      return;
    }
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    localStorage.removeItem('jd_doctor_availability');
    setConfig(DEFAULT_CONFIG);
    setShowResetModal(false);
    setAdminPin('');
    notify({ type: 'success', message: 'Platform state reset successfully.' });
  };

  const toggleGroups = [
    {
      title: 'Security',
      icon: 'security',
      items: [
        { key: 'twoFactor', label: 'Two-Factor Authentication', description: 'Require OTP for all staff logins' },
        { key: 'autoAudit', label: 'Automatic Audit Logging', description: 'Record every high-risk case action' },
      ],
    },
    {
      title: 'Notifications',
      icon: 'notifications',
      items: [
        { key: 'emailAlerts', label: 'Email Alerts', description: 'Send critical alerts by email' },
        { key: 'smsAlerts', label: 'SMS Alerts', description: 'Send critical alerts to patient phones' },
      ],
    },
    {
      title: 'Clinical Features',
      icon: 'medical_services',
      items: [
        { key: 'mlRisk', label: 'ML Risk Prediction', description: 'Use ML models to flag high-risk patients' },
        { key: 'offlineMode', label: 'Offline Mode', description: 'Allow field workers to capture data without network' },
      ],
    },
  ];

  const sidebarItems = adminSidebarItems(t);

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{ title: t('config.title'), subtitle: t('config.subtitle'), right: <AdminProfileMenu /> }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {toggleGroups.map((group) => (
            <Card key={group.title} title={group.title} icon={group.icon}>
              {group.items.map((item) => (
                <Toggle
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  enabled={Boolean(config[item.key])}
                  onChange={() => toggle(item.key)}
                />
              ))}
            </Card>
          ))}

          <Card title="Regional Settings" icon="public">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Default Language"
                value={config.defaultLanguage}
                onChange={(e) => updateField('defaultLanguage', e.target.value)}
                icon="translate"
              />
              <Input
                label="Time Zone"
                value={config.timeZone}
                onChange={(e) => updateField('timeZone', e.target.value)}
                icon="schedule"
              />
              <Input
                label="Emergency Contact"
                value={config.emergencyContact}
                onChange={(e) => updateField('emergencyContact', e.target.value)}
                icon="call"
              />
              <Input
                label="Data Retention (months)"
                value={config.dataRetention}
                onChange={(e) => updateField('dataRetention', Number(e.target.value))}
                type="number"
                icon="database"
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Save Changes" icon="save">
            <p className="text-label-md text-on-surface-variant mb-4">
              Configuration changes take effect immediately across all portals.
            </p>
            <Button fullWidth onClick={handleSave} loading={saving} icon="save">Save Configuration</Button>
          </Card>

          <Card title="System Status" icon="monitor_heart">
            <div className="space-y-3">
              {[
                { label: 'API Service', status: 'Operational', dot: 'bg-success' },
                { label: 'MongoDB Atlas', status: 'Connected', dot: 'bg-success' },
                { label: 'ML Inference', status: config.mlRisk ? 'Active' : 'Disabled', dot: config.mlRisk ? 'bg-success' : 'bg-outline' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-on-surface-variant text-label-md">{row.label}</span>
                  <Badge variant="neutral" dot dotColor={row.dot}>{row.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Danger Zone" icon="warning" className="border-l-4 border-l-error">
            <p className="text-label-md text-on-surface-variant mb-4">
              Resetting the platform clears all cached state. This cannot be undone.
            </p>
            <Button variant="danger" fullWidth onClick={() => setShowResetModal(true)} icon="delete_forever">
              Reset Platform Data
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Confirm Platform Reset"
        icon="warning"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon="delete_forever" onClick={handleResetData}>
              Reset Platform Data
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-body-md text-on-surface">
            Are you sure you want to reset platform configuration and temporary caches?
          </p>
          <Input
            label="Admin PIN / Password"
            type="password"
            placeholder="Enter 1234 to confirm"
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}
