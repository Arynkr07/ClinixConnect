import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';

const router = Router();

router.post('/pre-visit-summary', aiController.getPreVisitSummary);
router.post('/post-visit-summary', aiController.getPostVisitSummary);

export default router;
