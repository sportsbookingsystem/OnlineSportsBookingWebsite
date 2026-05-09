import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as bookingController from '../controllers/bookingController.js';
import * as paymentController from '../controllers/paymentController.js';
import * as teamController from '../controllers/teamController.js';
import * as competitionController from '../controllers/competitionController.js';
import * as rewardController from '../controllers/rewardController.js';
import * as userController from '../controllers/userController.js';
import * as notificationController from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('PLAYER'));

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

router.post(
  '/bookings',
  [
    body('fieldId').isInt(),
    body('bookingDate').notEmpty(),
    body('startTime').matches(/^\d{2}:\d{2}$/),
    body('durationHours')
      .custom((v) => [1, 1.5, 2].includes(Number(v)))
      .withMessage('durationHours must be 1, 1.5, or 2'),
    body('notes').optional().isString(),
  ],
  bookingController.create,
);

router.get('/bookings', bookingController.listMine);
router.post('/bookings/:id/cancel', bookingController.cancelMine);
router.post('/bookings/:bookingId/pay', paymentController.payBooking);

router.post('/teams', [body('name').trim().notEmpty()], teamController.create);
router.post('/teams/:teamId/join', teamController.join);
router.get('/teams', teamController.listMine);

router.post(
  '/competitions/:id/apply-qualifiers',
  [body('teamId').isInt()],
  competitionController.applyToQualifiers,
);
router.get('/competitions/joined', competitionController.listJoined);

router.get('/rewards', rewardController.listMine);
router.get('/notifications', notificationController.listMine);

export default router;
