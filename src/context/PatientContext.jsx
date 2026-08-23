import { createContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'jd_patient_profile';

const getInitialPatient = () => {
  let userObj = null;
  try {
    const storedUser = localStorage.getItem('jd_user');
    if (storedUser) userObj = JSON.parse(storedUser);
  } catch {
    /* ignore */
  }

  const baseName = userObj?.name || 'Registered Patient';
  const baseEmail = userObj?.email || '';

  return {
    patientId: userObj?.patientId || userObj?.id || `JD-${Math.floor(1000 + Math.random() * 9000)}`,
    id: userObj?.patientId || userObj?.id || `JD-${Math.floor(1000 + Math.random() * 9000)}`,
    name: baseName,
    email: baseEmail,
    phone: userObj?.phone || '',
    dob: '',
    age: 35,
    gender: 'Unspecified',
    address: 'Amroli, Chhattisgarh',
    village: 'Amroli',
    bloodGroup: 'O+',
    heightCm: 165,
    weightKg: 65,
    bmi: 23.8,
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      alternate: '',
      address: '',
    },
  };
};

const loadPatient = () => {
  const base = getInitialPatient();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...base,
        ...parsed,
        name: parsed.name || base.name,
        emergencyContact: {
          ...base.emergencyContact,
          ...(parsed.emergencyContact || {}),
        },
      };
    }
  } catch {
    /* ignore storage errors */
  }
  return base;
};

const PatientContext = createContext(null);

export function PatientProvider({ children }) {
  const [patient, setPatient] = useState(loadPatient);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patient));
    } catch {
      /* ignore storage errors */
    }
  }, [patient]);

  const updateProfile = (patch) =>
    setPatient((prev) => ({
      ...prev,
      ...patch,
      emergencyContact: {
        ...prev.emergencyContact,
        ...(patch.emergencyContact || {}),
      },
    }));

  const value = useMemo(() => ({ patient, updateProfile }), [patient]);

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}

export default PatientContext;
