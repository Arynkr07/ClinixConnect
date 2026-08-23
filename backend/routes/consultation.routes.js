import { Router } from 'express';
import { consultationController } from '../controllers/consultation.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(ROLES.DOCTOR, ROLES.PATIENT, ROLES.ADMIN),
  consultationController.getConsultations
);

// sessionId-based routes before :id to avoid route shadowing.
router.get(
  '/:sessionId/transcript',
  authorize(ROLES.DOCTOR, ROLES.PATIENT, ROLES.ADMIN),
  consultationController.getTranscript
);
router.put(
  '/:sessionId',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  consultationController.updateConsultation
);
router.post(
  '/:sessionId/end',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  consultationController.endConsultation
);

router.post(
  '/',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  consultationController.createConsultation
);

router.get(
  '/:id',
  authorize(ROLES.DOCTOR, ROLES.PATIENT, ROLES.ADMIN),
  consultationController.getConsultationById
);

router.delete('/:id', authorize(ROLES.ADMIN), consultationController.deleteConsultation);

export default router;
