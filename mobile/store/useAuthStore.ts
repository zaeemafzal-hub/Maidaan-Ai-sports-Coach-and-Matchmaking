import { create } from 'zustand';
import { Role, User, PlayerProfile, CaptainProfile, HubOwnerProfile } from '../types';
import { authService } from '../services/authService';
import { AuthStorage } from '../services/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthState {
  selectedRole: Role | null;
  currentUser: User | null;
  playerProfile: PlayerProfile | null;
  captainProfile: CaptainProfile | null;
  hubOwnerProfile: HubOwnerProfile | null;
  onboardingCompleted: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthInitialized: boolean;
  isAuthenticated: boolean;
  isLoadingProfile: boolean;
  setSelectedRole: (role: Role) => void;
  setCurrentUser: (user: User | null) => void;
  setPlayerProfile: (profile: PlayerProfile) => void;
  setCaptainProfile: (profile: CaptainProfile) => void;
  setHubOwnerProfile: (profile: HubOwnerProfile) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  initializeAuth: () => Promise<void>;
  logout: () => Promise<void>;
  reset: () => void;
}

let authSubscriptionInitialized = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  selectedRole: null,
  currentUser: null,
  playerProfile: null,
  captainProfile: null,
  hubOwnerProfile: null,
  onboardingCompleted: false,
  isLoading: false,
  isInitialized: false,
  isAuthInitialized: false,
  isAuthenticated: false,
  isLoadingProfile: false,

  setSelectedRole: (role) => set({ selectedRole: role }),
  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: Boolean(user) }),
  setPlayerProfile: (profile) => set({ playerProfile: profile }),
  setCaptainProfile: (profile) => set({ captainProfile: profile }),
  setHubOwnerProfile: (profile) => set({ hubOwnerProfile: profile }),
  setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),

  initializeAuth: async () => {
    // Avoid redundant concurrent initializations
    if (get().isLoading) return;

    try {
      set({ isLoading: true, isLoadingProfile: true });

      // Step 1: Subscribe to Supabase auth state changes once
      if (!authSubscriptionInitialized) {
        authSubscriptionInitialized = true;
        try {
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
              await AuthStorage.removeToken();
              set({
                currentUser: null,
                playerProfile: null,
                captainProfile: null,
                hubOwnerProfile: null,
                onboardingCompleted: false,
                isAuthenticated: false,
              });
            }
          });
        } catch {
          // Safe fallback
        }
      }

      // Step 2: Session restoration - retrieve current Supabase session
      let token: string | null = null;
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          token = data.session.access_token;
        }
      } catch {
        // ignore
      }

      // If no Supabase session exists, check test token for mock / offline fallback
      if (!token && !isSupabaseConfigured) {
        token = await AuthStorage.getToken();
      }

      // Step 3: If no valid session or access_token exists:
      // DO NOT call /api/profile/me. Treat user as unauthenticated.
      if (!token) {
        set({
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
        });
        return;
      }

      // Step 4: Valid session exists -> call /api/profile/me
      try {
        const meData = await authService.me();
        set({
          currentUser: meData.user,
          selectedRole: meData.user.role,
          playerProfile: meData.playerProfile || null,
          captainProfile: meData.captainProfile || null,
          hubOwnerProfile: meData.hubOwnerProfile || null,
          onboardingCompleted: (meData.user as any).onboardingCompleted ?? false,
          isLoading: false,
          isLoadingProfile: false,
          isInitialized: true,
          isAuthInitialized: true,
          isAuthenticated: true,
        });
      } catch {
        // Step 6: 401 or invalid token -> clear authenticated state without infinite loop
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        await AuthStorage.removeToken();
        set({
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
        });
      }
    } catch {
      set({
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
      });
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await authService.logout();
    } finally {
      set({
        selectedRole: null,
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
      });
    }
  },

  reset: () =>
    set({
      selectedRole: null,
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
    }),
}));

