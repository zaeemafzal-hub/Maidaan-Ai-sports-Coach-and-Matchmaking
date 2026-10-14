import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authenticateSupabaseUser, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// All Admin routes require authentication and trusted ADMIN role
router.use(authenticateSupabaseUser, authorizeRoles('ADMIN'));

// Hub Verification Review Endpoints
router.get('/hub-verifications', AdminController.getHubVerifications);
router.get('/hub-verifications/:id', AdminController.getHubVerificationById);
router.patch('/hub-verifications/:id', AdminController.reviewHubVerification);

// Community Report Review Endpoints
router.get('/reports', AdminController.getReports);
router.get('/reports/:id', AdminController.getReportById);
router.patch('/reports/:id', AdminController.reviewReport);

export default router;
