import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AdminProfileMenu from '../../components/layout/AdminProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import { adminService } from '../../services/adminService';
import { useDebounce } from '../../hooks/useDebounce';
import { useNotification } from '../../hooks/useNotification';
import { adminSidebarItems } from './adminNav';

export default function HighRiskAuditLog() {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const load = async () => {
      const data = await adminService.getAuditLogs();
      setLogs(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = (logs || []).filter((l) => {
    if (!debouncedQuery) return true;
    const term = debouncedQuery.toLowerCase();
    const pid = String(l.patientId || l.patient || l.id || '').toLowerCase();
    const staff = String(l.handledBy || l.actor || '').toLowerCase();
    const out = String(l.outcome || l.status || '').toLowerCase();
    return pid.includes(term) || staff.includes(term) || out.includes(term);
  });

  const handleExport = () => {
    const listToExport = filtered.length > 0 ? filtered : logs;
    if (!listToExport || listToExport.length === 0) {
      notify({ type: 'error', message: 'No audit records available to export.' });
      return;
    }

    const headers = ['Timestamp', 'Patient ID', 'Risk Level', 'Handled By', 'Outcome'];
    const rows = listToExport.map((log) => [
      `"${log.timestamp || 'Recent'}"`,
      `"${log.patientId || log.patient || log.id || 'N/A'}"`,
      `"${log.risk || log.severity || 'High'}"`,
      `"${log.handledBy || log.actor || 'Assigned Physician'}"`,
      `"${log.outcome || (log.status === 'completed' ? 'Resolved' : 'Pending')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `High_Risk_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify({ type: 'success', message: 'Audit log exported to CSV successfully!' });
  };

  const sidebarItems = adminSidebarItems(t);

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: 'High-Risk Case Audit Log',
        subtitle: 'Immutable trail of critical case handling',
        right: (
          <>
            <Button icon="download" onClick={handleExport}>Export CSV</Button>
            <AdminProfileMenu />
          </>
        ),
      }}
    >
      <Card
        title="Audit Entries"
        subtitle={`${filtered.length} entries`}
        headerRight={<SearchBar placeholder="Search patient, staff, outcome..." onSearch={setQuery} containerClassName="w-80" />}
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="manage_search" title="No audit entries" description="No records match your search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-primary text-on-primary">
                  <th className="px-6 py-3 font-headline font-semibold">Timestamp</th>
                  <th className="px-6 py-3 font-headline font-semibold">Patient ID</th>
                  <th className="px-6 py-3 font-headline font-semibold">Risk Level</th>
                  <th className="px-6 py-3 font-headline font-semibold">Handled By</th>
                  <th className="px-6 py-3 font-headline font-semibold">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const ts = log.timestamp || (log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'Recent');
                  const pid = log.patientId || log.patient || log.id || 'N/A';
                  const riskLevel = log.risk || log.severity || 'High';
                  const staff = log.handledBy || log.actor || 'Assigned Physician';
                  const outcomeStatus = log.outcome || (log.status === 'completed' ? 'Resolved' : 'Pending');

                  return (
                    <tr key={i} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4 text-on-surface-variant">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-outline">lock_clock</span>
                          {ts}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-primary">{pid}</td>
                      <td className="px-6 py-4">
                        <Badge variant={riskLevel.toLowerCase() === 'critical' ? 'critical' : 'warning'}>{riskLevel}</Badge>
                      </td>
                      <td className="px-6 py-4">{staff}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            outcomeStatus.toLowerCase() === 'resolved'
                              ? 'success'
                              : outcomeStatus.toLowerCase() === 'pending'
                                ? 'warning'
                                : 'secondary'
                          }
                          dot
                        >
                          {outcomeStatus}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
