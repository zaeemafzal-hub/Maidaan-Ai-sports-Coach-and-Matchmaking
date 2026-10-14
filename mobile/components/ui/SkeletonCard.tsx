import React from 'react';
import { View } from 'react-native';

interface SkeletonCardProps {
  height?: number;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  height = 120,
  className = '',
}) => {
  return (
    <View
      style={{ height }}
      className={`w-full rounded-xl p-4 bg-warm-white border border-stone/60 overflow-hidden justify-between animate-pulse ${className}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="w-20 h-4 bg-stone/40 rounded-sm" />
        <View className="w-16 h-4 bg-stone/40 rounded-sm" />
      </View>

      <View className="space-y-2">
        <View className="w-3/4 h-5 bg-stone/50 rounded-sm" />
        <View className="w-1/2 h-3.5 bg-stone/30 rounded-sm mt-1" />
      </View>

      <View className="pt-2 border-t border-stone/30 flex-row justify-between items-center">
        <View className="w-24 h-3 bg-stone/40 rounded-sm" />
        <View className="w-16 h-3 bg-stone/40 rounded-sm" />
      </View>
    </View>
  );
};
