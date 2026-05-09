import { Router } from 'express';
import { body } from 'express-validator';
import {
  authenticate,
  requireRole,
  requireApprovedRoleVerification,
} from '../middleware/auth.js';
import * as facilityController from '../controllers/facilityController.js';
import * as fieldController from '../controllers/fieldController.js';
import * as bookingController from '../controllers/bookingController.js';
import * as reportController from '../controllers/reportController.js';
import * as userController from '../controllers/userController.js';
import * as ownerCompetitionController from '../controllers/ownerCompetitionController.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('FACILITY_OWNER'));
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

router.get('/facilities', facilityController.listMine);
router.post(
  '/facilities',
  [
    body('name').trim().notEmpty(),
    body('address').trim().notEmpty(),
    body('city').trim().notEmpty(),
    body('description').optional(),
    body('approvalRequired').optional().isBoolean(),
  ],
  facilityController.create,
);

router.put(
  '/facilities/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('address').optional().trim().notEmpty(),
    body('city').optional().trim().notEmpty(),
  ],
  facilityController.update,
);

router.post(
  '/facilities/:id/photos',
  [body('url').trim().notEmpty().isURL()],
  facilityController.addPhoto,
);

router.post(
  '/facilities/:facilityId/fields',
  [
    body('name').trim().notEmpty(),
    body('sportType').trim().notEmpty(),
    body('pricePerSlot').optional().isFloat({ min: 0 }),
    body('slots').isArray({ min: 1 }),
    body('slots.*.dayOfWeek').isInt({ min: 0, max: 6 }),
    body('slots.*.startTime').matches(/^\d{2}:\d{2}$/),
    body('slots.*.endTime').matches(/^\d{2}:\d{2}$/),
  ],
  fieldController.create,
);

router.post(
  '/fields/:id/photos',
  [body('url').trim().notEmpty().isURL()],
  fieldController.addImage,
);

router.put(
  '/fields/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('sportType').optional().trim().notEmpty(),
    body('pricePerSlot').optional().isFloat({ min: 0 }),
    body('slots').optional().isArray(),
    body('isActive').optional().isBoolean(),
  ],
  fieldController.update,
);

router.get('/bookings', bookingController.ownerList);
router.post(
  '/bookings/:id/approve',
  [body('approve').isBoolean()],
  bookingController.ownerApprove,
);

router.get('/reports/revenue', reportController.ownerRevenue);

router.get('/competitions/hosted', ownerCompetitionController.listHosted);

export default router;
