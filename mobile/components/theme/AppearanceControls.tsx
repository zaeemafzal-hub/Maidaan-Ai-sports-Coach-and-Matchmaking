import React, { useEffect } from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import { View, Text, Pressable } from "./Primitives";
import { Ionicons } from "@expo/vector-icons";
import {
  useAppearanceStore,
  AppearancePreference,
} from "../../store/useAppearanceStore";
import { APP_PALETTES } from "../../utils/appearancePalette";
export function useThemeColors() {
  return APP_PALETTES[useAppearanceStore((state) => state.resolved)];
}
export function AppearanceSync() {
  const system = useColorScheme(),
    preference = useAppearanceStore((state) => state.preference);
  useEffect(() => {
    void useAppearanceStore.getState().hydrate();
  }, []);
  useEffect(() => {
    useAppearanceStore
      .getState()
      .setSystem(system === "light" ? "light" : "dark");
  }, [system]);
  useEffect(() => {
    if (Platform.OS !== "web")
      Appearance.setColorScheme(
        preference === "system" ? "unspecified" : preference,
      );
    else if (typeof document !== "undefined")
      document.documentElement.style.colorScheme =
        preference === "system" ? "light dark" : preference;
  }, [preference]);
  return null;
}
export function AppearanceButton() {
  const scheme = useAppearanceStore((state) => state.resolved);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        scheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      onPress={() =>
        useAppearanceStore
          .getState()
          .choose(scheme === "dark" ? "light" : "dark")
      }
      className="w-11 h-11 items-center justify-center"
    >
      <Ionicons
        name={scheme === "dark" ? "sunny-outline" : "moon-outline"}
        size={20}
        color="#E85D26"
      />
    </Pressable>
  );
}
export function AppearanceSettings() {
  const preference = useAppearanceStore((state) => state.preference);
  return (
    <View className="p-4 mx-5 my-3 bg-[#141518]/25 rounded-2xl border border-white/[0.08]">
      <Text className="text-white font-bold mb-3">Appearance</Text>
      <View className="flex-row gap-2">
        {(["light", "dark", "system"] as AppearancePreference[]).map(
          (value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`Appearance: ${value}`}
              accessibilityState={{ checked: value === preference }}
              onPress={() => useAppearanceStore.getState().choose(value)}
              className={`min-h-[44px] flex-1 items-center justify-center rounded-xl border ${preference === value ? "border-[#E85D26] bg-[#E85D26]/15" : "border-white/[0.08]"}`}
            >
              <Text
                className={
                  preference === value
                    ? "text-[#E85D26] font-semibold"
                    : "text-[#A0A5AD]"
                }
              >
                {value === "system"
                  ? "Device"
                  : value[0].toUpperCase() + value.slice(1)}
              </Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}
