import { Router } from 'express';
import { referralController } from '../controllers/referral.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate);

router.get(
  '/destinations',
  authorize(ROLES.DOCTOR, ROLES.ADMIN, ROLES.PATIENT),
  referralController.getDestinations
);

router.get(
  '/',
  authorize(ROLES.DOCTOR, ROLES.ADMIN, ROLES.PATIENT, ROLES.GOVERNMENT),
  referralController.getReferrals
);

router.post(
  '/',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  referralController.createReferral
);

router.get(
  '/:referralId/status',
  authorize(ROLES.DOCTOR, ROLES.PATIENT, ROLES.ADMIN),
  referralController.getReferralStatus
);

export default router;
