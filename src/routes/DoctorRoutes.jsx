import { Route, Routes, Navigate } from 'react-router-dom';
import DoctorDashboard from '../pages/doctor/DoctorDashboard';
import PatientQueue from '../pages/doctor/PatientQueue';
import PatientCaseSummary from '../pages/doctor/PatientCaseSummary';
import PrescriptionWriting from '../pages/doctor/PrescriptionWriting';
import DoctorPerformance from '../pages/doctor/DoctorPerformance';
import ConsultationHistory from '../pages/doctor/ConsultationHistory';
import DoctorApplyLeave from '../pages/doctor/DoctorApplyLeave';
import NotFound from '../pages/errors/404';

export default function DoctorRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<DoctorDashboard />} />
      <Route path="queue" element={<PatientQueue />} />
      <Route path="case/:id" element={<PatientCaseSummary />} />
      <Route path="prescription" element={<PrescriptionWriting />} />
      <Route path="apply-leave" element={<DoctorApplyLeave />} />
      <Route path="followup" element={<Navigate to="/doctor/dashboard" replace />} />
      <Route path="performance" element={<DoctorPerformance />} />
      <Route path="consultation" element={<Navigate to="/doctor/dashboard" replace />} />
      <Route path="consultation-history" element={<ConsultationHistory />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
