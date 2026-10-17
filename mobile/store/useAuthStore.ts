import { create } from 'zustand';
import type { StateCreator } from 'zustand/vanilla';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Role, User, PlayerProfile, CaptainProfile, HubOwnerProfile, AppMode, OnboardingStatus } from '../types';
import { authService } from '../services/authService';
import { AuthStorage } from '../services/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { socketService } from '../services/socketService';

const ACTIVE_MODE_KEY = 'maidaan_active_mode';

export type AuthStatus =
  | 'BOOTING'
  | 'SIGNED_OUT'
  | 'AUTHENTICATING'
  | 'PROFILE_LOADING'
  | 'ONBOARDING_REQUIRED'
  | 'READY'
  | 'ERROR';

export interface AuthState {
  authStatus: AuthStatus;
  roles: Role[];
  activeMode: AppMode;
  selectedRole: Role | null; // legacy compatibility
  currentUser: User | null;
  playerProfile: PlayerProfile | null;
  captainProfile: CaptainProfile | null;
  hubOwnerProfile: HubOwnerProfile | null;
  onboarding: OnboardingStatus;
  onboardingCompleted: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthInitialized: boolean;
  isAuthenticated: boolean;
  isLoadingProfile: boolean;
  errorMessage: string | null;

  setAuthStatus: (status: AuthStatus) => void;
  setActiveMode: (mode: AppMode) => Promise<void>;
  setSelectedRole: (role: Role) => void;
  setCurrentUser: (user: User | null) => void;
  setPlayerProfile: (profile: PlayerProfile | null) => void;
  setCaptainProfile: (profile: CaptainProfile | null) => void;
  setHubOwnerProfile: (profile: HubOwnerProfile | null) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setErrorMessage: (msg: string | null) => void;

  initializeAuth: () => Promise<void>;
  loadProfile: () => Promise<boolean>;
  logout: () => Promise<void>;
  reset: () => void;
}

let authSubscriptionInitialized = false;

