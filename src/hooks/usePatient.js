import { useContext } from 'react';
import PatientContext from '../context/PatientContext';

export function usePatient() {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatient must be used within a PatientProvider');
  return ctx;
}

export default usePatient;
