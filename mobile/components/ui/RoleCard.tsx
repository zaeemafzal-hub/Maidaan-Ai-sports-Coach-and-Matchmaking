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
      className={`w-full p-5 rounded-2xl border transition-all active:scale-[0.99] ${
        selected
          ? 'bg-[#1B1D22] border-2 border-[#E85D26] shadow-md shadow-[#E85D26]/20'
          : 'bg-[#141518] border-[rgba(255,255,255,0.08)]'
      }`}
    >
      <View className="flex-row items-start justify-between">
        {/* Left Side: Icon & Details */}
        <View className="flex-row items-start flex-1 mr-3">
          {/* Icon Container */}
          <View
            className={`w-12 h-12 rounded-xl items-center justify-center mr-3.5 ${
              selected
                ? 'bg-[#E85D26]'
                : 'bg-[#1B1D22] border border-[rgba(255,255,255,0.08)]'
            }`}
          >
            <Ionicons
              name={iconName}
              size={22}
              color={selected ? '#FFFFFF' : '#AEB6BE'}
            />
          </View>

          {/* Text Content */}
          <View className="flex-1 pt-0.5">
            <View className="flex-row items-center flex-wrap gap-2">
              <Text className="text-base font-bold tracking-tight text-white uppercase">
                {title}
              </Text>
              {badgeText && (
                <View className="px-2 py-0.5 rounded-full bg-[#E85D26]/15 border border-[#E85D26]/30">
                  <Text className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider">
                    {badgeText}
                  </Text>
                </View>
              )}
            </View>

            <Text className="text-[#AEB6BE] text-xs leading-relaxed mt-1.5 font-normal">
              {description}
            </Text>
          </View>
        </View>

        {/* Right Side: Selection Radio Indicator */}
        <View className="pt-1">
          {selected ? (
            <View className="w-6 h-6 rounded-full bg-[#E85D26] items-center justify-center shadow-xs">
              <Ionicons name="checkmark" size={15} color="#FFFFFF" />
            </View>
          ) : (
            <View className="w-6 h-6 rounded-full border border-[rgba(255,255,255,0.18)] bg-[#1B1D22]" />
          )}
        </View>
      </View>
    </Pressable>
  );
};
