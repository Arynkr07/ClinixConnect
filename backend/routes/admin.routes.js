import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/overview', adminController.getOverview);
router.get('/doctors', adminController.getDoctors);
router.put('/doctors/:id/approve', adminController.approveDoctor);
router.put('/doctors/:id/reject', adminController.rejectDoctor);
router.delete('/doctors/:id', adminController.deleteDoctor);
router.get('/pending-admins', adminController.getPendingAdmins);
router.get('/admins', adminController.getAdmins);
router.post('/create-admin', adminController.createAdmin);
router.put('/approve-admin/:id', adminController.approveAdmin);
router.put('/reject-admin/:id', adminController.rejectAdmin);
router.delete('/admins/:id', adminController.deleteAdmin);
router.get('/alerts', adminController.getAlerts);
router.post('/alerts/:id/resolve', adminController.resolveAlert);
router.get('/escalations', adminController.getEscalations);
router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/audit', adminController.getAuditLog);
router.get('/case-analytics', adminController.getCaseAnalytics);

export default router;
