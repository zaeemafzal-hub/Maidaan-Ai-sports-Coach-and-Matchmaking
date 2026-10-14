import React from 'react';
import { View, Text, Pressable, Image, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AthleteCardProps {
  name: string;
  jerseyNumber?: string;
  position: string;
  teamName?: string;
  matchesPlayed: number;
  rating?: number;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
  className?: string;
}

export const AthleteCard: React.FC<AthleteCardProps> = ({
  name,
  jerseyNumber = '07',
  position,
  teamName,
  matchesPlayed,
  rating = 4.9,
  imageSource,
  onPress,
  className = '',
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Player: ${name}, Jersey #${jerseyNumber}, ${position}`}
      className={`w-full p-4 rounded-xl bg-warm-white border border-stone flex-row items-center justify-between active:bg-stone-light shadow-sm ${className}`}
    >
      <View className="flex-row items-center flex-1 mr-3">
        {/* Avatar or Jersey Thumbnail */}
        <View className="w-14 h-14 rounded-xl overflow-hidden bg-graphite border border-stone items-center justify-center relative mr-3.5">
          {imageSource ? (
            <Image source={imageSource} className="w-full h-full object-cover" />
          ) : (
            <Ionicons name="person" size={24} color="#D6D1C6" />
          )}
          {/* Subtle Jersey Number Tag */}
          <View className="absolute bottom-0 right-0 bg-graphite/90 px-1 rounded-tl-sm border-t border-l border-stone/30">
            <Text className="text-warm-white text-[9px] font-black tracking-tight">
              #{jerseyNumber}
            </Text>
          </View>
        </View>

        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="text-graphite text-base font-black uppercase tracking-tight"
          >
            {name}
          </Text>

          <Text
            numberOfLines={1}
            className="text-stone-muted text-xs font-semibold mt-0.5"
          >
            {position} {teamName ? `• ${teamName}` : ''}
          </Text>

          <View className="flex-row items-center mt-1.5">
            <Text className="text-graphite text-xs font-bold">
              {matchesPlayed}{' '}
              <Text className="text-stone-muted font-normal">matches</Text>
            </Text>
            <Text className="text-stone-muted text-xs mx-1.5">•</Text>
            <View className="flex-row items-center">
              <Ionicons name="star" size={11} color="#666B60" />
              <Text className="text-graphite text-xs font-bold ml-1">
                {rating}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#242522" />
    </Pressable>
  );
};
