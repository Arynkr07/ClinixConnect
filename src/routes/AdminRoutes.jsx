import { Navigate, Route, Routes } from 'react-router-dom';
import AdminDashboard from '../pages/admin/AdminDashboard';
import DiseaseSurveillance from '../pages/admin/DiseaseSurveillance';
import CaseLevelAnalytics from '../pages/admin/CaseLevelAnalytics';
import HighRiskAuditLog from '../pages/admin/HighRiskAuditLog';
import ReportGeneration from '../pages/admin/ReportGeneration';
import PlatformConfiguration from '../pages/admin/PlatformConfiguration';
import DoctorManagement from '../pages/admin/DoctorManagement';
import AlertsEscalations from '../pages/admin/AlertsEscalations';
import NotFound from '../pages/errors/404';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="surveillance" element={<DiseaseSurveillance />} />
      <Route path="case-analytics" element={<CaseLevelAnalytics />} />
      <Route path="audit-log" element={<HighRiskAuditLog />} />
      <Route path="reports" element={<ReportGeneration />} />
      <Route path="settings" element={<PlatformConfiguration />} />
      <Route path="doctors" element={<DoctorManagement />} />
      <Route path="alerts" element={<AlertsEscalations />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
