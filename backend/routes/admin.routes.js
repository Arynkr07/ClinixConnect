import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/overview', adminController.getOverview);
router.get('/doctors', adminController.getDoctors);
router.get('/alerts', adminController.getAlerts);
router.post('/alerts/:id/resolve', adminController.resolveAlert);
router.get('/escalations', adminController.getEscalations);
router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/audit', adminController.getAuditLog);
router.get('/villages', adminController.getVillages);
router.get('/asha-workers', adminController.getAshaWorkers);
router.post('/asha-workers/:id/assign', adminController.assignAshaWorker);
router.post('/asha-workers/:id/toggle-status', adminController.toggleAshaWorker);
router.get('/surveillance', adminController.getSurveillance);
router.get('/case-analytics', adminController.getCaseAnalytics);

export default router;
