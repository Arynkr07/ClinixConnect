import { api, isMockMode } from './api';
import { sleep, generatePatientId } from '../utils/helpers';
import { appointmentService } from './appointmentService';

function getStoredPatients() {
  try {
    const raw = localStorage.getItem('jd_patients_db');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }

  // Build patients dynamically from registered users and appointments
  const patientsMap = new Map();

  try {
    const rawUsers = localStorage.getItem('jd_registered_users');
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      users
        .filter((u) => u.role === 'patient')
        .forEach((p) => {
          const pid = p.patientId || p.id || generatePatientId(p.name);
          patientsMap.set(pid, {
            id: pid,
            name: p.name,
            age: p.age || 42,
            gender: p.gender || 'Female',
            village: p.village || 'Amroli',
            complaint: 'Routine Clinical Evaluation',
            risk: 'Moderate',
            status: 'Waiting',
            lastCheckIn: 'Recently',
            vitals: null,
            summary: ['Patient registered in ClinixConnect digital healthcare network.'],
          });
        });
    }
  } catch {
    /* ignore */
  }

  const defaultPatients = [
    {
      id: 'Gopal20260824101500',
      patientId: 'Gopal20260824101500',
      name: 'Gopal Prasad',
      age: 45,
      gender: 'Male',
      village: 'Amroli',
      complaint: 'Fever 101°F for 3 days and persistent cough',
      risk: 'Moderate',
      status: 'Waiting',
      lastCheckIn: '10 mins ago',
      vitals: { bp: '128/84', temp: '101°F', weight: 68, pulse: 82 },
      summary: ['Fever 101°F for 3 days', 'Persistent dry cough', 'General body weakness'],
    },
    {
      id: 'Sunita20260824121530',
      patientId: 'Sunita20260824121530',
      name: 'Sunita Devi',
      age: 38,
      gender: 'Female',
      village: 'Devgram',
      complaint: 'Routine Antenatal & Maternal Checkup',
      risk: 'Low',
      status: 'Waiting',
      lastCheckIn: '25 mins ago',
      vitals: { bp: '118/76', temp: '98.4°F', weight: 58, pulse: 72 },
      summary: ['Second trimester routine evaluation', 'Normal vitals'],
    },
    {
      id: 'Ramesh20260824091522',
      patientId: 'Ramesh20260824091522',
      name: 'Ramesh Kumar',
      age: 52,
      gender: 'Male',
      village: 'Kanker Block',
      complaint: 'Chest discomfort and shortness of breath during exertion',
      risk: 'Critical',
      status: 'Waiting',
      lastCheckIn: '5 mins ago',
      vitals: { bp: '145/92', temp: '98.6°F', weight: 75, pulse: 98 },
      summary: ['Hypertension history', 'Exertional dyspnea'],
    },
    {
      id: 'Priya20260824143000',
      patientId: 'Priya20260824143000',
      name: 'Priya Sahu',
      age: 29,
      gender: 'Female',
      village: 'Bijapur Sector',
      complaint: 'Pediatric consultation for infant fever and vomiting',
      risk: 'Moderate',
      status: 'Waiting',
      lastCheckIn: '15 mins ago',
      vitals: { bp: '110/70', temp: '99.8°F', weight: 52, pulse: 78 },
      summary: ['Infant gastrointestinal infection suspected'],
    },
    {
      id: 'Arjun20260824110500',
      patientId: 'Arjun20260824110500',
      name: 'Arjun Singh',
      age: 60,
      gender: 'Male',
      village: 'Dhamtari',
      complaint: 'Joint pain in knees and lower back stiffness',
      risk: 'Low',
      status: 'Waiting',
      lastCheckIn: '40 mins ago',
      vitals: { bp: '130/80', temp: '98.2°F', weight: 70, pulse: 70 },
      summary: ['Osteoarthritis evaluation'],
    },
  ];

  defaultPatients.forEach((dp) => {
    if (!patientsMap.has(dp.id)) {
      patientsMap.set(dp.id, dp);
    }
  });

  const list = Array.from(patientsMap.values());
  localStorage.setItem('jd_patients_db', JSON.stringify(list));
  return list;
}

function savePatients(list) {
  try {
    localStorage.setItem('jd_patients_db', JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export const patientService = {
  async getAll() {
    const patients = getStoredPatients();

    // Always merge with latest appointments to ensure newly booked patients are visible
    try {
      const apts = await appointmentService.getAppointments();
      apts.forEach((a) => {
        const pid = a.patientId;
        const existing = patients.find((p) => p.id === pid || p.patientId === pid);
        if (existing) {
          existing.complaint = a.chiefComplaint || a.symptoms || existing.complaint;
          existing.risk = a.urgency === 'High' ? 'Critical' : a.urgency === 'Medium' ? 'Moderate' : 'Low';
          existing.status = a.status === 'upcoming' ? 'Waiting' : a.status === 'completed' ? 'Completed' : 'Cancelled';
        } else if (pid) {
          patients.unshift({
            id: pid,
            patientId: pid,
            name: a.patientName || 'Patient',
            age: 35,
            gender: 'Other',
            village: a.patientVillage || 'Rural Block',
            complaint: a.chiefComplaint || a.symptoms || 'General Consultation',
            risk: a.urgency === 'High' ? 'Critical' : a.urgency === 'Medium' ? 'Moderate' : 'Low',
            status: 'Waiting',
            lastCheckIn: 'Just now',
            vitals: null,
            summary: [a.symptoms || 'New appointment booked.'],
          });
        }
      });
      savePatients(patients);
    } catch {
      /* ignore */
    }

    if (isMockMode()) {
      await sleep(300);
      return patients;
    }

    // Merge backend patients with local ones
    try {
      const { data } = await api.get('/patients');
      const backendPatients = Array.isArray(data) ? data : [];
      const backendIds = new Set(backendPatients.map((p) => p.patientId || p.id || String(p._id)));
      const localOnly = patients.filter(
        (p) => !backendIds.has(p.patientId) && !backendIds.has(p.id)
      );
      return [...backendPatients, ...localOnly];
    } catch {
      return patients;
    }
  },

  async getById(id) {
    if (isMockMode()) {
      await sleep(200);
      const all = await this.getAll();
      return all.find((p) => p.id === id || p.patientId === id) ?? null;
    }
    try {
      const { data } = await api.get(`/patients/${id}`);
      return data;
    } catch (e) {
      console.warn('[patientService] getById fallback:', e.message);
      const all = await this.getAll();
      return all.find((p) => p.id === id || p.patientId === id) ?? null;
    }
  },

  async search(query) {
    const all = await this.getAll();
    const term = query.toLowerCase();
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term)
    );
  },

  async create(payload) {
    if (isMockMode()) {
      await sleep(300);
      const all = getStoredPatients();
      const newId = payload.id || payload.patientId || generatePatientId(payload.name);
      const newPatient = {
        id: newId,
        name: payload.name,
        age: payload.age || 30,
        gender: payload.gender || 'Other',
        village: payload.village || 'Amroli',
        complaint: payload.complaint || 'Routine checkup',
        risk: payload.risk || 'Low',
        status: payload.status || 'Waiting',
        lastCheckIn: 'Just now',
        vitals: payload.vitals || { bp: '120/80', temp: '98.6°F', weight: 60, pulse: 72 },
        summary: payload.summary || ['New patient record created.'],
      };
      const updated = [newPatient, ...all];
      savePatients(updated);
      return newPatient;
    }
    const { data } = await api.post('/patients', payload);
    return data;
  },
};

export default patientService;
