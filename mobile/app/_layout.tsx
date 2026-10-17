import "../global.css";
import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import * as Linking from "expo-linking";
import { useAuthStore } from "../store/useAuthStore";
import { authService } from "../services/authService";

// Disable experimental native screen transitions in Expo Go to avoid makeMutable crash
enableScreens(false);

export default function RootLayout() {
  const { initializeAuth, loadProfile } = useAuthStore();

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (isMounted) {
        await initializeAuth();
      }
    };
    init();

    // Deep link callback handler for Google OAuth & Password Recovery
    const handleUrl = async (event: { url: string }) => {
      if (!event.url) return;
      const callbackResult = await authService.handleAuthCallbackUrl(event.url);
      if (callbackResult) {
        if (callbackResult.type === "recovery" || event.url.includes("reset-password")) {
          router.push("/(auth)/reset-password");
        } else {
          await loadProfile();
        }
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
  }, [initializeAuth, loadProfile]);

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
