import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RoleCardProps {
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onSelect: () => void;
  badgeText?: string;
  testID?: string;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  title,
  description,
  iconName,
  selected,
  onSelect,
  badgeText,
  testID,
}) => {
  return (
    <Pressable
      testID={testID}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}: ${description}`}
      className={`w-full p-5 rounded-xl border transition-all active:opacity-90 ${
        selected
          ? 'bg-stone-light border-2 border-olive shadow-sm'
          : 'bg-warm-white border-stone'
      }`}
    >
      <View className="flex-row items-start justify-between">
        {/* Left Side: Icon & Details */}
        <View className="flex-row items-start flex-1 mr-3">
          {/* Icon Container */}
          <View
            className={`w-12 h-12 rounded-lg items-center justify-center mr-3.5 ${
              selected
                ? 'bg-olive text-warm-white'
                : 'bg-warm-white border border-stone'
            }`}
          >
            <Ionicons
              name={iconName}
              size={22}
              color={selected ? '#F4F1EA' : '#242522'}
            />
          </View>

          {/* Text Content */}
          <View className="flex-1 pt-0.5">
            <View className="flex-row items-center flex-wrap gap-2">
              <Text className="text-lg font-bold tracking-tight text-graphite uppercase">
                {title}
              </Text>
              {badgeText && (
                <View className="px-2 py-0.5 rounded-sm bg-rust/15 border border-rust">
                  <Text className="text-rust text-[10px] font-bold uppercase tracking-wider">
                    {badgeText}
                  </Text>
                </View>
              )}
            </View>

            <Text className="text-stone-muted text-xs leading-relaxed mt-1.5 font-medium">
              {description}
            </Text>
          </View>
        </View>

        {/* Right Side: Selection Radio Indicator */}
        <View className="pt-1">
          {selected ? (
            <View className="w-6 h-6 rounded-full bg-olive items-center justify-center">
              <Ionicons name="checkmark" size={15} color="#F4F1EA" />
            </View>
          ) : (
            <View className="w-6 h-6 rounded-full border border-stone bg-warm-white" />
          )}
        </View>
      </View>
    </Pressable>
  );
};
