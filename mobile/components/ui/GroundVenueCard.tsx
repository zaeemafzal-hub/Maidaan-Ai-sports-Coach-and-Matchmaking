import React from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ImageSourcePropType,
} from "../theme/Primitives";
import { Ionicons } from "../theme/Icons";

interface GroundVenueCardProps {
  name: string;
  location: string;
  distance?: string;
  courtsCount?: number;
  imageSource: ImageSourcePropType;
  sports: string[];
  facilities?: string[];
  isVerified?: boolean;
  onPress?: () => void;
  className?: string;
}

export const GroundVenueCard: React.FC<GroundVenueCardProps> = ({
  name,
  location,
  distance = "1.2 km",
  courtsCount,
  imageSource,
  sports,
  facilities = ["Floodlights", "Parking"],
  isVerified = true,
  onPress,
  className = "",
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Hub: ${name} at ${location}`}
      className={`w-full rounded-2xl overflow-hidden bg-[#141518]/25 border border-[rgba(255,255,255,0.08)] shadow-sm active:scale-[0.99] active:bg-[#1B1D22] transition-all ${className}`}
    >
      {/* Venue Photography Container */}
      <View className="h-44 w-full relative bg-[#0C0D0E]">
        <Image
          source={imageSource}
          className="w-full h-full object-cover"
          resizeMode="cover"
        />
        {/* Soft Dark Gradient Mask */}
        <View className="absolute inset-0 bg-[#0C0D0E]/40" />

        {/* Top Badges */}
        <View className="absolute top-3 left-3 right-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-wrap gap-1.5">
            {sports.slice(0, 3).map((s) => (
              <View
                key={s}
                className="bg-[#0C0D0E]/90 px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.12)]"
              >
                <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
                  {s}
                </Text>
              </View>
            ))}
          </View>

          {isVerified && (
            <View className="bg-[#3B82F6] px-2.5 py-1 rounded-full flex-row items-center shadow-xs">
              <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
              <Text className="text-white text-[10px] font-extrabold uppercase tracking-wider ml-1">
                VERIFIED HUB
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Distance & Courts Count Pill */}
        <View className="absolute bottom-3 left-3 right-3 flex-row items-center justify-between">
          <View className="bg-[#0C0D0E]/90 px-3 py-1 rounded-full flex-row items-center border border-[rgba(255,255,255,0.12)]">
            <Ionicons name="location-sharp" size={12} color="#E85D26" />
            <Text className="text-[#AEB6BE] text-xs font-medium ml-1">
              {distance}
            </Text>
          </View>

          {courtsCount !== undefined && (
            <View className="bg-[#0C0D0E]/90 px-3 py-1 rounded-full border border-[rgba(255,255,255,0.12)]">
              <Text className="text-white text-xs font-bold uppercase">
                {courtsCount} {courtsCount === 1 ? "Court" : "Courts"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Card Body */}
      <View className="p-4">
        <Text
          numberOfLines={1}
          className="text-white text-lg font-bold uppercase tracking-tight"
        >
          {name}
        </Text>

        <View className="flex-row items-center mt-1">
          <Ionicons name="location-outline" size={14} color="#5C616A" />
          <Text
            numberOfLines={1}
            className="text-[#AEB6BE] text-xs font-normal ml-1.5 flex-1"
          >
            {location}
          </Text>
        </View>

        {/* Facilities Tags */}
        {facilities && facilities.length > 0 && (
          <View className="flex-row items-center flex-wrap gap-1.5 mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
            {facilities.map((fac) => (
              <View
                key={fac}
                className="px-2.5 py-0.5 rounded-full bg-[#1B1D22] border border-[rgba(255,255,255,0.08)]"
              >
                <Text className="text-[#AEB6BE] text-[10px] font-medium tracking-wider uppercase">
                  {fac}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
};
