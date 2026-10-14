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
  title = 'NO MATCHES ON THE BOARD',
  description = 'Try another area or organize the first game of the evening.',
  actionTitle,
  onAction,
  iconName = 'football-outline',
  className = '',
}) => {
  return (
    <View
      className={`w-full p-8 rounded-xl bg-warm-white border border-stone items-center justify-center text-center ${className}`}
    >
      {/* Tactical Icon Container */}
      <View className="w-16 h-16 rounded-xl bg-stone/20 border border-stone items-center justify-center mb-4">
        <Ionicons name={iconName} size={32} color="#3D4438" />
      </View>

      <Text className="text-graphite text-lg font-black uppercase tracking-tight text-center">
        {title}
      </Text>

      <Text className="text-stone-muted text-xs font-medium text-center mt-1.5 max-w-xs leading-relaxed">
        {description}
      </Text>

      {actionTitle && onAction && (
        <View className="mt-5 w-full max-w-xs">
          <PrimaryButton title={actionTitle} onPress={onAction} />
        </View>
      )}
    </View>
  );
};
