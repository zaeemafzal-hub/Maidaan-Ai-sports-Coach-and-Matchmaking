import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ArenaBadge } from './ArenaBadge';

interface MatchFixtureCardProps {
  title: string;
  sport: string;
  date: string;
  time: string;
  groundName: string;
  area?: string;
  slotsOpen: number;
  totalSlots: number;
  skillLevel?: string;
  pricePerPlayer?: string;
  captainName?: string;
  sportIcon?: 'cricket' | 'badminton' | 'tennis' | 'soccer';
  onPress: () => void;
  className?: string;
}

export const MatchFixtureCard: React.FC<MatchFixtureCardProps> = ({
  title,
  sport,
  date,
  time,
  groundName,
  area,
  slotsOpen,
  totalSlots,
  skillLevel = 'All levels',
  pricePerPlayer,
  captainName,
  sportIcon,
  onPress,
  className = '',
}) => {
  const isOneLeft = slotsOpen === 1;
  const isNearlyFull = slotsOpen <= 2 && slotsOpen > 0;
  const isFull = slotsOpen === 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Match fixture: ${title} at ${groundName}, ${date} ${time}, ${slotsOpen} slots open`}
      className={`w-full p-4 rounded-xl bg-warm-white border border-stone active:bg-stone-light shadow-sm active:scale-[0.99] transition-all ${className}`}
    >
      {/* Top Header: Sport Badge & Slot Availability Status */}
      <View className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-stone/60">
        <View className="flex-row items-center">
          {sportIcon && (
            <MaterialCommunityIcons
              name={sportIcon}
              size={15}
              color="#3D4438"
              style={{ marginRight: 6 }}
            />
          )}
          <Text className="text-graphite text-xs font-black uppercase tracking-wider mr-2">
            {sport}
          </Text>
          <View className="px-1.5 py-0.5 rounded-sm bg-stone/25 border border-stone/60">
            <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider">
              {skillLevel}
            </Text>
          </View>
        </View>

        {isFull ? (
          <ArenaBadge label="FULL" variant="rust" />
        ) : isOneLeft ? (
          <ArenaBadge label="1 SLOT LEFT" variant="rust" />
        ) : isNearlyFull ? (
          <ArenaBadge label={`${slotsOpen} SPOTS LEFT`} variant="rust" />
        ) : (
          <ArenaBadge label={`${slotsOpen} / ${totalSlots} OPEN`} variant="olive" />
        )}
      </View>

      {/* Fixture Match Title */}
      <Text
        numberOfLines={1}
        className="text-graphite text-base font-black uppercase tracking-tight"
      >
        {title}
      </Text>

      {/* Location & Time Info */}
      <View className="mt-2 space-y-1">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={13} color="#666B60" />
          <Text className="text-stone-muted text-xs font-semibold ml-1.5">
            {date} • {time}
          </Text>
        </View>

        <View className="flex-row items-center mt-1">
          <Ionicons name="location-sharp" size={13} color="#666B60" />
          <Text
            numberOfLines={1}
            className="text-stone-muted text-xs font-medium ml-1.5 flex-1"
          >
            {groundName}
            {area ? ` • ${area}` : ''}
          </Text>
        </View>

        {captainName && (
          <View className="flex-row items-center mt-1">
            <Ionicons name="person-outline" size={12} color="#666B60" />
            <Text className="text-stone-muted text-[11px] font-semibold ml-1.5">
              Host: {captainName}
            </Text>
          </View>
        )}
      </View>

      {/* Footer Strip with Action & Fee */}
      <View className="mt-3.5 pt-2.5 border-t border-stone flex-row items-center justify-between">
        {pricePerPlayer ? (
          <Text className="text-graphite text-xs font-black">
            {pricePerPlayer}
            <Text className="text-stone-muted font-normal text-[11px]"> / player</Text>
          </Text>
        ) : (
          <Text className="text-stone-muted text-xs font-semibold">Free Match</Text>
        )}

        <View className="flex-row items-center">
          <Text className="text-olive text-xs font-black uppercase tracking-wider mr-1">
            VIEW FIXTURE
          </Text>
          <Ionicons name="arrow-forward" size={13} color="#3D4438" />
        </View>
      </View>
    </Pressable>
  );
};
