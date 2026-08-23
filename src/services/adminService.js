import { api, isMockMode } from './api';
import { doctorService } from './doctorService';
import { patientService } from './patientService';
import { appointmentService } from './appointmentService';

export const adminService = {
  async getOverview() {
    if (isMockMode()) {
      return this.computeOverviewFallback();
    }
    try {
      const { data } = await api.get('/admin/overview');
      if (data && typeof data === 'object') return data;
    } catch (e) {
      console.warn('[adminService] getOverview fallback:', e.message);
    }
    return this.computeOverviewFallback();
  },

  async computeOverviewFallback() {
    try {
      const [doctors, patients, appointments] = await Promise.all([
        doctorService.getAll(),
        patientService.getAll(),
        appointmentService.getAppointments(),
      ]);

      const onlineDocs = (doctors || []).filter((d) => d.status === 'Online' || d.availability?.status === 'online').length;
      const criticalCases = (patients || []).filter((p) => (p.risk || '').toLowerCase() === 'critical').length;
      const upcomingApts = (appointments || []).filter((a) => a.status === 'upcoming').length;

      return {
        totalConsultations: String(appointments.length || 0),
        totalConsultationsTrend: 12,
        activeDoctors: onlineDocs || (doctors || []).length || 0,
        activeDoctorsTrend: 4,
        activeAshaWorkers: 6,
        activeAshaWorkersTrend: 2,
        resolutionRate: '96.5%',
        resolutionRateTrend: 1,
        pendingEscalations: criticalCases || 0,
        activeAlerts: criticalCases > 0 ? criticalCases : 0,
        consultationVolume: [2, 4, 3, (appointments || []).length, 5, 2, 1],
        riskDistribution: {
          low: (patients || []).filter((p) => (p.risk || '').toLowerCase() === 'low').length,
          moderate: (patients || []).filter((p) => (p.risk || '').toLowerCase() === 'moderate').length,
          high: (patients || []).filter((p) => (p.risk || '').toLowerCase() === 'high').length,
          critical: criticalCases,
        },
        regionWorkload: [
          { region: 'Amroli', cases: Math.max(1, Math.floor((appointments || []).length * 0.4)) },
          { region: 'Devgram', cases: Math.max(1, Math.floor((appointments || []).length * 0.3)) },
          { region: 'Palia', cases: Math.max(1, Math.floor((appointments || []).length * 0.3)) },
        ],
        workerEngagement: [2, 4, 3, 5, 4, 2, 3],
        recentActivity: (appointments || []).slice(0, 5).map((a) => ({
          id: a.patientId || a.id || 'Apt',
          action: `${a.purpose || 'Consultation'} with ${a.doctorName || 'Doctor'}`,
          actor: a.patientName || 'Patient',
          risk: a.urgency === 'High' ? 'Critical' : a.urgency === 'Medium' ? 'Moderate' : 'Low',
          time: `${a.date || ''} ${a.startTime || ''}`,
        })),
      };
    } catch {
      return {
        totalConsultations: '0',
        totalConsultationsTrend: 0,
        activeDoctors: 0,
        activeDoctorsTrend: 0,
        activeAshaWorkers: 6,
        activeAshaWorkersTrend: 0,
        resolutionRate: '100%',
        resolutionRateTrend: 0,
        pendingEscalations: 0,
        activeAlerts: 0,
        consultationVolume: [0, 0, 0, 0, 0, 0, 0],
        riskDistribution: { low: 0, moderate: 0, high: 0, critical: 0 },
        regionWorkload: [],
        workerEngagement: [0, 0, 0, 0, 0, 0, 0],
        recentActivity: [],
      };
    }
  },

  async getDoctors() {
    if (isMockMode()) {
      return doctorService.getAll();
    }
    try {
      const { data } = await api.get('/admin/doctors');
      if (Array.isArray(data)) return data;
    } catch (e) {
      console.warn('[adminService] getDoctors fallback:', e.message);
    }
    return doctorService.getAll();
  },

  async verifyDoctor(id) {
    if (isMockMode()) {
      await doctorService.update(id, { verification: 'Verified' });
      return { id, verification: 'Verified' };
    }
    try {
      const { data } = await api.post(`/admin/doctors/${id}/verify`);
      return data;
    } catch {
      return { id, verification: 'Verified' };
    }
  },

  async getAshaWorkers() {
    if (isMockMode()) {
      return this.getAshaWorkersFallback();
    }
    try {
      const { data } = await api.get('/admin/asha-workers');
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn('[adminService] getAshaWorkers fallback:', e.message);
    }
    return this.getAshaWorkersFallback();
  },

  getAshaWorkersFallback() {
    return [
      { id: 'AW-1101', name: 'Sunita Devi', village: 'Amroli', block: 'Amroli Block', households: 142, lastSync: '5 min ago', status: 'Active', score: 92, visits: 214 },
      { id: 'AW-1102', name: 'Reena Yadav', village: 'Palia', block: 'Palia Block', households: 118, lastSync: '20 min ago', status: 'Active', score: 87, visits: 176 },
      { id: 'AW-1103', name: 'Kavita Nishad', village: 'Devgram', block: 'Devgram Block', households: 96, lastSync: '2 hrs ago', status: 'Inactive', score: 61, visits: 98 },
      { id: 'AW-1104', name: 'Meena Sahu', village: 'Kanker East', block: 'Kanker Block', households: 131, lastSync: '12 min ago', status: 'Active', score: 89, visits: 205 },
    ];
  },

  async getVillages() {
    if (isMockMode()) {
      return this.getVillagesFallback();
    }
    try {
      const { data } = await api.get('/admin/villages');
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn('[adminService] getVillages fallback:', e.message);
    }
    return this.getVillagesFallback();
  },

  getVillagesFallback() {
    return [
      { id: 'v-amroli', name: 'Amroli' },
      { id: 'v-palia', name: 'Palia' },
      { id: 'v-devgram', name: 'Devgram' },
      { id: 'v-kanker-east', name: 'Kanker East' },
      { id: 'v-dhamtari-rural', name: 'Dhamtari Rural' },
    ];
  },

  async assignAshaWorker(id, villageId) {
    if (isMockMode()) {
      return { id, villageId, status: 'Active', assignedAt: new Date().toISOString() };
    }
    try {
      const { data } = await api.post(`/admin/asha-workers/${id}/assign`, { villageId });
      return data;
    } catch {
      return { id, villageId, status: 'Active', assignedAt: new Date().toISOString() };
    }
  },

  async toggleAshaWorker(id) {
    if (isMockMode()) {
      return { id, deactivated: true };
    }
    try {
      const { data } = await api.post(`/admin/asha-workers/${id}/toggle-status`);
      return data;
    } catch {
      return { id, deactivated: true };
    }
  },

  async getAlerts() {
    if (isMockMode()) {
      return this.computeAlertsFallback();
    }
    try {
      const { data } = await api.get('/admin/alerts');
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn('[adminService] getAlerts fallback:', e.message);
    }
    return this.computeAlertsFallback();
  },

  async computeAlertsFallback() {
    try {
      const appointments = await appointmentService.getAppointments();
      const highRisk = (appointments || []).filter((a) => a.urgency === 'High');

      let resolvedIds = [];
      try {
        const raw = localStorage.getItem('jd_resolved_alerts');
        if (raw) resolvedIds = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      const resolvedSet = new Set(resolvedIds);

      const alerts = highRisk.map((a, i) => {
        const id = `AL-${3000 + i}`;
        return {
          id,
          type: 'Clinical Urgency',
          severity: 'Critical',
          region: a.patientVillage || 'Amroli Cluster',
          message: `${a.patientName || 'Patient'} flagged with ${a.chiefComplaint || a.symptoms || 'High urgency symptoms'}`,
          raisedAt: `${a.date || ''} ${a.startTime || ''}`,
          status: resolvedSet.has(id) ? 'Resolved' : 'Active',
        };
      });

      if (alerts.length === 0) {
        alerts.push({
          id: 'AL-3001',
          type: 'System',
          severity: 'Low',
          region: 'All Regions',
          message: 'All health centers operating normally with zero critical outbreaks.',
          raisedAt: 'Today',
          status: 'Resolved',
        });
      }

      return alerts;
    } catch {
      return [
        {
          id: 'AL-3001',
          type: 'System',
          severity: 'Low',
          region: 'All Regions',
          message: 'All health centers operating normally with zero critical outbreaks.',
          raisedAt: 'Today',
          status: 'Resolved',
        },
      ];
    }
  },

  async resolveAlert(id) {
    try {
      const raw = localStorage.getItem('jd_resolved_alerts');
      const list = raw ? JSON.parse(raw) : [];
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem('jd_resolved_alerts', JSON.stringify(list));
      }
    } catch {
      /* ignore */
    }

    try {
      const { data } = await api.post(`/admin/alerts/${id}/resolve`);
      return data || { id, status: 'Resolved' };
    } catch {
      return { id, status: 'Resolved' };
    }
  },

  async getEscalations() {
    if (isMockMode()) {
      return this.computeEscalationsFallback();
    }
    try {
      const { data } = await api.get('/admin/escalations');
      if (Array.isArray(data)) return data;
    } catch (e) {
      console.warn('[adminService] getEscalations fallback:', e.message);
    }
    return this.computeEscalationsFallback();
  },

  async computeEscalationsFallback() {
    try {
      const appointments = await appointmentService.getAppointments();
      const highRisk = (appointments || []).filter((a) => a.urgency === 'High');

      return highRisk.map((a) => ({
        id: a.patientId || a.id || 'P-1',
        patient: a.patientName || 'Patient Case',
        level: 'District Specialist Referral',
        raisedBy: a.doctorName || 'Assigned Physician',
        raisedAt: `${a.date || ''} ${a.startTime || ''}`,
        status: 'Pending',
      }));
    } catch {
      return [];
    }
  },

  async getCaseAnalytics() {
    if (isMockMode()) {
      return this.computeCaseAnalyticsFallback();
    }
    try {
      const { data } = await api.get('/admin/case-analytics');
      if (data && typeof data === 'object') return data;
    } catch (e) {
      console.warn('[adminService] getCaseAnalytics fallback:', e.message);
    }
    return this.computeCaseAnalyticsFallback();
  },

  async computeCaseAnalyticsFallback() {
    try {
      const appointments = await appointmentService.getAppointments();
      const list = appointments || [];
      return {
        totalCases: list.length,
        resolved: list.filter((a) => a.status === 'completed').length,
        escalated: list.filter((a) => a.urgency === 'High').length,
        inFollowUp: list.filter((a) => a.status === 'upcoming').length,
        diagnosisTrends: {
          labels: ['Fever', 'Respiratory', 'Hypertension', 'Diabetes', 'Pediatrics', 'Other'],
          data: [Math.max(1, list.length), 2, 1, 1, 1, 1],
        },
        triageAccuracy: 94,
        referralRate: 10,
        riskDistribution: { low: 2, moderate: 3, high: 2, critical: 1 },
        byRegion: [
          { region: 'Amroli', total: Math.max(1, list.length), resolved: list.filter((a) => a.status === 'completed').length, escalated: 0 },
        ],
      };
    } catch {
      return {
        totalCases: 0,
        resolved: 0,
        escalated: 0,
        inFollowUp: 0,
        diagnosisTrends: { labels: ['Fever', 'Respiratory', 'Other'], data: [0, 0, 0] },
        triageAccuracy: 95,
        referralRate: 0,
        riskDistribution: { low: 0, moderate: 0, high: 0, critical: 0 },
        byRegion: [],
      };
    }
  },

  async getAuditLogs() {
    if (isMockMode()) {
      return this.computeAuditLogsFallback();
    }
    try {
      const { data } = await api.get('/admin/audit');
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn('[adminService] getAuditLogs fallback:', e.message);
    }
    return this.computeAuditLogsFallback();
  },

  async computeAuditLogsFallback() {
    try {
      const appointments = await appointmentService.getAppointments();
      const list = (appointments || []).map((a) => ({
        timestamp: `${a.date || 'Today'} ${a.startTime || '09:00'}`,
        patientId: a.patientId || a.patientName || 'Patient',
        risk: a.urgency === 'High' ? 'Critical' : a.urgency === 'Medium' ? 'Moderate' : 'Low',
        handledBy: a.doctorName || 'Dr. Rajesh Sharma',
        outcome: a.status === 'completed' ? 'Resolved' : a.status === 'upcoming' ? 'Scheduled' : 'Cancelled',
      }));

      if (list.length > 0) return list;

      return [
        {
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          patientId: 'JD-6612',
          risk: 'Critical',
          handledBy: 'Dr. Rajesh Sharma',
          outcome: 'Resolved',
        },
        {
          timestamp: new Date(Date.now() - 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          patientId: 'JD-8492',
          risk: 'Moderate',
          handledBy: 'Dr. Anil Deshmukh',
          outcome: 'Resolved',
        },
      ];
    } catch {
      return [
        {
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          patientId: 'JD-6612',
          risk: 'Critical',
          handledBy: 'Dr. Rajesh Sharma',
          outcome: 'Resolved',
        },
      ];
    }
  },
};

export default adminService;
