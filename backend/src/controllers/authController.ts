import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { isServerSupabaseConfigured } from '../lib/supabase.js';
import { createClient } from '@supabase/supabase-js';
import { isTest } from '../config/runtime.js';
import { SupabaseRepo, Role } from '../models/supabaseRepo.js';
import {isStrongPassword, PASSWORD_HELP} from '../services/passwordPolicy.js';

const ALLOWED_PUBLIC_ROLES: Role[] = ['PLAYER', 'TEAM_CAPTAIN', 'HUB_OWNER'];

export const AuthController = {
  /**
   * POST /api/auth/register
   * Registers a new account using the project's normal email confirmation policy.
   * The profile is initialized after the verified user signs in.
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

      if (!isStrongPassword(password)) {
        res.status(400).json({ error: PASSWORD_HELP });
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

      if (!isTest()) {
        const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!isServerSupabaseConfigured || !publicKey) {
          res.status(503).json({ error: 'Public authentication is not configured.' });
          return;
        }
        // Honor the project's email confirmation settings. Never use admin.createUser
        // or auto-confirm an address supplied to this public endpoint.
        const auth = createClient(process.env.SUPABASE_URL!, publicKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await auth.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { name: name.trim() } },
        });
        if (error || !data.user) {
          res.status(error?.code === 'user_already_exists' ? 409 : 400)
            .json({ error: error?.message || 'Registration failed.' });
          return;
        }
        if (data.session) {
          await auth.auth.signOut({scope: 'local'});
          res.status(503).json({error: 'Email verification must be enabled for signup. Please contact support.'});
          return;
        }
        res.status(201).json({
          success: true,
          needsEmailConfirmation: !data.session,
          user: { id: data.user.id, name: name.trim(), email: normalizedEmail, role: 'PLAYER', roles: ['PLAYER'], createdAt: data.user.created_at },
        });
        return;
      }

      const userId = crypto.randomUUID();

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
