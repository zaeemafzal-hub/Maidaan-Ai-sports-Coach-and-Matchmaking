import React from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ImageSourcePropType,
} from "../theme/Primitives";
import { Ionicons } from "../theme/Icons";

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
  jerseyNumber = "07",
  position,
  teamName,
  matchesPlayed,
  rating = 4.9,
  imageSource,
  onPress,
  className = "",
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Player: ${name}, Jersey #${jerseyNumber}, ${position}`}
      className={`w-full p-4 rounded-2xl bg-[#141518]/25 border border-[rgba(255,255,255,0.08)] flex-row items-center justify-between active:bg-[#1B1D22] active:scale-[0.99] transition-all shadow-sm ${className}`}
    >
      <View className="flex-row items-center flex-1 mr-3">
        {/* Avatar or Jersey Thumbnail */}
        <View className="w-14 h-14 rounded-2xl overflow-hidden bg-[#1B1D22] border border-[rgba(255,255,255,0.08)] items-center justify-center relative mr-3.5">
          {imageSource ? (
            <Image
              source={imageSource}
              className="w-full h-full object-cover"
            />
          ) : (
            <Ionicons name="person" size={24} color="#AEB6BE" />
          )}
          {/* Jersey Number Tag */}
          <View className="absolute bottom-0 right-0 bg-[#0C0D0E]/90 px-1.5 py-0.5 rounded-tl-lg border-t border-l border-[rgba(255,255,255,0.12)]">
            <Text className="text-[#E85D26] text-[9px] font-bold tracking-tight">
              #{jerseyNumber}
            </Text>
          </View>
        </View>

        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="text-white text-base font-bold tracking-tight uppercase"
          >
            {name}
          </Text>

          <Text
            numberOfLines={1}
            className="text-[#AEB6BE] text-xs font-normal mt-0.5"
          >
            {position} {teamName ? `• ${teamName}` : ""}
          </Text>

          <View className="flex-row items-center mt-2">
            <Text className="text-white text-xs font-semibold">
              {matchesPlayed}{" "}
              <Text className="text-[#5C616A] font-normal">matches</Text>
            </Text>
            <Text className="text-[#5C616A] text-xs mx-1.5">•</Text>
            <View className="flex-row items-center">
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text className="text-white text-xs font-bold ml-1">
                {rating}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#5C616A" />
    </Pressable>
  );
};

export const PlayerCard = AthleteCard;
