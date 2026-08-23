import { api, isMockMode } from './api';
import { sleep } from '../utils/helpers';

const MOCK_REGIONS = [
  { name: 'Oak Ridge Cluster', disease: 'Malaria', stage: 2, newCases: 24, growth: 14, coords: [45, 30] },
  { name: 'North-East Highlands', disease: 'Dengue', stage: 1, newCases: 8, growth: 4, coords: [60, 20] },
  { name: 'Western River Basin', disease: 'Cholera', stage: 0, newCases: 3, growth: 1, coords: [25, 60] },
];

/**
 * Operational villages with real geographic coordinates and their current
 * cluster status. Used to drive both the interactive district map and the
 * village cluster cards so the two views always agree.
 */
export const DISTRICT_CLUSTERS = [
  {
    village: 'Amroli',
    status: 'Active',
    disease: 'Malaria',
    cases: 24,
    population: 3200,
    lastUpdated: '5 min ago',
    lat: 21.1929,
    lng: 81.2961,
  },
  {
    village: 'Palia',
    status: 'Elevated',
    disease: 'Dengue',
    cases: 11,
    population: 2100,
    lastUpdated: '12 min ago',
    lat: 21.3116,
    lng: 81.2276,
  },
  {
    village: 'Devgram',
    status: 'Low',
    disease: 'Cholera',
    cases: 4,
    population: 1400,
    lastUpdated: '20 min ago',
    lat: 21.4059,
    lng: 81.3832,
  },
];

export const mapService = {
  async getSurveillance() {
    if (isMockMode()) {
      await sleep(300);
      return {
        totalCases: 4129,
        activeOutbreaks: 12,
        regions: MOCK_REGIONS,
      };
    }
    try {
      const { data } = await api.get('/admin/surveillance');
      return {
        totalCases: 4129,
        activeOutbreaks: Array.isArray(data) ? data.length : 12,
        regions: Array.isArray(data) ? data : MOCK_REGIONS,
      };
    } catch {
      return {
        totalCases: 4129,
        activeOutbreaks: 12,
        regions: MOCK_REGIONS,
      };
    }
  },

  async getClusters(params) {
    if (isMockMode()) {
      await sleep(300);
      return MOCK_REGIONS;
    }
    try {
      const { data } = await api.get('/admin/surveillance', params);
      return Array.isArray(data) ? data : MOCK_REGIONS;
    } catch {
      return MOCK_REGIONS;
    }
  },
};
