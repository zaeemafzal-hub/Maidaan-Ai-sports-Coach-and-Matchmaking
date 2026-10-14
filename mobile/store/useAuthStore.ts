import { create } from 'zustand';
import { Role, User, PlayerProfile, CaptainProfile, HubOwnerProfile } from '../types';
import { authService } from '../services/authService';
import { AuthStorage } from '../services/storage';
import { supabase } from '../lib/supabase';

interface AuthState {
  selectedRole: Role | null;
  currentUser: User | null;
  playerProfile: PlayerProfile | null;
  captainProfile: CaptainProfile | null;
  hubOwnerProfile: HubOwnerProfile | null;
  onboardingCompleted: boolean;
  isLoading: boolean;
  isInitialized: boolean;
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

export const useAuthStore = create<AuthState>((set) => ({
  selectedRole: null,
  currentUser: null,
  playerProfile: null,
  captainProfile: null,
  hubOwnerProfile: null,
  onboardingCompleted: false,
  isLoading: false,
  isInitialized: false,

  setSelectedRole: (role) => set({ selectedRole: role }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setPlayerProfile: (profile) => set({ playerProfile: profile }),
  setCaptainProfile: (profile) => set({ captainProfile: profile }),
  setHubOwnerProfile: (profile) => set({ hubOwnerProfile: profile }),
  setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),

  initializeAuth: async () => {
    try {
      set({ isLoading: true });

      // Listen for Supabase session changes
      try {
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            await AuthStorage.removeToken();
          } else if (session?.access_token) {
            await AuthStorage.setToken(session.access_token);
          }
        });
      } catch {
        // Safe fallback in test or demo environments
      }

      // Check current token
      let token = await AuthStorage.getToken();
      if (!token) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.access_token) {
            token = data.session.access_token;
            await AuthStorage.setToken(token);
          }
        } catch {
          // ignore
        }
      }

      if (!token) {
        set({
          currentUser: null,
          playerProfile: null,
          captainProfile: null,
          hubOwnerProfile: null,
          onboardingCompleted: false,
          isLoading: false,
          isInitialized: true,
        });
        return;
      }

      const meData = await authService.me();
      set({
        currentUser: meData.user,
        selectedRole: meData.user.role,
        playerProfile: meData.playerProfile || null,
        captainProfile: meData.captainProfile || null,
        hubOwnerProfile: meData.hubOwnerProfile || null,
        onboardingCompleted: (meData.user as any).onboardingCompleted ?? false,
        isLoading: false,
        isInitialized: true,
      });
    } catch {
      // Invalid or expired token: clear stored session safely
      await AuthStorage.removeToken();
      set({
        currentUser: null,
        playerProfile: null,
        captainProfile: null,
        hubOwnerProfile: null,
        onboardingCompleted: false,
        isLoading: false,
        isInitialized: true,
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
        isInitialized: true,
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
      isInitialized: true,
    }),
}));

