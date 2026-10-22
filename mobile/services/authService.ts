import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';
import { AuthStorage } from './storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Role, PlayerProfile, CaptainProfile, HubOwnerProfile } from '../types';
import {isStrongPassword, PASSWORD_HELP} from '../utils/passwordPolicy';

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


function requireConfiguration(): void {
  if (!isSupabaseConfigured) throw new Error('Authentication is not configured. Please contact support.');
}

export function getAuthRedirectUrl(path = 'auth/callback'): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return new URL('/' + path, window.location.origin).toString();
  }
  return 'maidaan://' + path;
}

let profileRequest: Promise<MeResult> | null = null;
let lastCallback: { url: string; promise: Promise<{ type?: string; access_token?: string } | null> } | null = null;

export const authService = {
  async register(params: RegisterParams): Promise<RegisterResult> {
    requireConfiguration();
    if (params.role === 'ADMIN') throw new Error('Administrator accounts cannot be created via public registration.');
    if (params.name.trim().length < 2) throw new Error('Full name must be at least 2 characters.');
    if (!isStrongPassword(params.password)) throw new Error(PASSWORD_HELP);
    const email = params.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: params.password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: { name: params.name.trim() },
      },
    });
    if (error) throw new Error(error.message || 'Registration failed.');
    if (!data.user) throw new Error('Registration did not return an account.');
    // Supabase may obscure duplicate accounts; never claim an authenticated session.
    if (!data.session) {
      return {
        user: { id: data.user.id, name: params.name.trim(), email, role: 'PLAYER', roles: ['PLAYER'], createdAt: data.user.created_at },
        needsEmailConfirmation: true,
      };
    }
    // Registration must never silently grant access if provider confirmation is disabled.
    await supabase.auth.signOut({scope: 'local'});
    await AuthStorage.removeToken();
    throw new Error('Email verification must be enabled for signup. Please contact support.');
  },

  async login(params: LoginParams): Promise<LoginResult> {
    requireConfiguration();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email.trim().toLowerCase(),
      password: params.password,
    });
    if (error) throw new Error(error.message || 'Invalid email or password.');
    if (!data.session) throw new Error('No active session returned after sign in.');
    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut({scope: 'local'});
      await AuthStorage.removeToken();
      throw new Error('Please verify your email before signing in. Check your inbox or resend the verification email.');
    }
    await AuthStorage.setToken(data.session.access_token);
    const me = await this.me();
    return {
      user: me.user,
      token: data.session.access_token,
      profile: me.playerProfile || me.captainProfile || me.hubOwnerProfile || null,
    };
  },

  async signInWithGoogle(): Promise<{ success: boolean }> {
    requireConfiguration();
    if (Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      throw new Error('Google sign-in needs the Maidaan development app. In Expo Go, please use email and password.');
    }
    const redirectTo = getAuthRedirectUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    if (error) throw new Error(error.message || 'Google sign-in could not start.');
    if (!data.url) throw new Error('Google sign-in did not return a sign-in link.');
    if (Platform.OS === 'web') {
      window.location.assign(data.url);
      return { success: false }; // Full-page redirect; the callback completes authentication.
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return { success: false }; // User dismissed or cancelled.
    const callback = await this.handleAuthCallbackUrl(result.url);
    if (!callback?.access_token) throw new Error('Google sign-in did not return a valid session.');
    return { success: true };
  },

  async handleAuthCallbackUrl(url: string): Promise<{ type?: string; access_token?: string } | null> {
    if (lastCallback?.url === url) return lastCallback.promise;
    const promise = this.applyAuthCallbackUrl(url);
    lastCallback = { url, promise };
    return promise;
  },

  async applyAuthCallbackUrl(url: string): Promise<{ type?: string; access_token?: string } | null> {
    let parsed: URL;
    try { parsed = new URL(url); } catch { return null; }
    const allowed = ['auth/callback', 'reset-password'].some((path) => {
      const expected = new URL(getAuthRedirectUrl(path));
      return parsed.protocol === expected.protocol && parsed.host === expected.host && parsed.pathname === expected.pathname;
    });
    // Expo Go can still receive password recovery links created by expo-linking.
    const recovery = new URL(Linking.createURL('reset-password'));
    const isRecovery = parsed.protocol === recovery.protocol && parsed.host === recovery.host && parsed.pathname === recovery.pathname;
    if (!allowed && !isRecovery) return null;
    const params = new URLSearchParams(parsed.search);
    const hash = new URLSearchParams(parsed.hash.slice(1));
    hash.forEach((value, key) => params.set(key, value));
    if (params.has('error') || params.has('error_code')) {
      throw new Error(params.get('error_description') || 'Sign-in was cancelled or the link expired. Please try again.');
    }
    const type = params.get('type') || (isRecovery ? 'recovery' : undefined);
    const code = params.get('code');
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session) throw new Error(error?.message || 'The sign-in link expired. Please try again.');
      await AuthStorage.setToken(data.session.access_token);
      return { type, access_token: data.session.access_token };
    }
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return null;
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error || !data.session) throw new Error(error?.message || 'The sign-in link is invalid.');
    await AuthStorage.setToken(data.session.access_token);
    return { type, access_token: data.session.access_token };
  },

  async resetPasswordForEmail(email: string): Promise<void> {
    requireConfiguration();
    const redirectTo = Platform.OS === 'web' ? getAuthRedirectUrl('reset-password') : Linking.createURL('reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    if (error) throw new Error(error.message || 'Failed to send password recovery email.');
  },

  async resendVerificationEmail(email: string): Promise<void> {
    requireConfiguration();
    const {error} = await supabase.auth.resend({type: 'signup', email: email.trim().toLowerCase(), options: {emailRedirectTo: getAuthRedirectUrl()}});
    if (error) throw new Error(error.message || 'Unable to resend verification email. Please try again later.');
  },

  async updatePassword(newPassword: string): Promise<void> {
    requireConfiguration();
    if (!isStrongPassword(newPassword)) throw new Error(PASSWORD_HELP);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message || 'Failed to update password.');
  },

  async initProfile(params: { name: string; role?: Role }): Promise<User> {
    const res = await api.post<{ user: User }>('/api/profile/init', {
      name: params.name.trim(), role: params.role || 'PLAYER',
    });
    if (!res.data?.user || res.error) throw new Error(res.error || 'Failed to initialize profile.');
    return res.data.user;
  },

  async me(): Promise<MeResult> {
    if (profileRequest) return profileRequest;
    profileRequest = (async () => {
      let res = await api.get<MeResult>('/api/profile/me');
      if (res.status === 404) {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) throw new Error('Please sign in again.');
        const metadata = data.user.user_metadata || {};
        const name = String(metadata.full_name || metadata.name || data.user.email?.split('@')[0] || 'Athlete');
        // OAuth metadata can provide a name, never account permissions.
        await this.initProfile({ name: name.length >= 2 ? name : 'Athlete', role: 'PLAYER' });
        res = await api.get<MeResult>('/api/profile/me');
      }
      if (!res.data?.user || res.error) {
        const error = new Error(res.error || 'Unable to load your account.') as Error & { status: number };
        error.status = res.status;
        throw error;
      }
      return res.data;
    })().finally(() => { profileRequest = null; });
    return profileRequest;
  },

  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } finally {
      lastCallback = null;
      await AuthStorage.removeToken();
    }
  },
};
