import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';

export default function Index() {
  const { isInitialized, currentUser, authStatus, activeMode } = useAuthStore();
  const hasNavigated = useRef(false);

  const isInitializedRef = useRef(isInitialized);
  const authStatusRef = useRef(authStatus);
  isInitializedRef.current = isInitialized;
  authStatusRef.current = authStatus;

  useEffect(() => {
    // Failsafe: If initialization hangs or takes longer than 3.5 seconds,
    // gracefully route to the welcome screen instead of leaving user stuck.
    const safetyTimer = setTimeout(() => {
      if (!hasNavigated.current) {
        if (!isInitializedRef.current || authStatusRef.current === 'BOOTING' || authStatusRef.current === 'PROFILE_LOADING') {
          console.warn('[Index] Boot timeout: forcing transition to welcome screen');
          hasNavigated.current = true;
          router.replace('/(auth)/welcome');
        }
      }
    }, 3500);

    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    if (!isInitialized || authStatus === 'BOOTING' || authStatus === 'PROFILE_LOADING') {
      return;
    }

    if (hasNavigated.current) return;

    if (authStatus === 'SIGNED_OUT') {
      hasNavigated.current = true;
      router.replace('/(auth)/welcome');
      return;
    }

    if (authStatus === 'ONBOARDING_REQUIRED') {
      hasNavigated.current = true;
      switch (activeMode) {
        case 'PLAYER':
          router.replace('/onboarding/player-setup');
          break;
        case 'TEAM_CAPTAIN':
          router.replace('/onboarding/captain-setup');
          break;
        case 'HUB_OWNER':
          router.replace('/onboarding/hub-setup');
          break;
        default:
          router.replace('/onboarding/player-setup');
          break;
      }
      return;
    }

    if (authStatus === 'READY' && currentUser) {
      hasNavigated.current = true;
      if (activeMode === 'ADMIN') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/(tabs)/discover');
      }
      return;
    }

    if (authStatus === 'ERROR') {
      hasNavigated.current = true;
      router.replace('/(auth)/welcome');
    }
  }, [isInitialized, authStatus, currentUser, activeMode]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0C0D0E', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#E85D26" />
    </View>
  );
}
