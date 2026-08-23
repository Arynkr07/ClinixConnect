import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AdminProfileMenu from '../../components/layout/AdminProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import KPIWidget from '../../components/charts/KPIWidget';
import EmptyState from '../../components/common/EmptyState';
import { adminService } from '../../services/adminService';
import { useNotification } from '../../hooks/useNotification';
import { adminSidebarItems } from './adminNav';

const severityVariant = (severity) =>
  severity === 'Critical' ? 'critical' : severity === 'High' ? 'warning' : severity === 'Medium' ? 'secondary' : 'neutral';

const escalationVariant = (status) =>
  status === 'Pending' ? 'warning' : status === 'Accepted' ? 'secondary' : 'success';

export default function AlertsEscalations() {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [alerts, setAlerts] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('alerts');

  useEffect(() => {
    const load = async () => {
      const [a, esc, auditLogs] = await Promise.all([
        adminService.getAlerts(),
        adminService.getEscalations(),
        adminService.getAuditLogs(),
      ]);
      setAlerts(a);
      setEscalations(esc);
      setAudit(auditLogs);
      setLoading(false);
    };
    load();
  }, []);

  const sidebarItems = adminSidebarItems(t);

  const handleResolve = async (alert) => {
    try {
      await adminService.resolveAlert(alert.id);
      setAlerts((prev) =>
        prev.map((al) => (al.id === alert.id ? { ...al, status: 'Resolved' } : al))
      );

      // Record resolution in audit log
      try {
        const existingAudit = JSON.parse(localStorage.getItem('jd_audit_logs') || '[]');
        const newAuditEntry = {
          id: `AUD-${Date.now().toString(36).toUpperCase()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          patientId: alert.region || alert.id,
          risk: alert.severity || 'High',
          handledBy: 'Admin (Resolved)',
          outcome: `Alert ${alert.id} resolved by Admin`,
          status: 'completed',
        };
        const updatedAudit = [newAuditEntry, ...existingAudit];
        localStorage.setItem('jd_audit_logs', JSON.stringify(updatedAudit));
        setAudit(updatedAudit);
      } catch {
        /* ignore */
      }

      notify({ type: 'success', message: `Alert ${alert.id} resolved successfully! Added to Audit Log.` });
    } catch {
      setAlerts((prev) =>
        prev.map((al) => (al.id === alert.id ? { ...al, status: 'Resolved' } : al))
      );
      notify({ type: 'success', message: `Alert ${alert.id} marked as resolved.` });
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === 'Active').length;
  const pendingEscalations = escalations.filter((e) => e.status === 'Pending').length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'Critical').length;

  const tabs = [
    { key: 'alerts', label: t('alerts.activeAlerts'), icon: 'notifications_active' },
    { key: 'escalations', label: t('alerts.escalationQueue'), icon: 'north_east' },
    { key: 'audit', label: t('alerts.auditTrail'), icon: 'verified_user' },
  ];

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('alerts.title'),
        subtitle: t('alerts.subtitle'),
        right: (
          <>
            {activeAlerts > 0 ? (
              <Badge variant="critical" icon="priority_high">{t('alerts.activeCount', { count: activeAlerts })}</Badge>
            ) : null}
            <AdminProfileMenu />
          </>
        ),
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPIWidget label={t('alerts.activeAlerts')} value={activeAlerts} icon="notifications_active" color="error" trend={2} />
        <KPIWidget label={t('alerts.pendingEscalations')} value={pendingEscalations} icon="north_east" color="primary" trend={-1} />
        <KPIWidget label={t('alerts.criticalAlerts')} value={criticalAlerts} icon="coronavirus" color="tertiary" trend={3} />
        <KPIWidget label={t('alerts.auditEntries')} value={audit.length} icon="verified_user" color="secondary" trend={4} />
      </div>

      <Card
        title={t('alerts.operationsCenter')}
        subtitle={t('alerts.operationsSubtitle')}
        headerRight={
          <div className="flex gap-2">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                type="button"
                onClick={() => setTab(tb.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-label-md font-bold transition-all ${
                  tab === tb.key ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tb.icon}</span>
                {tb.label}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : tab === 'alerts' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-primary text-on-primary">
                  <th className="px-6 py-3 font-headline font-semibold">ID</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.type')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.severity')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.region')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.message')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.raisedAt')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.status')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-primary">{a.id}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{a.type}</td>
                    <td className="px-6 py-4">
                      <Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{a.region}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{a.message}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{a.raisedAt}</td>
                    <td className="px-6 py-4">
                      <Badge variant={a.status === 'Active' ? 'warning' : 'success'} dot dotColor={a.status === 'Active' ? 'bg-warning' : 'bg-success'}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {a.status === 'Active' ? (
                        <Button size="sm" variant="outline" icon="check_circle" onClick={() => handleResolve(a)}>
                          {t('alerts.resolve')}
                        </Button>
                      ) : (
                        <span className="text-label-sm text-on-surface-variant">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === 'escalations' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-primary text-on-primary">
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.caseId')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.patient')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.targetLevel')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.raisedBy')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.raisedAt')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.status')}</th>
                </tr>
              </thead>
              <tbody>
                {escalations.map((e) => (
                  <tr key={e.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-primary">{e.id}</td>
                    <td className="px-6 py-4 font-semibold text-on-surface">{e.patient}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{e.level}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{e.raisedBy}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{e.raisedAt}</td>
                    <td className="px-6 py-4">
                      <Badge variant={escalationVariant(e.status)} dot dotColor={e.status === 'Pending' ? 'bg-warning' : 'bg-success'}>
                        {e.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : audit.length === 0 ? (
          <EmptyState icon="verified_user" title={t('alerts.noAudit')} description={t('alerts.noAuditDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-primary text-on-primary">
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.timestamp')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.caseId')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.riskLevel')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.handledBy')}</th>
                  <th className="px-6 py-3 font-headline font-semibold">{t('alerts.outcome')}</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((log, i) => (
                  <tr key={i} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 text-on-surface-variant">{log.timestamp}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-primary">{log.patientId}</td>
                    <td className="px-6 py-4">
                      <Badge variant={log.risk === 'Critical' ? 'critical' : 'warning'}>{log.risk}</Badge>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{log.handledBy}</td>
                    <td className="px-6 py-4">
                      <Badge variant={log.outcome === 'Resolved' ? 'success' : log.outcome === 'Pending' ? 'warning' : 'secondary'}>
                        {log.outcome}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
