import { Router } from 'express';
import { HubCourtController } from '../controllers/hubCourtController.js';
import { HubVerificationController } from '../controllers/hubVerificationController.js';
import { HubDashboardController } from '../controllers/hubDashboardController.js';
import { authenticateSupabaseUser, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Hub Dashboard Aggregated Summary (Strictly HUB_OWNER role required)
router.get(
  '/dashboard',
  authenticateSupabaseUser,
  authorizeRoles('HUB_OWNER'),
  HubDashboardController.getDashboardSummary
);

// Hub Owner Venue Profile Endpoints (Strictly HUB_OWNER role required)
router.get(
  '/profile',
  authenticateSupabaseUser,
  authorizeRoles('HUB_OWNER'),
  HubDashboardController.getProfile
);

router.patch(
  '/profile',
  authenticateSupabaseUser,
  authorizeRoles('HUB_OWNER'),
  HubDashboardController.updateProfile
);

// Hub Verification Status & Request Endpoints (Strictly HUB_OWNER role required)
router.get(
  '/verification',
  authenticateSupabaseUser,
  authorizeRoles('HUB_OWNER'),
  HubVerificationController.getVerificationStatus
);

router.post(
  '/verification-request',
  authenticateSupabaseUser,
  authorizeRoles('HUB_OWNER'),
  HubVerificationController.submitVerificationRequest
);

// Hub Court Management Endpoints (Strictly HUB_OWNER role required)
router.get(
  '/courts',
  authenticateSupabaseUser,
  authorizeRoles('HUB_OWNER'),
  HubCourtController.getOwnerCourts
);

router.post(
  '/courts',
  authenticateSupabaseUser,
  authorizeRoles('HUB_OWNER'),
  HubCourtController.createCourt
);

router.patch(
  '/courts/:id',
  authenticateSupabaseUser,
  authorizeRoles('HUB_OWNER'),
  HubCourtController.updateCourt
);

router.delete(
  '/courts/:id',
  authenticateSupabaseUser,
  authorizeRoles('HUB_OWNER'),
  HubCourtController.deleteCourt
);

export default router;
