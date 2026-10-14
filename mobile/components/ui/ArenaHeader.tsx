import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface ArenaHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  fallbackRoute?: string;
  rightAction?: React.ReactNode;
  theme?: 'dark' | 'light';
  locationBadge?: string;
}

export const ArenaHeader: React.FC<ArenaHeaderProps> = ({
  title = 'MAIDAAN',
  subtitle,
  showBack = false,
  onBack,
  fallbackRoute,
  rightAction,
  theme = 'light',
  locationBadge,
}) => {
  const isDark = theme === 'dark';

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else if (fallbackRoute) {
      router.replace(fallbackRoute as any);
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <View
      className={`w-full px-5 py-3.5 flex-row items-center justify-between border-b ${
        isDark
          ? 'bg-graphite border-surface-border-dark'
          : 'bg-warm-white border-stone'
      }`}
    >
      {/* Left Back or Branding */}
      <View className="flex-row items-center flex-1">
        {showBack ? (
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className={`w-10 h-10 rounded-lg items-center justify-center mr-3 border ${
              isDark
                ? 'bg-surface-card-dark border-surface-border-dark'
                : 'bg-warm-white border-stone'
            } active:opacity-70`}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDark ? '#F4F1EA' : '#242522'}
            />
          </Pressable>
        ) : null}

        <View className="flex-1">
          <Text
            numberOfLines={1}
            className={`text-xl font-black tracking-tight uppercase ${
              isDark ? 'text-warm-white' : 'text-graphite'
            }`}
          >
            {title}
          </Text>
          {locationBadge ? (
            <View className="flex-row items-center mt-0.5">
              <Ionicons
                name="location-sharp"
                size={11}
                color={isDark ? '#D6D1C6' : '#666B60'}
              />
              <Text
                numberOfLines={1}
                className={`text-[11px] font-semibold ml-1 tracking-tight ${
                  isDark ? 'text-stone' : 'text-stone-muted'
                }`}
              >
                {locationBadge}
              </Text>
            </View>
          ) : subtitle ? (
            <Text
              numberOfLines={1}
              className={`text-[11px] font-medium tracking-tight ${
                isDark ? 'text-stone-muted' : 'text-stone-muted'
              }`}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Right Action */}
      {rightAction && (
        <View className="flex-row items-center ml-2">{rightAction}</View>
      )}
    </View>
  );
};
