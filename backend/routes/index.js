import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import doctorRoutes from './doctor.routes.js';
import patientRoutes from './patient.routes.js';
import appointmentRoutes from './appointment.routes.js';
import prescriptionRoutes from './prescription.routes.js';
import consultationRoutes from './consultation.routes.js';
import reportRoutes from './report.routes.js';
import notificationRoutes from './notification.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

const apiRoutes = [
  { path: '/auth', router: authRoutes },
  { path: '/admin', router: adminRoutes },
  { path: '/doctor', router: doctorRoutes },
  { path: '/doctors', router: doctorRoutes },
  { path: '/patients', router: patientRoutes },
  { path: '/appointments', router: appointmentRoutes },
  { path: '/prescriptions', router: prescriptionRoutes },
  { path: '/consultations', router: consultationRoutes },
  { path: '/reports', router: reportRoutes },
  { path: '/notifications', router: notificationRoutes },
  { path: '/ai', router: aiRoutes },
];

for (const { path, router: subRouter } of apiRoutes) {
  router.use(path, subRouter);
}

export default router;
