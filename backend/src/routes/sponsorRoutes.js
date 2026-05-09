import { Router } from 'express';
import { body } from 'express-validator';
import {
  authenticate,
  requireRole,
  requireApprovedRoleVerification,
} from '../middleware/auth.js';
import * as sponsorController from '../controllers/sponsorController.js';
import * as userController from '../controllers/userController.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('SPONSOR'));
router.use(requireApprovedRoleVerification);

router.get('/profile', userController.getProfile);
router.put(
  '/profile',
  [
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('password').optional().isLength({ min: 6 }),
  ],
  userController.updateProfile,
);

router.get('/sponsor-profile', sponsorController.getMySponsorRow);

router.put(
  '/sponsor-profile',
  [
    body('companyName').optional().trim().notEmpty(),
    body('website').optional().trim(),
    body('description').optional().trim(),
    body('logoUrl').optional().trim(),
  ],
  sponsorController.updateProfile,
);

router.post(
  '/offers',
  [
    body('competitionId').isInt(),
    body('amount').isFloat({ min: 0 }),
    body('rewardContribution').optional().isFloat({ min: 0 }),
    body('notes').optional(),
  ],
  sponsorController.createSponsorship,
);

router.get('/offers', sponsorController.listMine);

router.get('/analytics', sponsorController.analytics);

router.put(
  '/offers/:id/ad',
  [
    body('adHeadline').optional().isString(),
    body('adImageUrl').optional().isString(),
  ],
  sponsorController.updateOfferAd,
);

router.post('/offers/:id/acknowledge', sponsorController.acknowledgeOffer);

export default router;