const authStoreCreator: StateCreator<AuthState> = (set, get) => ({
  authStatus: 'BOOTING',
  roles: ['PLAYER'],
  activeMode: 'PLAYER',
  selectedRole: 'PLAYER',
  currentUser: null,
  playerProfile: null,
  captainProfile: null,
  hubOwnerProfile: null,
  onboarding: {
    player: false,
    captain: false,
    hubOwner: false,
  },
  onboardingCompleted: false,
  isLoading: false,
  isInitialized: false,
  isAuthInitialized: false,
  isAuthenticated: false,
  isLoadingProfile: false,
  errorMessage: null,

  setAuthStatus: (status: AuthStatus) => set({ authStatus: status }),

  setActiveMode: async (mode: AppMode) => {
    const userRoles = get().roles;
    // Validate activeMode strictly against granted server roles
    const validatedMode = userRoles.includes(mode) ? mode : 'PLAYER';

    try {
      await AsyncStorage.setItem(ACTIVE_MODE_KEY, validatedMode);
    } catch {
      // Safe fallback
    }

    const onboarding = get().onboarding;
    let needsOnboarding = false;
    if (validatedMode === 'PLAYER' && !onboarding.player) {
      needsOnboarding = true;
    } else if (validatedMode === 'TEAM_CAPTAIN' && !onboarding.captain) {
      needsOnboarding = true;
    } else if (validatedMode === 'HUB_OWNER' && !onboarding.hubOwner) {
      needsOnboarding = true;
    }

    set({
      activeMode: validatedMode,
      selectedRole: validatedMode,
      authStatus: needsOnboarding ? 'ONBOARDING_REQUIRED' : 'READY',
    });
  },

  setSelectedRole: (role: Role) => set({ selectedRole: role, activeMode: role }),
  setCurrentUser: (user: User | null) =>
    set({
      currentUser: user,
      isAuthenticated: Boolean(user),
    }),
  setPlayerProfile: (profile: PlayerProfile | null) =>
    set((state: AuthState) => ({
      playerProfile: profile,
      onboarding: { ...state.onboarding, player: Boolean(profile) },
    })),
  setCaptainProfile: (profile: CaptainProfile | null) =>
    set((state: AuthState) => ({
      captainProfile: profile,
      onboarding: { ...state.onboarding, captain: Boolean(profile) },
    })),
  setHubOwnerProfile: (profile: HubOwnerProfile | null) =>
    set((state: AuthState) => ({
      hubOwnerProfile: profile,
      onboarding: { ...state.onboarding, hubOwner: Boolean(profile) },
    })),
  setOnboardingCompleted: (completed: boolean) =>
    set((state: AuthState) => ({
      onboardingCompleted: completed,
      authStatus: completed && state.isAuthenticated ? 'READY' : state.authStatus,
    })),
  setErrorMessage: (msg: string | null) => set({ errorMessage: msg }),

  loadProfile: async (): Promise<boolean> => {
    try {
      set({ isLoadingProfile: true, errorMessage: null });
      const meData = await authService.me();

      // Extract server-authoritative capabilities
      const roles: Role[] = meData.roles ?? meData.user.roles ?? [];
      if (roles.length === 0) throw new Error('Your account has no active permissions. Please contact support.');

      const onboarding: OnboardingStatus = meData.onboarding || {
        player: Boolean(meData.playerProfile),
        captain: Boolean(meData.captainProfile),
        hubOwner: Boolean(meData.hubOwnerProfile),
      };

      // Retrieve locally persisted activeMode preference
      let resolvedMode: AppMode = 'PLAYER';
      try {
        const storedMode = await AsyncStorage.getItem(ACTIVE_MODE_KEY);
        if (storedMode && roles.includes(storedMode as Role)) {
          resolvedMode = storedMode as AppMode;
        } else {
          resolvedMode = roles.includes('PLAYER') ? 'PLAYER' : (roles[0] as AppMode);
        }
      } catch {
        resolvedMode = roles.includes('PLAYER') ? 'PLAYER' : (roles[0] as AppMode);
      }

      // Check whether the active mode's onboarding is complete
      let isModeOnboardingComplete = false;
      if (resolvedMode === 'PLAYER') {
        isModeOnboardingComplete = onboarding.player;
      } else if (resolvedMode === 'TEAM_CAPTAIN') {
        isModeOnboardingComplete = onboarding.captain;
      } else if (resolvedMode === 'HUB_OWNER') {
        isModeOnboardingComplete = onboarding.hubOwner;
      } else {
        isModeOnboardingComplete = true;
      }

      set({
        currentUser: meData.user,
        roles,
        activeMode: resolvedMode,
        selectedRole: resolvedMode,
        playerProfile: meData.playerProfile || null,
        captainProfile: meData.captainProfile || null,
        hubOwnerProfile: meData.hubOwnerProfile || null,
        onboarding,
        onboardingCompleted: isModeOnboardingComplete,
        isAuthenticated: true,
        isLoadingProfile: false,
        isLoading: false,
        isInitialized: true,
        isAuthInitialized: true,
        authStatus: isModeOnboardingComplete ? 'READY' : 'ONBOARDING_REQUIRED',
        errorMessage: null,
      });

      // Maintain live socket connection when authenticated
      socketService.connect().catch(() => {});

      return true;
    } catch (err: any) {
      if (err?.status === 401) {
        // Stale or invalid session
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        await AuthStorage.removeToken();
        try {
          await AsyncStorage.removeItem(ACTIVE_MODE_KEY);
        } catch {
          // ignore
        }
        set({
          currentUser: null,
          roles: ['PLAYER'],
          activeMode: 'PLAYER',
          selectedRole: 'PLAYER',
          playerProfile: null,
          captainProfile: null,
          hubOwnerProfile: null,
          onboarding: { player: false, captain: false, hubOwner: false },
          onboardingCompleted: false,
          isAuthenticated: false,
          isLoadingProfile: false,
          isLoading: false,
          isInitialized: true,
          isAuthInitialized: true,
          authStatus: 'SIGNED_OUT',
          errorMessage: null,
        });
        return false;
      }

      // Network or unexpected failure must not expose a partially loaded account.
      set({
        currentUser: null,
        isAuthenticated: false,
        roles: [],
        isLoadingProfile: false,
        isLoading: false,
        isInitialized: true,
        isAuthInitialized: true,
        authStatus: 'ERROR',
        errorMessage: err?.message || 'Unable to load profile. Please check connection.',
      });
      return false;
    }
  },

  initializeAuth: async () => {
    if (get().isLoading && get().authStatus !== 'BOOTING') return;

    try {
      set({ authStatus: 'BOOTING', isLoading: true, isLoadingProfile: true, errorMessage: null });

      // Step 1: Subscribe to Supabase auth state changes once
      if (!authSubscriptionInitialized) {
        authSubscriptionInitialized = true;
        try {
          supabase.auth.onAuthStateChange((event, session) => {
            // Do not await Supabase calls inside its auth lock.
            setTimeout(() => {
              void (async () => {
                if (event === 'SIGNED_OUT' || !session) {
                  socketService.disconnect();
                  await AuthStorage.removeToken();
                  try {
                    await AsyncStorage.removeItem(ACTIVE_MODE_KEY);
                  } catch {
                    // ignore
                  }
                  set({
                    authStatus: 'SIGNED_OUT',
                    currentUser: null,
                    roles: ['PLAYER'],
                    activeMode: 'PLAYER',
                    selectedRole: 'PLAYER',
                    playerProfile: null,
                    captainProfile: null,
                    hubOwnerProfile: null,
                    onboarding: { player: false, captain: false, hubOwner: false },
                    onboardingCompleted: false,
                    isAuthenticated: false,
                    isLoading: false,
                    isLoadingProfile: false,
                    isInitialized: true,
                    isAuthInitialized: true,
                  });
                } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                  await AuthStorage.setToken(session.access_token);
                  if (event === 'SIGNED_IN' && get().authStatus !== 'BOOTING') {
                    await get().loadProfile();
                  }
                }
              })().catch(() => set({ authStatus: 'ERROR', errorMessage: 'Unable to restore your session.' }));
            }, 0);
          });
        } catch {
          // Safe fallback
        }
      }

      // Step 2: Check current Supabase session
      let token: string | null = null;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (data?.session?.access_token) {
            token = data.session.access_token;
          }
        } catch {
          // ignore
        }
      } else {
        token = await AuthStorage.getToken();
      }

      // Step 3: If no valid session exists, mark as SIGNED_OUT
      if (!token) {
        set({
          authStatus: 'SIGNED_OUT',
          currentUser: null,
          roles: ['PLAYER'],
          activeMode: 'PLAYER',
          selectedRole: 'PLAYER',
          playerProfile: null,
          captainProfile: null,
          hubOwnerProfile: null,
          onboarding: { player: false, captain: false, hubOwner: false },
          onboardingCompleted: false,
          isLoading: false,
          isLoadingProfile: false,
          isInitialized: true,
          isAuthInitialized: true,
          isAuthenticated: false,
          errorMessage: null,
        });
        return;
      }

      // Step 4: Session exists -> load profile from backend
      set({ authStatus: 'PROFILE_LOADING' });
      await get().loadProfile();
    } catch (err: any) {
      set({
        authStatus: 'ERROR',
        currentUser: null,
        playerProfile: null,
        captainProfile: null,
        hubOwnerProfile: null,
        onboardingCompleted: false,
        isLoading: false,
        isLoadingProfile: false,
        isInitialized: true,
        isAuthInitialized: true,
        isAuthenticated: false,
        errorMessage: err?.message || 'Authentication initialization encountered an error.',
      });
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true, authStatus: 'SIGNED_OUT' });
      socketService.disconnect();
      await authService.logout();
    } finally {
      try {
        await AsyncStorage.removeItem(ACTIVE_MODE_KEY);
      } catch {
        // ignore
      }
      set({
        authStatus: 'SIGNED_OUT',
        roles: ['PLAYER'],
        activeMode: 'PLAYER',
        selectedRole: 'PLAYER',
        currentUser: null,
        playerProfile: null,
        captainProfile: null,
        hubOwnerProfile: null,
        onboarding: { player: false, captain: false, hubOwner: false },
        onboardingCompleted: false,
        isLoading: false,
        isLoadingProfile: false,
        isInitialized: true,
        isAuthInitialized: true,
        isAuthenticated: false,
        errorMessage: null,
      });
    }
  },

  reset: () => {
    socketService.disconnect();
    AsyncStorage.removeItem(ACTIVE_MODE_KEY).catch(() => {});
    set({
      authStatus: 'SIGNED_OUT',
      roles: ['PLAYER'],
      activeMode: 'PLAYER',
      selectedRole: 'PLAYER',
      currentUser: null,
      playerProfile: null,
      captainProfile: null,
      hubOwnerProfile: null,
      onboarding: { player: false, captain: false, hubOwner: false },
      onboardingCompleted: false,
      isLoading: false,
      isLoadingProfile: false,
      isInitialized: true,
      isAuthInitialized: true,
      isAuthenticated: false,
      errorMessage: null,
    });
  },
});

export const useAuthStore = create(authStoreCreator);

