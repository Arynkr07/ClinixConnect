import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes';
import ProtectedRoute from './routes/ProtectedRoute';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import SignInPage from './pages/SignInPage';
import RoleLogin from './pages/RoleLogin';
import AdminLogin from './pages/auth/AdminLogin';
import DoctorLogin from './pages/auth/DoctorLogin';
import NotFound from './pages/errors/404';
import Unauthorized from './pages/errors/Unauthorized';

export default function App() {
  return (
    <>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Role selection & unified login */}
        <Route path="/login" element={<SignInPage />} />
        <Route path="/login/:role" element={<RoleLogin />} />

        {/* Public authentication pages */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/doctor/login" element={<DoctorLogin />} />

        {/* Protected dashboards */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppRoutes role="admin" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/*"
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <AppRoutes role="doctor" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/*"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <AppRoutes role="patient" />
            </ProtectedRoute>
          }
        />

        {/* Errors */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
    </>
  );
}
