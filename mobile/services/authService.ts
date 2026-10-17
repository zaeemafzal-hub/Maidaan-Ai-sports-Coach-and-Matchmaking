import * as Linking from 'expo-linking';
import { api } from './api';
import { AuthStorage } from './storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Role, PlayerProfile, CaptainProfile, HubOwnerProfile } from '../types';

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  role?: Role;
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
  profile?: PlayerProfile | CaptainProfile | HubOwnerProfile | null;
}

export interface MeResult {
  user: User;
  roles: Role[];
  onboarding: {
    player: boolean;
    captain: boolean;
    hubOwner: boolean;
  };
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
    const assignedRole = params.role || 'PLAYER';
    if (assignedRole === 'ADMIN') {
      throw new Error('Administrator accounts cannot be created via public registration.');
    }

    const normalizedEmail = params.email.trim().toLowerCase();

    // 1. Try backend registration first (auto-confirms email and creates database profile)
    try {
      const regRes = await api.post<{ user: User }>('/api/auth/register', {
        name: params.name.trim(),
        email: normalizedEmail,
        password: params.password,
        role: assignedRole,
      });

      if (regRes.data?.user) {
        // Sign in immediately to acquire active session
        if (isSupabaseConfigured) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: params.password,
          });

          if (!signInError && signInData?.session?.access_token) {
            const token = signInData.session.access_token;
            await AuthStorage.setToken(token);
            return {
              user: regRes.data.user,
              token,
              needsEmailConfirmation: false,
            };
          }
        } else {
          const mockToken = `test_token:${regRes.data.user.id}:${encodeURIComponent(normalizedEmail)}`;
          await AuthStorage.setToken(mockToken);
          return {
            user: regRes.data.user,
            token: mockToken,
            needsEmailConfirmation: false,
          };
        }
      } else if (regRes.status === 409 || (regRes.error && regRes.error.toLowerCase().includes('already exists'))) {
        throw new Error(regRes.error || 'An account with this email already exists.');
      }
    } catch (backendErr: any) {
      if (backendErr.message?.toLowerCase().includes('already exists')) {
        throw backendErr;
      }
      // If server error, proceed to direct Supabase Auth fallback
    }

    // 2. Direct Supabase Auth fallback
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: params.password,
        options: {
          data: {
            name: params.name.trim(),
            role: assignedRole,
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
            role: assignedRole,
            roles: ['PLAYER'],
            createdAt: new Date().toISOString(),
          },
          token: undefined,
          needsEmailConfirmation: true,
        };
      }

      const token = data.session.access_token;
      await AuthStorage.setToken(token);

      // Initialize public.profiles row via backend Express API
      const initRes = await api.post<{ user: User }>(
        '/api/profile/init',
        {
          name: params.name.trim(),
          role: assignedRole,
        },
        { Authorization: `Bearer ${token}` }
      );

      const user: User = initRes.data?.user || {
        id: data.user?.id || generateUUID(),
        name: params.name.trim(),
        email: normalizedEmail,
        role: assignedRole,
        roles: ['PLAYER'],
        createdAt: new Date().toISOString(),
      };

      return { user, token };
    }

    // 3. Demo / local fallback when placeholder Supabase URL is active
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
      role: params.role || 'PLAYER',
      roles: [params.role || 'PLAYER'],
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
        throw new Error(error.message || 'Invalid email or password.');
      }

      if (!data?.session?.access_token) {
        throw new Error('No active session returned after sign in.');
      }

      const token = data.session.access_token;
      await AuthStorage.setToken(token);

      // Fetch verified user & profile from backend passing token directly in headers
      let meRes = await api.get<MeResult>('/api/profile/me', {
        Authorization: `Bearer ${token}`,
      });

      if (meRes.status === 404) {
        // Auto-initialize profile only if missing in database (404)
        const userMeta = data.user?.user_metadata || {};
        const role = (userMeta.role as Role) || 'PLAYER';
        const name = userMeta.name || normalizedEmail.split('@')[0] || 'Athlete';
        await api.post(
          '/api/profile/init',
          { name, role },
          { Authorization: `Bearer ${token}` }
        ).catch(() => {});
        meRes = await api.get<MeResult>('/api/profile/me', {
          Authorization: `Bearer ${token}`,
        });
      }

      if (!meRes.data?.user) {
        // Resilient fallback: Construct user from active Supabase session so login never hangs
        const userMeta = data.user?.user_metadata || {};
        const role = (userMeta.role as Role) || 'PLAYER';
        const name = userMeta.name || normalizedEmail.split('@')[0] || 'Athlete';
        const fallbackUser: User = {
          id: data.user.id,
          name,
          email: normalizedEmail,
          role,
          roles: [role],
          createdAt: new Date().toISOString(),
        };
        return {
          user: fallbackUser,
          token,
          profile: null,
        };
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
      roles: [mockRole],
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
   * Initiate Google OAuth flow via Supabase Auth.
   * Directs to Google Sign-In and redirects back to maidaan://auth/callback.
   */
  async signInWithGoogle(): Promise<{ url?: string; success: boolean }> {
    const redirectUrl = Linking.createURL('auth/callback');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw new Error(error.message || 'Google sign-in initialization failed.');
      }

      if (data?.url) {
        await Linking.openURL(data.url);
        return { url: data.url, success: true };
      }
      return { success: false };
    }

    // Mock / offline sandbox fallback
    return { success: true };
  },

  /**
   * Parses and applies session tokens from deep link callback URL (e.g. from Google OAuth or password recovery).
   */
  async handleAuthCallbackUrl(url: string): Promise<{ type?: string; access_token?: string } | null> {
    if (!url) return null;

    try {
      // Check for hash parameters (#access_token=...&refresh_token=...)
      const hashIndex = url.indexOf('#');
      let paramsString = '';
      if (hashIndex !== -1) {
        paramsString = url.substring(hashIndex + 1);
      } else {
        const queryIndex = url.indexOf('?');
        if (queryIndex !== -1) {
          paramsString = url.substring(queryIndex + 1);
        }
      }

      if (!paramsString) return null;

      const params = new URLSearchParams(paramsString);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type') || undefined;

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('[authService.handleAuthCallbackUrl] Failed to set session:', error);
          return null;
        }
        return { type, access_token: accessToken };
      }
    } catch (e) {
      console.warn('[authService.handleAuthCallbackUrl] Error parsing URL:', e);
    }
    return null;
  },

  /**
   * Send password recovery email via Supabase Auth.
   */
  async resetPasswordForEmail(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const redirectUrl = Linking.createURL('reset-password');

    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw new Error(error.message || 'Failed to send password recovery email.');
      }
      return;
    }

    // Mock / sandbox fallback
    await new Promise((resolve) => setTimeout(resolve, 400));
  },

  /**
   * Update authenticated user's password (e.g. from password recovery screen).
   */
  async updatePassword(newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message || 'Failed to update password.');
      }
      return;
    }

    // Mock / sandbox fallback
    await new Promise((resolve) => setTimeout(resolve, 400));
  },

  /**
   * Initialize or sync public.profiles row on backend Express API.
   */
  async initProfile(params: { name: string; role?: Role }): Promise<User> {
    const res = await api.post<{ user: User }>('/api/profile/init', {
      name: params.name.trim(),
      role: params.role || 'PLAYER',
    });

    if (!res.data?.user || res.error) {
      throw new Error(res.error || 'Failed to initialize profile.');
    }

    return res.data.user;
  },

  /**
   * Quick access demo social login (Google/Apple) for sandbox testing.
   */
  async socialLogin(provider: 'Google' | 'Apple', role: Role): Promise<LoginResult> {
    const mockUserId = generateUUID();
    const normalizedEmail = `${provider.toLowerCase()}.athlete@maidaan.pk`;
    const name = `${provider} Athlete`;
    const token = `test_token:${mockUserId}:${encodeURIComponent(normalizedEmail)}`;

    if (!isSupabaseConfigured) {
      await AuthStorage.setToken(token);
    }

    // Initialize backend profile so authorizeRoles and profile routes find it
    await api.post('/api/profile/init', { name, role }).catch(() => {});

    const user: User = {
      id: mockUserId,
      name,
      email: normalizedEmail,
      role,
      roles: [role],
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
      const error: any = new Error(res.error || 'Session expired or invalid.');
      error.status = res.status;
      throw error;
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
