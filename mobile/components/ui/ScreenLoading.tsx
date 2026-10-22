import React, { useCallback, useLayoutEffect } from "react";
import {
  useFocusEffect,
  usePathname,
  useNavigationContainerRef,
  useRootNavigationState,
  useRoute,
} from "expo-router";
import { View, Text, ActivityIndicator } from "../theme/Primitives";
import { useThemeColors } from "../theme/AppearanceControls";
import { useScreenLoadingStore } from "../../store/useScreenLoadingStore";
import { useAuthStore } from "../../store/useAuthStore";

// Expo Router generates route names dynamically; only the stable route key is needed here.
function focusedRouteKey(
  navigation: ReturnType<typeof useNavigationContainerRef>,
) {
  const current = navigation.current?.getCurrentRoute() as
    { key: string } | undefined;
  return current?.key;
}

// Focus scoping prevents an off-screen form from blocking the next screen.
export function useScreenBusy(busy: boolean) {
  const route = useRoute().key;
  useFocusEffect(
    useCallback(() => {
      if (!busy) return;
      return useScreenLoadingStore.getState().begin(route);
    }, [busy, route]),
  );
}

export function ScreenLoading() {
  const navigation = useNavigationContainerRef();
  // Subscribe to navigation commits; pathname alone can update after focus fetches start.
  useRootNavigationState();
  const pathname = usePathname();
  const route = focusedRouteKey(navigation) || pathname;
  const colors = useThemeColors();
  const pending = useScreenLoadingStore((state) =>
    Object.values(state.pending).includes(route),
  );
  const authBusy = useAuthStore(
    (state) => state.isLoading || state.isLoadingProfile,
  );
  // Read the committed navigator synchronously when requests begin, including focus events.
  useLayoutEffect(() => {
    useScreenLoadingStore
      .getState()
      .setRouteReader(() => focusedRouteKey(navigation));
    return () => useScreenLoadingStore.getState().setRouteReader(null);
  }, [navigation]);
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
