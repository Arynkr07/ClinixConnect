import { Router } from 'express';
import { caseController } from '../controllers/case.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate);

// Analytics + patient-scoped routes before /:id to avoid route shadowing.
router.get(
  '/analytics',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  caseController.getCaseAnalytics
);
router.get(
  '/patient/:id',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  caseController.getLatestCaseByPatient
);
router.post(
  '/patient/:id/consultation-summary',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  caseController.saveConsultationSummary
);

router.get(
  '/',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  caseController.getCases
);

router.post(
  '/',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  caseController.createCase
);

router.get('/:id', authorize(ROLES.DOCTOR, ROLES.ADMIN), caseController.getCaseById);

router.put('/:id', authorize(ROLES.DOCTOR, ROLES.ADMIN), caseController.updateCase);

export default router;
