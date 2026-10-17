import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { AccountAdminController } from '../controllers/accountAdminController.js';
import {BookingController} from '../controllers/bookingController.js';
import { authenticateSupabaseUser, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// All Admin routes require authentication and trusted ADMIN role
router.use(authenticateSupabaseUser, authorizeRoles('ADMIN'));
router.get('/booking-refunds',BookingController.refunds);
router.post('/booking-refunds/:id/record',BookingController.refundRecorded);
router.get('/accounts', AccountAdminController.list);
router.get('/accounts/:id', AccountAdminController.details);
router.patch('/accounts/:id/status', AccountAdminController.moderate);
router.patch('/accounts/:id/superuser', AccountAdminController.superuser);

// Admin Dashboard Operational Metrics Endpoint
router.get('/dashboard', AdminController.getDashboardSummary);

// Hub List Endpoint
router.get('/hubs', AdminController.getHubs);

// Hub Verification Review Endpoints
router.get('/hub-verifications', AdminController.getHubVerifications);
router.get('/hub-verifications/:id', AdminController.getHubVerificationById);
router.patch('/hub-verifications/:id', AdminController.reviewHubVerification);

// Community Report Review Endpoints
router.get('/reports', AdminController.getReports);
router.get('/reports/:id', AdminController.getReportById);
router.patch('/reports/:id', AdminController.reviewReport);

export default router;
