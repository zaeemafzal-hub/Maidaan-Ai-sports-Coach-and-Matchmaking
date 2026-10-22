import React from 'react';
import { View, Text, Pressable } from '../theme/Primitives';
import { Ionicons, MaterialCommunityIcons } from '../theme/Icons';

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
  isFeatured?: boolean;
}

const getSportColor = (sportName: string) => {
  const s = sportName.toLowerCase();
  if (s.includes('cricket')) return '#F4A261';
  if (s.includes('badminton')) return '#7FD1AE';
  if (s.includes('padel')) return '#64B5F6';
  return '#22C55E';
};

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
  isFeatured = false,
}) => {
  const isOneLeft = slotsOpen === 1;
  const isFull = slotsOpen === 0;
  const sportAccentColor = getSportColor(sport);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Match fixture: ${title} at ${groundName}, ${date} ${time}, ${slotsOpen} slots open`}
      className={`w-full p-4 rounded-2xl bg-[#141518]/25 ${
        isFeatured
          ? 'border-2 border-[#E85D26]/40 shadow-md shadow-[#E85D26]/10'
          : 'border border-white/[0.08]'
      } active:bg-[#1B1D22] active:scale-[0.99] transition-all ${className}`}
    >
      {/* Top Header: Category / Context + Glowing Spots Left Pill */}
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center">
          {isFeatured && (
            <View className="px-2 py-0.5 rounded-full bg-[#E85D26]/20 border border-[#E85D26]/50 mr-2">
              <Text
                style={{ color: '#E85D26' }}
                className="text-[#E85D26] text-[10px] font-black uppercase tracking-wider"
              >
                Featured
              </Text>
            </View>
          )}
          <View
            className="w-6 h-6 rounded-lg items-center justify-center mr-2"
            style={{ backgroundColor: `${sportAccentColor}20` }}
          >
            {sportIcon && (
              <MaterialCommunityIcons
                name={sportIcon}
                size={14}
                color={sportAccentColor}
              />
            )}
          </View>
          <Text
            style={{ color: '#A0A5AD' }}
            className="text-[#A0A5AD] text-xs font-semibold tracking-wide uppercase"
          >
            {sport} • {skillLevel}
          </Text>
        </View>

        {/* Spots Left Glowing Pill */}
        <View
          className={`px-2.5 py-1 rounded-full border ${
            isFull
              ? 'bg-[#1B1D22] border-white/[0.08]'
              : isOneLeft
              ? 'bg-[#F59E0B]/15 border-[#F59E0B]/40 shadow-xs'
              : 'bg-[#E85D26]/15 border-[#E85D26]/40 shadow-xs'
          }`}
        >
          <Text
            style={{
              color: isFull ? '#5C616A' : isOneLeft ? '#F59E0B' : '#E85D26',
            }}
            className="text-[11px] font-bold tracking-tight"
          >
            {isFull ? 'FULL' : isOneLeft ? '1 spot left' : `${slotsOpen} spots left`}
          </Text>
        </View>
      </View>

      {/* Fixture Match Title */}
      <Text
        numberOfLines={1}
        style={{ color: '#FFFFFF' }}
        className="text-white text-base font-bold tracking-tight"
      >
        {title}
      </Text>

      {/* Location & Time Info */}
      <View className="mt-2 space-y-1">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={13} color="#5C616A" />
          <Text
            style={{ color: '#A0A5AD' }}
            className="text-[#A0A5AD] text-xs font-normal ml-1.5"
          >
            {time} • {date}
          </Text>
        </View>

        <View className="flex-row items-center mt-1">
          <Ionicons name="location-outline" size={13} color="#5C616A" />
          <Text
            numberOfLines={1}
            style={{ color: '#A0A5AD' }}
            className="text-[#A0A5AD] text-xs font-normal ml-1.5 flex-1"
          >
            {groundName}{area ? ` • ${area}` : ''}
          </Text>
        </View>
      </View>

      {/* Bottom Bar: Captain & Pricing */}
      <View className="flex-row items-center justify-between pt-2.5 mt-2.5 border-t border-white/[0.06]">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-5 h-5 rounded-full bg-[#1B1D22] items-center justify-center mr-1.5 border border-white/[0.08]">
            <Ionicons name="person" size={10} color="#A0A5AD" />
          </View>
          <Text
            numberOfLines={1}
            style={{ color: '#BFC4CC' }}
            className="text-[#5C616A] text-xs font-normal"
          >
            Host:{' '}
            <Text style={{ color: '#A0A5AD' }} className="text-[#A0A5AD] font-medium">
              {captainName || 'Team Captain'}
            </Text>
          </Text>
        </View>

        {pricePerPlayer ? (
          <Text
            style={{ color: '#E85D26' }}
            className="text-[#E85D26] text-xs font-bold tracking-tight"
          >
            {pricePerPlayer}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

export const MatchCard = MatchFixtureCard;
export default MatchFixtureCard;
