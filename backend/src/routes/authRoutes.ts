import { Router } from 'express';
import { ProfileController } from '../controllers/profileController.js';
import { authenticateSupabaseUser } from '../middleware/auth.js';

const router = Router();

// Authenticated session check endpoint (delegates to getMyProfile)
router.get('/me', authenticateSupabaseUser, ProfileController.getMyProfile);

// Logout acknowledgement endpoint
router.post('/logout', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

export default router;
