import { Router } from 'express';
import { ngoController } from '../controllers/ngo.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', authorize(ROLES.NGO), ngoController.getDashboard);
router.get('/impact', authorize(ROLES.NGO), ngoController.getImpact);

router.get('/camps', authorize(ROLES.NGO, ROLES.ADMIN), ngoController.getCamps);
router.post('/camps', authorize(ROLES.NGO), ngoController.createCamp);
router.put('/camps/:id', authorize(ROLES.NGO), ngoController.updateCamp);
router.delete('/camps/:id', authorize(ROLES.NGO, ROLES.ADMIN), ngoController.deleteCamp);

export default router;
