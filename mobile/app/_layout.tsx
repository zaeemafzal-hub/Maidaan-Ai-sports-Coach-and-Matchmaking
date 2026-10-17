import "../global.css";
import React, { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import * as Linking from "expo-linking";
import { useAuthStore } from "../store/useAuthStore";
import { authService } from "../services/authService";
import { supabase } from "../lib/supabase";

// Disable experimental native screen transitions in Expo Go to avoid makeMutable crash
enableScreens(false);

export default function RootLayout() {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const updateRefresh = (state: string) => {
      if (state === 'active') void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    };
    updateRefresh(AppState.currentState);
    const subscription = AppState.addEventListener('change', updateRefresh);
    return () => {
      subscription.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (isMounted) {
        await initializeAuth();
      }
    };
    init();

    // OAuth callbacks have their own route; handle password recovery links here.
    const handleUrl = async (event: { url: string }) => {
      if (!event.url || !event.url.includes('reset-password')) return;
      try {
        const result = await authService.handleAuthCallbackUrl(event.url);
        if (result && isMounted) router.push('/(auth)/reset-password');
      } catch {
        if (!isMounted) return;
        useAuthStore.getState().setErrorMessage('The password reset link is invalid or expired.');
        router.push('/(auth)/forgot-password');
      }
    };

    const sub = Linking.addEventListener("url", handleUrl);

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl && isMounted) {
        handleUrl({ url: initialUrl });
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, [initializeAuth]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0C0D0E" },
          animation: "none",
          gestureEnabled: false,
        }}
      />
    </SafeAreaProvider>
  );
}
