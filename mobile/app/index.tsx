import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';

export default function Index() {
  const { isInitialized, currentUser, onboardingCompleted } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    const timer = setTimeout(() => {
      if (!currentUser) {
        router.replace('/(auth)/welcome');
        return;
      }

      if (onboardingCompleted) {
        if (currentUser.role === 'ADMIN') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/(tabs)/discover');
        }
      } else {
        switch (currentUser.role) {
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
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isInitialized, currentUser, onboardingCompleted]);

  return (
    <View style={{ flex: 1, backgroundColor: '#242522', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#3D4438" />
    </View>
  );
}
