import React, { useCallback, useLayoutEffect } from "react";
import { useFocusEffect, usePathname } from "expo-router";
import { View, Text, ActivityIndicator } from "../theme/Primitives";
import { useThemeColors } from "../theme/AppearanceControls";
import { useScreenLoadingStore } from "../../store/useScreenLoadingStore";
import { useAuthStore } from "../../store/useAuthStore";

// Focus scoping prevents an off-screen form from blocking the next screen.
export function useScreenBusy(busy: boolean) {
  const route = usePathname();
  useFocusEffect(
    useCallback(() => {
      if (!busy) return;
      return useScreenLoadingStore.getState().begin(route);
    }, [busy, route]),
  );
}

export function ScreenLoading() {
  const route = usePathname();
  const colors = useThemeColors();
  const pending = useScreenLoadingStore((state) =>
    Object.values(state.pending).includes(route),
  );
  const authBusy = useAuthStore(
    (state) => state.isLoading || state.isLoadingProfile,
  );
  // Layout effects run before screens begin their data-fetching passive effects.
  useLayoutEffect(() => {
    useScreenLoadingStore.getState().setRoute(route);
  }, [route]);
  if (!pending && !authBusy) return null;
  return (
    <View
      testID="screen-loading"
      accessibilityRole="progressbar"
      accessibilityLabel="Loading screen data"
      accessibilityLiveRegion="polite"
      accessibilityViewIsModal
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9999,
        elevation: 20,
        backgroundColor: colors.canvas,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <ActivityIndicator size="large" color="#E85D26" />
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
        Getting things ready…
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 13 }}>
        This can take a moment on a slow connection.
      </Text>
    </View>
  );
}
