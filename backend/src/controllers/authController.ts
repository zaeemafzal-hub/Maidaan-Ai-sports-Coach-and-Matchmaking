import { Request, Response } from 'express';
import { supabaseAdmin, isServerSupabaseConfigured } from '../lib/supabase.js';
import { SupabaseRepo, Role } from '../models/supabaseRepo.js';

const ALLOWED_PUBLIC_ROLES: Role[] = ['PLAYER', 'TEAM_CAPTAIN', 'HUB_OWNER'];

export const AuthController = {
  /**
   * POST /api/auth/register
   * Registers a new account, auto-confirms email so user can immediately sign in,
   * initializes public.profiles and public.user_roles row.
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, role } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({ error: 'Full name is required and must be at least 2 characters.' });
        return;
      }

      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        res.status(400).json({ error: 'A valid email address is required.' });
        return;
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }

      const assignedRole: Role = role && typeof role === 'string' ? (role as Role) : 'PLAYER';
      if (assignedRole === 'ADMIN') {
        res.status(403).json({ error: 'Administrator accounts cannot be created via public registration.' });
        return;
      }

      if (!ALLOWED_PUBLIC_ROLES.includes(assignedRole)) {
        res.status(400).json({ error: `Invalid role selected. Must be one of: ${ALLOWED_PUBLIC_ROLES.join(', ')}.` });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      let userId: string;

      if (isServerSupabaseConfigured) {
        // Create user in Supabase with email_confirm: true so user can immediately sign in
        const { data: created, error: createError } = await (supabaseAdmin.auth as any).admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            name: name.trim(),
            role: assignedRole,
          },
        });

        if (createError) {
          const msg = createError.message?.toLowerCase() || '';
          if (msg.includes('already') || createError.status === 422) {
            res.status(409).json({ error: 'An account with this email already exists.' });
            return;
          }
          res.status(400).json({ error: createError.message || 'Registration failed.' });
          return;
        }

        if (!created?.user) {
          res.status(500).json({ error: 'User creation returned empty user record.' });
          return;
        }

        userId = created.user.id;
      } else {
        userId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }

      // Initialize profile and roles in database
      let profile = await SupabaseRepo.getProfile(userId);
      if (!profile) {
        profile = await SupabaseRepo.createProfile({
          id: userId,
          name: name.trim(),
          email: normalizedEmail,
          role: assignedRole,
        });
      } else {
        await SupabaseRepo.addRole(userId, assignedRole);
      }

      const roles = await SupabaseRepo.getUserRoles(userId);

      res.status(201).json({
        success: true,
        user: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          roles,
          onboardingCompleted: profile.onboarding_completed,
          createdAt: profile.created_at,
        },
        roles,
      });
    } catch (err: any) {
      console.error('[AuthController.register] Error:', err);
      res.status(500).json({ error: 'Registration failed due to internal error.' });
    }
  },
};
