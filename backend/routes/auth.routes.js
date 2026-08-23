import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/auth.controller.js';
import validate from '../middleware/validate.js';

const router = Router();

router.post(
  '/login',
  [
    body('role').notEmpty().withMessage('Role is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

router.post(
  '/register',
  [
    body('role').notEmpty().withMessage('Role is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  validate,
  authController.register
);

router.post('/logout', authController.logout);

router.get('/verify', authController.verifyToken);

router.post(
  '/request-access',
  [
    body('role').notEmpty().withMessage('Role is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
  ],
  validate,
  authController.requestAccess
);

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;
