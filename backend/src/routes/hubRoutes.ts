import { Router } from 'express';
import { VenueController } from '../controllers/venueController.js';
import { HubCourtController } from '../controllers/hubCourtController.js';
import { HubVerificationController } from '../controllers/hubVerificationController.js';
import { HubDashboardController } from '../controllers/hubDashboardController.js';
import { authenticateSupabaseUser, authorizeRoles } from '../middleware/auth.js';

const router = Router();
const owner = [authenticateSupabaseUser, authorizeRoles('HUB_OWNER')];
router.get('/venue', ...owner, VenueController.own);
router.put('/venue', ...owner, VenueController.saveVenue);
router.post('/spaces', ...owner, VenueController.saveSpace);
router.put('/spaces/:id', ...owner, VenueController.saveSpace);
router.delete('/spaces/:id', ...owner, VenueController.deleteSpace);
router.post('/slots', ...owner, VenueController.saveSlot);
router.put('/slots/:id', ...owner, VenueController.saveSlot);
router.delete('/slots/:id', ...owner, VenueController.deleteSlot);
router.post('/photos', ...owner, VenueController.uploadPhoto);

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
