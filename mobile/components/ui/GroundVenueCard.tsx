import React from 'react';
import { View, Text, Pressable, Image, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ArenaBadge } from './ArenaBadge';

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
  distance = '1.2 km',
  courtsCount,
  imageSource,
  sports,
  facilities = ['Floodlights', 'Parking'],
  isVerified = true,
  onPress,
  className = '',
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Hub: ${name} at ${location}`}
      className={`w-full rounded-xl overflow-hidden bg-warm-white border border-stone shadow-sm active:bg-stone-light ${className}`}
    >
      {/* Venue Photography Container */}
      <View className="h-40 w-full relative bg-graphite">
        <Image
          source={imageSource}
          className="w-full h-full object-cover"
          resizeMode="cover"
        />
        {/* Subtle Vignette Gradient Mask */}
        <View className="absolute inset-0 bg-graphite/35" />

        {/* Top Badges */}
        <View className="absolute top-3 left-3 right-3 flex-row items-center justify-between">
          <View className="flex-row items-center space-x-1.5">
            {sports.slice(0, 3).map((s) => (
              <View
                key={s}
                className="bg-graphite/85 px-2.5 py-1 rounded-sm border border-stone/30 mr-1.5"
              >
                <Text className="text-warm-white text-[10px] font-bold uppercase tracking-wider">
                  {s}
                </Text>
              </View>
            ))}
          </View>

          {isVerified && (
            <View className="bg-olive px-2 py-0.5 rounded-sm flex-row items-center">
              <Ionicons name="checkmark-circle" size={12} color="#F4F1EA" />
              <Text className="text-warm-white text-[10px] font-bold uppercase tracking-wider ml-1">
                VERIFIED HUB
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Distance & Courts Count Pill */}
        <View className="absolute bottom-3 left-3 right-3 flex-row items-center justify-between">
          <View className="bg-graphite/90 px-2.5 py-1 rounded-sm flex-row items-center border border-stone/20">
            <Ionicons name="location-sharp" size={12} color="#D6D1C6" />
            <Text className="text-stone text-xs font-medium ml-1">{distance}</Text>
          </View>

          {courtsCount !== undefined && (
            <View className="bg-graphite/90 px-3 py-1 rounded-sm border border-stone/20">
              <Text className="text-warm-white text-xs font-black uppercase">
                {courtsCount} {courtsCount === 1 ? 'Court' : 'Courts'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Card Body */}
      <View className="p-4">
        <Text
          numberOfLines={1}
          className="text-graphite text-lg font-black uppercase tracking-tight"
        >
          {name}
        </Text>

        <View className="flex-row items-center mt-1">
          <Ionicons name="location-outline" size={13} color="#666B60" />
          <Text
            numberOfLines={1}
            className="text-stone-muted text-xs font-medium ml-1 flex-1"
          >
            {location}
          </Text>
        </View>

        {/* Facilities Tags */}
        {facilities && facilities.length > 0 && (
          <View className="flex-row items-center flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone">
            {facilities.map((fac) => (
              <View
                key={fac}
                className="px-2 py-0.5 rounded-sm bg-stone/25 border border-stone"
              >
                <Text className="text-graphite text-[10px] font-semibold tracking-wider uppercase">
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
