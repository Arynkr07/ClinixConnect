/*
 * consultationUtils.js
 * Local persistence for consultation summaries + prescription draft handoff.
 *
 * CLOUD-READY:
 * This module is the abstraction point for consultation records. Replace the
 * localStorage implementation with a backend (Supabase/Firebase/own API)
 * keeping the same exported API:
 *
 *   saveConsultationSummary(record)  -> upsert consultation record
 *   getConsultationSummary(id)       -> read one record
 *   getAllConsultations()            -> list records (newest first)
 *   deleteConsultation(id)           -> delete one record
 */

const STORAGE_KEY = 'savedConsultations';
export const PRESCRIPTION_DRAFT_KEY = 'jd_prescription_draft';

/**
 * Mock AI medicine recommendations for the demo patient (inferior wall MI).
 * Replace with the real Medicine Recommendation AI (cloud backend) later;
 * keep the same shape: { id, medicineName, dosage, frequency, duration, schedule }.
 */
export const getMedicineRecommendations = () => [
  {
    id: 'rx-ai-1',
    medicineName: 'Aspirin',
    dosage: '300mg',
    frequency: 'Chewable · single dose',
    duration: '1',
    schedule: { morning: false, afternoon: false, night: false },
  },
  {
    id: 'rx-ai-2',
    medicineName: 'Nitroglycerin',
    dosage: '0.4mg',
    frequency: 'Sublingual PRN',
    duration: '1',
    schedule: { morning: false, afternoon: false, night: false },
  },
];

const readAll = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (records) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

/** Build a normalized consultation summary object (not persisted). */
export const generateSummary = ({
  consultationId,
  patient = {},
  doctorId,
  doctorName = 'Dr. Rajesh Khanna',
  duration = 0,
  complaint,
  diagnosis = '',
  vitals = {},
  medicines = [],
  scribeSections = [],
  notes = '',
  advice = '',
} = {}) => ({
  id: `cs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  consultationId: consultationId || 'sess-demo',
  patientId: patient.id || 'JD-9921',
  patientName: patient.name || 'Unknown Patient',
  patientAge: patient.age,
  patientGender: patient.gender,
  patientVillage: patient.village,
  doctorId: doctorId || 'doctor',
  doctorName,
  date: new Date().toISOString(),
  duration,
  complaint: complaint || patient.complaint || '',
  diagnosis,
  vitals,
  medicines,
  scribeSections,
  notes,
  advice,
});

export const saveConsultationSummary = (record) => {
  try {
    const entries = readAll();
    const index = entries.findIndex((e) => e.consultationId === record.consultationId);
    if (index >= 0) {
      entries[index] = { ...entries[index], ...record };
    } else {
      entries.push(record);
    }
    writeAll(entries);
    return { success: true, record: entries[index] ?? record, updated: index >= 0 };
  } catch (error) {
    return { success: false, error };
  }
};

export const getConsultationSummary = (consultationId) => {
  try {
    const entries = readAll();
    return entries.find((e) => e.consultationId === consultationId) || null;
  } catch {
    return null;
  }
};

export const getAllConsultations = () => {
  try {
    return readAll().sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch {
    return [];
  }
};

export const deleteConsultation = (consultationId) => {
  try {
    const entries = readAll().filter((e) => e.consultationId !== consultationId);
    writeAll(entries);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

/** Write a prescription draft to sessionStorage so PrescriptionWriting can prefill. */
export const storePrescriptionDraft = (summary = {}) => {
  const draft = {
    patientId: summary.patientId || 'JD-9921',
    patientName: summary.patientName || '',
    diagnosis: summary.diagnosis || '',
    advice: summary.advice || '',
    medicines: Array.isArray(summary.medicines) ? summary.medicines : [],
    fromConsultation: summary.consultationId || '',
  };
  sessionStorage.setItem(PRESCRIPTION_DRAFT_KEY, JSON.stringify(draft));
  return draft;
};

/** Read + remove the prescription draft (single-use). */
export const consumePrescriptionDraft = () => {
  try {
    const raw = sessionStorage.getItem(PRESCRIPTION_DRAFT_KEY);
    sessionStorage.removeItem(PRESCRIPTION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    sessionStorage.removeItem(PRESCRIPTION_DRAFT_KEY);
    return null;
  }
};
