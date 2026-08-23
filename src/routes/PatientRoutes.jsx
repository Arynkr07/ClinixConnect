import { Route, Routes } from 'react-router-dom';
import PatientDashboard from '../pages/patient/PatientDashboard';
import DoctorSearch from '../pages/patient/DoctorSearch';
import BookAppointment from '../pages/patient/BookAppointment';
import MyAppointments from '../pages/patient/MyAppointments';
import PatientPrescriptions from '../pages/patient/PatientPrescriptions';
import MedicationTracker from '../pages/patient/MedicationTracker';
import NotFound from '../pages/errors/404';

export default function PatientRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<PatientDashboard />} />
      <Route path="doctors" element={<DoctorSearch />} />
      <Route path="book/:doctorId" element={<BookAppointment />} />
      <Route path="appointments" element={<MyAppointments />} />
      <Route path="prescriptions" element={<PatientPrescriptions />} />
      <Route path="medications" element={<MedicationTracker />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
