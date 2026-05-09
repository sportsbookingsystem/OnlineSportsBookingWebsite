import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as reportController from '../controllers/reportController.js';
import * as userController from '../controllers/userController.js';
import * as bookingController from '../controllers/bookingController.js';
import * as teamController from '../controllers/teamController.js';
import * as competitionController from '../controllers/competitionController.js';
import * as sponsorController from '../controllers/sponsorController.js';
import * as rewardController from '../controllers/rewardController.js';
import * as adminFacilityController from '../controllers/adminFacilityController.js';
import * as adminVerificationController from '../controllers/adminVerificationController.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/stats', reportController.adminDashboard);

router.get(
  '/pending-role-verifications',
  adminVerificationController.listPending,
);
router.post(
  '/pending-role-verifications/:userId/approve',
  adminVerificationController.approve,
);
router.post(
  '/pending-role-verifications/:userId/reject',
  adminVerificationController.reject,
);

router.get('/users', userController.adminList);
router.patch(
  '/users/:id/status',
  [body('status').isIn(['ACTIVE', 'SUSPENDED', 'BLOCKED'])],
  userController.adminSetStatus,
);

router.get('/bookings', bookingController.adminList);
router.get('/facilities', adminFacilityController.list);
router.patch(
  '/facilities/:id/active',
  [body('isActive').isBoolean()],
  adminFacilityController.setActive,
);

router.get('/teams', teamController.adminList);

router.post(
  '/competitions',
  [
    body('name').trim().notEmpty(),
    body('description').optional(),
    body('sportType').optional().trim().notEmpty(),
    body('maxTeams').optional().isInt({ min: 2, max: 512 }),
    body('startDate').isISO8601(),
    body('endDate').optional().isISO8601(),
    body('status').optional(),
  ],
  competitionController.adminUpsert,
);

router.put(
  '/competitions/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional(),
    body('sportType').optional().trim().notEmpty(),
    body('maxTeams').optional().isInt({ min: 2, max: 512 }),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('status').optional(),
  ],
  competitionController.adminUpsert,
);

router.get(
  '/competitions/:id/qualification-teams',
  competitionController.adminListQualification,
);

router.post(
  '/competitions/:id/qualification/approve-for-qualifiers',
  [body('teamId').isInt()],
  competitionController.adminApproveForQualifiers,
);

router.post(
  '/competitions/:id/qualification/qualify',
  [body('teamId').isInt()],
  competitionController.adminQualifyForMain,
);

router.post(
  '/competitions/:id/qualification/reject',
  [body('teamId').isInt()],
  competitionController.adminRejectQualification,
);

router.post(
  '/matches',
  [
    body('homeTeamId').isInt(),
    body('awayTeamId').isInt(),
    body('matchDate').isISO8601(),
  ],
  competitionController.adminCreateMatch,
);

router.post(
  '/matches/:matchId/result',
  [
    body('homeScore').isInt({ min: 0 }),
    body('awayScore').isInt({ min: 0 }),
  ],
  competitionController.adminRecordResult,
);

router.patch(
  '/sponsorships/:id',
  [body('status').isIn(['PENDING', 'APPROVED', 'REJECTED'])],
  sponsorController.adminSetStatus,
);

router.get('/rewards', rewardController.adminList);
router.patch(
  '/rewards/:id',
  [body('status').isIn(['PENDING', 'APPROVED', 'PAID'])],
  rewardController.adminUpdateStatus,
);

export default router;
