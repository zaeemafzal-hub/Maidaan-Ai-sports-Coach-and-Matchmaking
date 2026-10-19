import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface ArenaHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  fallbackRoute?: string;
  rightAction?: React.ReactNode;
  theme?: "dark" | "light";
  locationBadge?: string;
  compact?: boolean;
  transparent?: boolean;
}

export const ArenaHeader: React.FC<ArenaHeaderProps> = ({
  title = "MAIDAAN",
  subtitle,
  showBack = false,
  onBack,
  fallbackRoute,
  rightAction,
  locationBadge,
  compact = false,
  transparent = false,
}) => {
  const handleBack = () => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else if (fallbackRoute) {
      router.replace(fallbackRoute as any);
    } else {
      router.replace("/(auth)/welcome");
    }
  };

  return (
    <View
      className={`w-full px-5 ${compact ? "py-2.5" : "py-3.5"} flex-row items-center justify-between ${
        transparent ? "bg-transparent" : "bg-[#0C0D0E]/75"
      } border-b border-[rgba(255,255,255,0.08)] z-10`}
    >
      {/* Left Back or Branding */}
      <View className="flex-row items-center flex-1 mr-3">
        {showBack ? (
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-[#1B1D22] border border-[rgba(255,255,255,0.08)] active:bg-[#22252B] active:scale-95"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
        ) : null}

        <View className="flex-1">
          <Text
            numberOfLines={1}
            style={{ color: "#FFFFFF" }}
            className="text-base font-bold tracking-tight uppercase text-white"
          >
            {title}
          </Text>
          {locationBadge ? (
            <View className="flex-row items-center mt-0.5">
              <Ionicons name="location-sharp" size={11} color="#E85D26" />
              <Text
                numberOfLines={1}
                style={{ color: "#A0A5AD" }}
                className="text-xs font-medium ml-1 text-[#A0A5AD]"
              >
                {locationBadge}
              </Text>
            </View>
          ) : subtitle ? (
            <Text
              numberOfLines={1}
              style={{ color: "#A0A5AD" }}
              className="text-xs font-medium text-[#A0A5AD] mt-0.5"
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Right Custom Action */}
      {rightAction && (
        <View className="flex-row items-center justify-end">{rightAction}</View>
      )}
    </View>
  );
};

export const AppHeader = ArenaHeader;
