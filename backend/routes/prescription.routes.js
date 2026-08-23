import { Router } from 'express';
import { prescriptionController } from '../controllers/prescription.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(ROLES.DOCTOR, ROLES.PATIENT, ROLES.ADMIN),
  prescriptionController.getPrescriptions
);

router.get(
  '/:id',
  authorize(ROLES.DOCTOR, ROLES.PATIENT, ROLES.ADMIN),
  prescriptionController.getPrescriptionById
);

router.post(
  '/',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  prescriptionController.createPrescription
);

router.put(
  '/:id',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  prescriptionController.updatePrescription
);

router.post(
  '/:id/dispense',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  prescriptionController.dispensePrescription
);

router.delete('/:id', authorize(ROLES.ADMIN), prescriptionController.deletePrescription);

export default router;
