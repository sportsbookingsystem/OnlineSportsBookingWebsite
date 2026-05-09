import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('roleKey').isIn(['player', 'facility_owner', 'sponsor']),
    body('companyName').optional().trim().notEmpty(),
  ],
  authController.register,
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  authController.login,
);

router.get('/me', authenticate, authController.me);

export default router;
