import { Router } from 'express';
import { governmentController } from '../controllers/government.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', authorize(ROLES.GOVERNMENT, ROLES.ADMIN), governmentController.getDashboard);
router.get(
  '/schemes',
  authorize(ROLES.GOVERNMENT, ROLES.ADMIN),
  governmentController.getSchemes
);
router.get(
  '/queries',
  authorize(ROLES.GOVERNMENT, ROLES.ADMIN),
  governmentController.getPublicQueries
);

export default router;
