import React from "react";
import { View } from "../theme/Primitives";

interface SkeletonCardProps {
  height?: number;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  height = 130,
  className = "",
}) => {
  return (
    <View
      style={{ height }}
      className={`w-full rounded-2xl p-4 bg-[#141518]/25 border border-[rgba(255,255,255,0.06)] overflow-hidden justify-between animate-pulse ${className}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="w-24 h-5 bg-[#1B1D22] rounded-lg" />
        <View className="w-16 h-5 bg-[#1B1D22] rounded-full" />
      </View>

      <View className="space-y-2 mt-2">
        <View className="w-3/4 h-5 bg-[#1B1D22] rounded-md" />
        <View className="w-1/2 h-3.5 bg-[#1B1D22] rounded-md mt-1.5" />
      </View>

      <View className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex-row justify-between items-center">
        <View className="w-28 h-3.5 bg-[#1B1D22] rounded-md" />
        <View className="w-16 h-3.5 bg-[#1B1D22] rounded-md" />
      </View>
    </View>
  );
};
