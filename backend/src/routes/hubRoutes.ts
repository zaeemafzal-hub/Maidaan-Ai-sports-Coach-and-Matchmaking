import { Router } from 'express';
import { HubCourtController } from '../controllers/hubCourtController.js';
import { HubVerificationController } from '../controllers/hubVerificationController.js';
import { authenticateSupabaseUser, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Hub Verification Request Endpoint (Strictly HUB_OWNER role required)
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
