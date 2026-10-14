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
  token: string;
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

      const token = data.session?.access_token || `test_token:${data.user?.id || Date.now()}:${encodeURIComponent(normalizedEmail)}`;
      await AuthStorage.setToken(token);

      // Initialize public.profiles row via backend Express API
      const initRes = await api.post<{ user: User }>('/api/profile/init', {
        name: params.name.trim(),
        role: params.role,
      });

      const user: User = initRes.data?.user || {
        id: data.user?.id || `usr_${Date.now()}`,
        name: params.name.trim(),
        email: normalizedEmail,
        role: params.role,
        createdAt: new Date().toISOString(),
      };

      return { user, token };
    }

    // 2. Demo / local fallback when placeholder Supabase URL is active
    const mockUserId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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
      await AuthStorage.setToken(token);

      // Fetch verified user & profile from backend
      const meRes = await api.get<MeResult>('/api/profile/me');
      if (!meRes.data?.user) {
        throw new Error('Failed to retrieve user profile after sign in.');
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
    let mockUserId = `usr_${Date.now()}_demo`;
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
