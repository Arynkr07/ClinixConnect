import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import doctorRoutes from './doctor.routes.js';
import patientRoutes from './patient.routes.js';
import ngoRoutes from './ngo.routes.js';
import governmentRoutes from './government.routes.js';
import appointmentRoutes from './appointment.routes.js';
import prescriptionRoutes from './prescription.routes.js';
import consultationRoutes from './consultation.routes.js';
import reportRoutes from './report.routes.js';
import notificationRoutes from './notification.routes.js';
import referralRoutes from './referral.routes.js';
import caseRoutes from './case.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

const apiRoutes = [
  { path: '/auth', router: authRoutes },
  { path: '/admin', router: adminRoutes },
  { path: '/doctor', router: doctorRoutes },
  { path: '/doctors', router: doctorRoutes },
  { path: '/patients', router: patientRoutes },
  { path: '/ngo', router: ngoRoutes },
  { path: '/government', router: governmentRoutes },
  { path: '/appointments', router: appointmentRoutes },
  { path: '/prescriptions', router: prescriptionRoutes },
  { path: '/consultations', router: consultationRoutes },
  { path: '/reports', router: reportRoutes },
  { path: '/notifications', router: notificationRoutes },
  { path: '/referrals', router: referralRoutes },
  { path: '/cases', router: caseRoutes },
  { path: '/ai', router: aiRoutes },
];

for (const { path, router: subRouter } of apiRoutes) {
  router.use(path, subRouter);
}

export default router;
