import { useAuthStore } from '../store/useAuthStore';

// Read the updated store after loading; React event handlers may hold older state.
export async function completeSignIn() {
  const loaded = await useAuthStore.getState().loadProfile();
  const state = useAuthStore.getState();
  if (!loaded || !state.currentUser || state.authStatus === 'ERROR') {
    throw new Error(state.errorMessage || 'Unable to load your account. Please try again.');
  }
  if (state.authStatus === 'ONBOARDING_REQUIRED') {
    if (state.activeMode === 'TEAM_CAPTAIN') return '/onboarding/captain-setup' as const;
    if (state.activeMode === 'HUB_OWNER') return '/onboarding/hub-setup' as const;
    return '/onboarding/player-setup' as const;
  }
  return state.activeMode === 'ADMIN' ? '/admin/dashboard' as const : '/(tabs)/discover' as const;
}
