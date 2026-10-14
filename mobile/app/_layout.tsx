import "../global.css";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import { useAuthStore } from "../store/useAuthStore";

// Disable experimental native screen transitions in Expo Go to avoid makeMutable crash
enableScreens(false);

export default function RootLayout() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#050706" },
          animation: "none",
          gestureEnabled: false,
        }}
      />
    </SafeAreaProvider>
  );
}
