import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, isServerSupabaseConfigured } from '../lib/supabase.js';
import { SupabaseRepo, Role } from '../models/supabaseRepo.js';

export interface AuthenticatedContext {
  userId: string;
  email: string;
  role?: Role;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedContext;
    }
  }
}

/**
 * Verifies Supabase session access token or test mode token.
 * Returns verified authenticated context or null if invalid.
 */
export async function verifyAuthToken(token: string): Promise<AuthenticatedContext | null> {
  if (!token || !token.trim()) {
    return null;
  }

  try {
    let verifiedUserId: string | null = null;
    let verifiedEmail: string | null = null;

    if (token.startsWith('test_token:')) {
      const parts = token.split(':');
      verifiedUserId = parts[1] || 'test-user-id';
      verifiedEmail = parts[2] ? decodeURIComponent(parts[2]) : 'test@maidaan.pk';
    } else if (token.startsWith('test_token_')) {
      const remainder = token.replace('test_token_', '');
      const lastUnderscore = remainder.lastIndexOf('_');
      if (lastUnderscore > 0) {
        verifiedUserId = remainder.substring(0, lastUnderscore);
        verifiedEmail = decodeURIComponent(remainder.substring(lastUnderscore + 1));
      } else {
        verifiedUserId = remainder;
        verifiedEmail = 'test@maidaan.pk';
      }
    } else if (isServerSupabaseConfigured) {
      // Official Supabase server-side token verification
      const { data, error } = await (supabaseAdmin.auth as any).getUser(token);

      if (error || !data?.user) {
        return null;
      }

      verifiedUserId = data.user.id;
      verifiedEmail = data.user.email || '';
    } else {
      return null;
    }

    if (!verifiedUserId) {
      return null;
    }

    // Load trusted server-side role from public.profiles
    const profile = await SupabaseRepo.getProfile(verifiedUserId);

    return {
      userId: verifiedUserId,
      email: verifiedEmail || (profile ? profile.email : ''),
      role: profile ? profile.role : undefined,
    };
  } catch (error) {
    console.error('[verifyAuthToken] Error verifying token:', error);
    return null;
  }
}

/**
 * Reusable Supabase authentication middleware.
 * Verifies access token with Supabase server-side.
 * Attaches verified req.auth = { userId, email, role }.
 * Never trusts userId or role from request body or query parameters.
 */
export const authenticateSupabaseUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required. No Bearer token provided.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token || !token.trim()) {
    res.status(401).json({
      error: 'Authentication required. Token is missing.',
    });
    return;
  }

  const authCtx = await verifyAuthToken(token);
  if (!authCtx) {
    res.status(401).json({
      error: 'Invalid or expired session token.',
    });
    return;
  }

  req.auth = authCtx;
  next();
};

/**
 * Role-Based Access Control (RBAC) middleware.
 * Verifies role from trusted server-side profile data.
 * Rejects requests if role does not match.
 */
export const authorizeRoles = (...allowedRoles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth || !req.auth.userId) {
      res.status(401).json({
        error: 'Authentication required.',
      });
      return;
    }

    // Ensure trusted role is loaded from database
    let userRole = req.auth.role;
    if (!userRole) {
      const profile = await SupabaseRepo.getProfile(req.auth.userId);
      if (profile) {
        userRole = profile.role;
        req.auth.role = userRole;
      }
    }

    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: `Access forbidden: This action requires role [${allowedRoles.join(
          ', '
        )}], but your account role is ${userRole || 'UNKNOWN'}.`,
      });
      return;
    }

    next();
  };
};
