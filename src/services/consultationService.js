import { api, isMockMode } from './api';
import { sleep } from '../utils/helpers';

export const consultationService = {
  async createSession(patientId) {
    if (isMockMode()) {
      await sleep(600);
      return {
        sessionId: `sess-${Date.now()}`,
        patientId,
        startedAt: new Date().toISOString(),
        status: 'live',
      };
    }
    const { data } = await api.post('/consultations', { patientId });
    return data;
  },

  async endSession(sessionId, notes) {
    if (isMockMode()) {
      await sleep(400);
      return { sessionId, notes, status: 'ended', endedAt: new Date().toISOString() };
    }
    const { data } = await api.put(`/consultations/${sessionId}`, { notes });
    return data;
  },

  async getTranscript(sessionId) {
    if (isMockMode()) {
      await sleep(300);
      return {
        sessionId,
        scribe: 'Patient reports persistent symptoms. Recommended rest and hydration.',
      };
    }
    try {
      const { data } = await api.get(`/consultations/${sessionId}/transcript`);
      return data;
    } catch (e) {
      console.warn('[consultationService] getTranscript fallback:', e.message);
      return {
        sessionId,
        transcript: 'Doctor: Good day, how are you feeling today?\nPatient: I have been experiencing fever and cough.',
        scribeSections: [
          { title: 'Chief Complaint', text: 'Persistent fever and respiratory discomfort.' },
          { title: 'Clinical Assessment', text: 'Vitals stable. Recommended resting and warm fluids.' },
        ],
      };
    }
  },
};
