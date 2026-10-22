import React, { useEffect, useRef } from "react";
import { ThemedScreen } from "../components/ui/ThemedScreen";
import { View, Text, Pressable, ActivityIndicator } from "../components/theme/Primitives";
import { router } from "expo-router";
import { useAuthStore } from "../store/useAuthStore";

export default function Index() {
  const {
    isInitialized,
    currentUser,
    authStatus,
    activeMode,
    initializeAuth,
    errorMessage,
  } = useAuthStore();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (
      !isInitialized ||
      authStatus === "BOOTING" ||
      authStatus === "PROFILE_LOADING"
    ) {
      return;
    }

    if (hasNavigated.current) return;

    if (authStatus === "SIGNED_OUT") {
      hasNavigated.current = true;
      router.replace("/(auth)/welcome");
      return;
    }

    if (authStatus === "ONBOARDING_REQUIRED") {
      hasNavigated.current = true;
      switch (activeMode) {
        case "PLAYER":
          router.replace("/onboarding/player-setup");
          break;
        case "TEAM_CAPTAIN":
          router.replace("/onboarding/captain-setup");
          break;
        case "HUB_OWNER":
          router.replace("/onboarding/hub-setup");
          break;
        default:
          router.replace("/onboarding/player-setup");
          break;
      }
      return;
    }

    if (authStatus === "READY" && currentUser) {
      hasNavigated.current = true;
      if (activeMode === "ADMIN") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/(tabs)/discover");
      }
      return;
    }
  }, [isInitialized, authStatus, currentUser, activeMode]);

  return (
    <ThemedScreen
      style={{
        flex: 1,
        backgroundColor: "transparent",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {authStatus === "ERROR" ? (
        <View className="px-6 items-center">
          <Text
            accessibilityRole="alert"
            className="text-white text-center mb-4"
          >
            {errorMessage ||
              "Unable to restore your session. Please try again."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void initializeAuth()}
            className="bg-[#E85D26] rounded-xl p-4"
          >
            <Text className="text-white font-bold">Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <ActivityIndicator size="large" color="#E85D26" />
      )}
    </ThemedScreen>
  );
}
