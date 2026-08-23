import { api, isMockMode } from './api';
import { sleep } from '../utils/helpers';

const REFERRAL_DESTINATIONS = [
  'Amroli General Hospital (Primary Care Facility)',
  'District Cardiology Center (Specialist Hospital)',
  'Dr. Rajeev (Orthopedic Specialist)',
];

export const referralService = {
  async create(payload) {
    if (isMockMode()) {
      await sleep(900);
      return {
        id: `REF-${Math.floor(Math.random() * 10000)}`,
        ...payload,
        status: 'Sent',
        createdAt: new Date().toISOString(),
      };
    }
    const { data } = await api.post('/referrals', payload);
    return data;
  },

  async getByPatient(patientId) {
    if (isMockMode()) {
      await sleep(400);
      return [];
    }
    const { data } = await api.get('/referrals', { patientId });
    return data;
  },

  async getDestinations() {
    if (isMockMode()) {
      await sleep(200);
      return REFERRAL_DESTINATIONS;
    }
    const { data } = await api.get('/referrals/destinations');
    return data;
  },

  async trackStatus(referralId) {
    if (isMockMode()) {
      await sleep(300);
      return { id: referralId, status: 'Pending Review' };
    }
    const { data } = await api.get(`/referrals/${referralId}/status`);
    return data;
  },
};
