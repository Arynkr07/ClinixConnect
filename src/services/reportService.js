import { api, isMockMode } from './api';
import { sleep } from '../utils/helpers';

const MOCK_REPORT = {
  title: 'Regional Health Impact Report - Oct 2023',
  resolutionRate: 92,
  patientsServed: '14.2k',
  sdgAlignment: 'High',
  conditionTrends: [
    { label: 'Malaria', value: 85 },
    { label: 'Fever', value: 40 },
    { label: 'Maternal', value: 65 },
    { label: 'Chronic', value: 25 },
    { label: 'Other', value: 55 },
  ],
  demographics: { elderly: 45, pediatric: 30, adult: 25 },
};

export const reportService = {
  async generate(config) {
    if (isMockMode()) {
      await sleep(800);
      return { ...MOCK_REPORT, title: `Regional Health Impact Report - ${config?.region || 'All Regions'}`, generatedOn: new Date().toISOString(), config };
    }
    try {
      const { data } = await api.post('/reports/generate', config);
      if (data && typeof data === 'object') return data;
    } catch (e) {
      console.warn('[reportService] generate fallback:', e.message);
    }
    return { ...MOCK_REPORT, title: `Regional Health Impact Report - ${config?.region || 'All Regions'}`, generatedOn: new Date().toISOString(), config };
  },

  async getAuditLogs() {
    if (isMockMode()) {
      await sleep(500);
      return [
        { timestamp: 'Oct 24, 2023 14:30:12', patientId: 'JD-9921', risk: 'Critical', handledBy: 'Dr. Sunita Kapoor', outcome: 'Resolved' },
        { timestamp: 'Oct 24, 2023 11:15:45', patientId: 'JD-8842', risk: 'High', handledBy: 'Dr. Rajesh Agarwal', outcome: 'Pending' },
        { timestamp: 'Oct 23, 2023 22:05:00', patientId: 'JD-1023', risk: 'Critical', handledBy: 'Dr. Vikas Patil', outcome: 'Transferred' },
        { timestamp: 'Oct 23, 2023 19:40:33', patientId: 'JD-7756', risk: 'High', handledBy: 'Dr. Meera Iyer', outcome: 'Resolved' },
      ];
    }
    const { data } = await api.get('/reports/audit');
    return data;
  },

  async exportCsv() {
    if (isMockMode()) {
      await sleep(400);
      return { success: true, filename: 'audit-log.csv' };
    }
    const { data } = await api.get('/reports/export');
    return data;
  },
};
