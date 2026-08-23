import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(ROLES.DOCTOR, ROLES.PATIENT, ROLES.ADMIN),
  reportController.getReports
);

// Aggregations before /:id so the route segments don't shadow them.
router.get(
  '/export',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  reportController.exportReports
);

router.get(
  '/audit',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  reportController.getReportAudit
);

router.post(
  '/generate',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  reportController.generateReport
);

router.post(
  '/:id/file',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  upload.single('file'),
  reportController.uploadReportFile
);

router.get(
  '/:id',
  authorize(ROLES.DOCTOR, ROLES.PATIENT, ROLES.ADMIN),
  reportController.getReportById
);

router.put(
  '/:id',
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  reportController.updateReport
);

router.delete('/:id', authorize(ROLES.ADMIN), reportController.deleteReport);

export default router;
