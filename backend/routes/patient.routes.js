import { Router } from 'express';
import { patientController } from '../controllers/patient.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate);

// Own-profile routes must be declared before /:id to avoid the
// `me` string being treated as an ObjectId.
router.get('/me', authorize(ROLES.PATIENT), patientController.getMyProfile);
router.put('/me', authorize(ROLES.PATIENT), patientController.updateMyProfile);
router.get(
  '/me/appointments',
  authorize(ROLES.PATIENT),
  patientController.getMyAppointments
);
router.get(
  '/me/prescriptions',
  authorize(ROLES.PATIENT),
  patientController.getMyPrescriptions
);
router.get(
  '/me/consultations',
  authorize(ROLES.PATIENT),
  patientController.getMyConsultations
);
router.get('/me/reports', authorize(ROLES.PATIENT), patientController.getMyReports);

router.get(
  '/',
  authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.NGO, ROLES.GOVERNMENT),
  patientController.getPatients
);

router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.NGO),
  patientController.createPatient
);

router.get(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.NGO, ROLES.GOVERNMENT, ROLES.PATIENT),
  patientController.getPatientById
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.NGO),
  patientController.updatePatient
);

router.delete('/:id', authorize(ROLES.ADMIN), patientController.deletePatient);

export default router;
