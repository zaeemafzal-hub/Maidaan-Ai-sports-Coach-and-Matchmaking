import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { ProfileController } from '../controllers/profileController.js';
import { authenticateSupabaseUser } from '../middleware/auth.js';

const router = Router();

// Public user registration honoring Supabase email confirmation
router.post('/register', AuthController.register);

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
