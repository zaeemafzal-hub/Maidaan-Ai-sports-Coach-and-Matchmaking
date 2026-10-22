import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, isServerSupabaseConfigured } from '../lib/supabase.js';
import { SupabaseRepo, Role } from '../models/supabaseRepo.js';
import { allowsSyntheticAuth } from '../config/runtime.js';

export interface AuthenticatedContext {
  userId: string;
  email: string;
  role?: Role;
  roles?: Role[];
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

    if (token.startsWith('test_token:') || token.startsWith('test_token_')) {
      if (!allowsSyntheticAuth()) {
        // Strict data isolation: synthetic test tokens are prohibited outside test mode
        return null;
      }

      if (token.startsWith('test_token:')) {
        const parts = token.split(':');
        verifiedUserId = parts[1] || 'test-user-id';
        verifiedEmail = parts[2] ? decodeURIComponent(parts[2]) : 'test@maidaan.pk';
      } else {
        const remainder = token.replace('test_token_', '');
        const lastUnderscore = remainder.lastIndexOf('_');
        if (lastUnderscore > 0) {
          verifiedUserId = remainder.substring(0, lastUnderscore);
          verifiedEmail = decodeURIComponent(remainder.substring(lastUnderscore + 1));
        } else {
          verifiedUserId = remainder;
          verifiedEmail = 'test@maidaan.pk';
        }
      }
    } else if (isServerSupabaseConfigured) {
      // Official Supabase server-side token verification
      const { data, error } = await (supabaseAdmin.auth as any).getUser(token);

      if (error || !data?.user || !data.user.email || !data.user.email_confirmed_at) {
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

    // Load trusted server-side role and capabilities from public.user_roles / public.profiles
    const roles = await SupabaseRepo.getUserRoles(verifiedUserId);
    const profile = await SupabaseRepo.getProfile(verifiedUserId);
    if (profile?.account_status === 'SUSPENDED') return null;

    return {
      userId: verifiedUserId,
      email: verifiedEmail || (profile ? profile.email : ''),
      role: profile ? profile.role : (roles[0] || undefined),
      roles,
    };
  } catch (error) {
    console.error('[verifyAuthToken] Error verifying token:', error);
    return null;
  }
}

/**
 * Reusable Supabase authentication middleware.
 * Verifies access token with Supabase server-side.
 * Attaches verified req.auth = { userId, email, role, roles }.
 * Never trusts userId or role from request body, headers, or query parameters.
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
 * Role-Based Access Control (RBAC) middleware for multi-role architecture.
 * Checks server-side capabilities from user_roles.
 * Rejects requests if user does not possess at least one of the allowed roles.
 */
export const authorizeRoles = (...allowedRoles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth || !req.auth.userId) {
      res.status(401).json({
        error: 'Authentication required.',
      });
      return;
    }

    // Load trusted server-side capabilities from database
    let userRoles = req.auth.roles;
    if (!userRoles || userRoles.length === 0) {
      userRoles = await SupabaseRepo.getUserRoles(req.auth.userId);
      req.auth.roles = userRoles;
      if (!req.auth.role && userRoles.length > 0) {
        req.auth.role = userRoles[0];
      }
    }

    const hasPermission = allowedRoles.some((allowed) => userRoles!.includes(allowed));
    if (!hasPermission) {
      res.status(403).json({
        error: `Access forbidden: This action requires role [${allowedRoles.join(
          ', '
        )}], but your account capabilities are [${userRoles.join(', ')}].`,
      });
      return;
    }

    next();
  };
};
