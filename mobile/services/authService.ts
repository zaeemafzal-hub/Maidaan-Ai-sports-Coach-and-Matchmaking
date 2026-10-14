import { api } from './api';
import { AuthStorage } from './storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Role, PlayerProfile, CaptainProfile, HubOwnerProfile } from '../types';

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface RegisterResult {
  user: User;
  token?: string;
  needsEmailConfirmation?: boolean;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface LoginResult {
  user: User;
  token: string;
  profile?: any;
}

export interface MeResult {
  user: User;
  playerProfile?: PlayerProfile | null;
  captainProfile?: CaptainProfile | null;
  hubOwnerProfile?: HubOwnerProfile | null;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const authService = {
  /**
   * Register a new user account with Supabase Auth.
   * Public registration rejects ADMIN accounts.
   * Initializes public.profiles row upon successful signup.
   */
  async register(params: RegisterParams): Promise<RegisterResult> {
    if (params.role === 'ADMIN') {
      throw new Error('Administrator accounts cannot be created via public registration.');
    }

    const normalizedEmail = params.email.trim().toLowerCase();

    // 1. If real Supabase instance is configured, use official Supabase Auth
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: params.password,
        options: {
          data: {
            name: params.name.trim(),
            role: params.role,
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Registration failed.');
      }

      // If Supabase project requires email confirmation and returns no active session
      if (!data.session?.access_token) {
        return {
          user: {
            id: data.user?.id || generateUUID(),
            name: params.name.trim(),
            email: normalizedEmail,
            role: params.role,
            createdAt: new Date().toISOString(),
          },
          token: undefined,
          needsEmailConfirmation: true,
        };
      }

      const token = data.session.access_token;

      // Initialize public.profiles row via backend Express API
      const initRes = await api.post<{ user: User }>('/api/profile/init', {
        name: params.name.trim(),
        role: params.role,
      });

      const user: User = initRes.data?.user || {
        id: data.user?.id || generateUUID(),
        name: params.name.trim(),
        email: normalizedEmail,
        role: params.role,
        createdAt: new Date().toISOString(),
      };

      return { user, token };
    }

    // 2. Demo / local fallback when placeholder Supabase URL is active
    const mockUserId = generateUUID();
    const mockToken = `test_token:${mockUserId}:${encodeURIComponent(normalizedEmail)}`;
    await AuthStorage.setToken(mockToken);

    const initRes = await api.post<{ user: User }>('/api/profile/init', {
      name: params.name.trim(),
      role: params.role,
    });

    const user: User = initRes.data?.user || {
      id: mockUserId,
      name: params.name.trim(),
      email: normalizedEmail,
      role: params.role,
      createdAt: new Date().toISOString(),
    };

    return { user, token: mockToken };
  },

  /**
   * Authenticate with Supabase Auth using email and password.
   */
  async login(params: LoginParams): Promise<LoginResult> {
    const normalizedEmail = params.email.trim().toLowerCase();

    // 1. Real Supabase Auth authentication if configured
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: params.password,
      });

      if (error) {
        throw new Error('Invalid email or password.');
      }

      const token = data.session.access_token;

      // Fetch verified user & profile from backend
      let meRes = await api.get<MeResult>('/api/profile/me');
      if (meRes.status === 404) {
        // Auto-initialize profile only if missing in database (404)
        const userMeta = data.user?.user_metadata || {};
        const role = (userMeta.role as Role) || 'PLAYER';
        const name = userMeta.name || normalizedEmail.split('@')[0] || 'Athlete';
        await api.post('/api/profile/init', { name, role }).catch(() => {});
        meRes = await api.get<MeResult>('/api/profile/me');
      }

      if (!meRes.data?.user) {
        throw new Error(meRes.error || 'Failed to retrieve user profile after sign in.');
      }

      return {
        user: meRes.data.user,
        token,
        profile:
          meRes.data.playerProfile ||
          meRes.data.captainProfile ||
          meRes.data.hubOwnerProfile ||
          null,
      };
    }

    // 2. Demo / local fallback when running in sandbox without external Supabase credentials
    let mockUserId = generateUUID();
    let mockRole: Role = 'PLAYER';
    let mockName = normalizedEmail.split('@')[0] || 'Athlete';

    if (normalizedEmail === 'admin@maidaan.pk') {
      if (params.password !== 'admin123456') {
        throw new Error('Invalid email or password.');
      }
      mockUserId = '00000000-0000-0000-0000-000000000001';
      mockRole = 'ADMIN';
      mockName = 'Platform Administrator';
    }

    const mockToken = `test_token:${mockUserId}:${encodeURIComponent(normalizedEmail)}`;
    await AuthStorage.setToken(mockToken);

    // Ensure backend profile exists
    await api.post('/api/profile/init', {
      name: mockName,
      role: mockRole,
    }).catch(() => {});

    // Retrieve profile from backend
    const meRes = await api.get<MeResult>('/api/profile/me');
    const user: User = meRes.data?.user || {
      id: mockUserId,
      name: mockName,
      email: normalizedEmail,
      role: mockRole,
      createdAt: new Date().toISOString(),
    };

    return {
      user,
      token: mockToken,
      profile:
        meRes.data?.playerProfile ||
        meRes.data?.captainProfile ||
        meRes.data?.hubOwnerProfile ||
        null,
    };
  },

  /**
   * Quick access demo social login (Google/Apple).
   * Generates a valid session token, registers public.profiles row in backend database, and returns valid session.
   */
  async socialLogin(provider: 'Google' | 'Apple', role: Role): Promise<LoginResult> {
    const mockUserId = generateUUID();
    const normalizedEmail = `${provider.toLowerCase()}.athlete@maidaan.pk`;
    const name = `${provider} Athlete`;
    const token = `test_token:${mockUserId}:${encodeURIComponent(normalizedEmail)}`;

    await AuthStorage.setToken(token);

    // Initialize backend profile so authorizeRoles and profile routes find it
    await api.post('/api/profile/init', { name, role }).catch(() => {});

    const user: User = {
      id: mockUserId,
      name,
      email: normalizedEmail,
      role,
      createdAt: new Date().toISOString(),
    };

    return { user, token };
  },

  /**
   * Retrieve current user profile and session identity.
   */
  async me(): Promise<MeResult> {
    const res = await api.get<MeResult>('/api/profile/me');

    if (!res.data || res.error) {
      throw new Error(res.error || 'Session expired or invalid.');
    }

    return res.data;
  },

  /**
   * Sign out from Supabase Auth and clear local session.
   */
  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    try {
      await api.post('/api/auth/logout');
    } catch {
      // ignore
    } finally {
      await AuthStorage.removeToken();
    }
  },
};
