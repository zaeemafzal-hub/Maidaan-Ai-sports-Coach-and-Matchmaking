import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from './PrimaryButton';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No matches found',
  description = 'Try adjusting your sport or area filters, or organize the first game.',
  actionTitle,
  onAction,
  iconName = 'football-outline',
  className = '',
}) => {
  return (
    <View
      className={`w-full p-8 rounded-2xl bg-[#141518] border border-[rgba(255,255,255,0.08)] items-center justify-center text-center ${className}`}
    >
      {/* Icon Container */}
      <View className="w-16 h-16 rounded-2xl bg-[#1B1D22] border border-[rgba(255,255,255,0.08)] items-center justify-center mb-4">
        <Ionicons name={iconName} size={30} color="#E85D26" />
      </View>

      <Text className="text-white text-lg font-bold uppercase tracking-tight text-center">
        {title}
      </Text>

      <Text className="text-[#AEB6BE] text-xs font-normal text-center mt-2 max-w-xs leading-relaxed">
        {description}
      </Text>

      {actionTitle && onAction && (
        <View className="mt-6 w-full max-w-xs">
          <PrimaryButton title={actionTitle} onPress={onAction} />
        </View>
      )}
    </View>
  );
};
