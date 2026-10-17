import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AgentMatchData } from '../../services/agentService';

interface MatchResultCardsProps {
  matches: AgentMatchData[];
  className?: string;
}

const getSportColor = (sportName: string) => {
  const s = sportName.toLowerCase();
  if (s.includes('cricket')) return '#F4A261';
  if (s.includes('badminton')) return '#7FD1AE';
  if (s.includes('padel')) return '#64B5F6';
  return '#22C55E';
};

const getSportIcon = (sportName: string): keyof typeof MaterialCommunityIcons.glyphMap => {
  const s = sportName.toLowerCase();
  if (s.includes('cricket')) return 'cricket';
  if (s.includes('badminton')) return 'badminton';
  if (s.includes('padel')) return 'tennis';
  return 'soccer';
};

export const MatchResultCards: React.FC<MatchResultCardsProps> = ({ matches, className = '' }) => {
  if (!matches || matches.length === 0) return null;

  return (
    <View className={`w-full mt-2.5 space-y-2.5 ${className}`}>
      {matches.slice(0, 3).map((match) => {
        const accentColor = getSportColor(match.sport);
        const iconName = getSportIcon(match.sport);
        const isOpen = match.openSlots > 0;

        return (
          <Pressable
            key={match.id}
            onPress={() => router.push(`/match/${match.id}` as any)}
            accessibilityRole="button"
            accessibilityLabel={`View match: ${match.title} at ${match.venueName}, ${match.date} at ${match.startTime}`}
            className="w-full p-3.5 rounded-xl bg-[#1B1D22] border border-white/[0.08] active:bg-[#20232A] transition-all"
          >
            {/* Top row: Sport badge & Slots */}
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center">
                <MaterialCommunityIcons name={iconName} size={15} color={accentColor} />
                <Text
                  style={{ color: accentColor }}
                  className="text-[11px] font-black uppercase tracking-wider ml-1"
                >
                  {match.sport}
                </Text>
                {match.format ? (
                  <Text className="text-[#5C616A] text-[10px] ml-1.5 font-semibold">
                    • {match.format}
                  </Text>
                ) : null}
              </View>

              <View
                className={`px-2 py-0.5 rounded-full border ${
                  isOpen
                    ? 'bg-[#22C55E]/15 border-[#22C55E]/30'
                    : 'bg-[#5C616A]/20 border-white/[0.08]'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    isOpen ? 'text-[#22C55E]' : 'text-[#A0A5AD]'
                  }`}
                >
                  {isOpen ? `${match.openSlots} Open Slot${match.openSlots === 1 ? '' : 's'}` : 'Match Full'}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text className="text-white text-sm font-bold tracking-tight mb-1" numberOfLines={1}>
              {match.title}
            </Text>

            {/* Venue & Time details */}
            <View className="space-y-0.5 mb-2">
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={13} color="#A0A5AD" />
                <Text className="text-[#A0A5AD] text-xs font-normal ml-1 flex-1" numberOfLines={1}>
                  {match.venueName} {match.area ? `• ${match.area}` : ''}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={13} color="#A0A5AD" />
                <Text className="text-[#A0A5AD] text-xs font-normal ml-1">
                  {match.date} • {match.startTime}
                </Text>
                {match.skillLevel ? (
                  <Text className="text-[#5C616A] text-xs font-medium ml-1.5 capitalize">
                    • {match.skillLevel}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Bottom Action Hint */}
            <View className="pt-2 border-t border-white/[0.06] flex-row items-center justify-between">
              <Text className="text-[#5C616A] text-[11px] font-medium">
                {match.contributionPerPlayer
                  ? `PKR ${match.contributionPerPlayer} / player`
                  : 'Free entry'}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-[#E85D26] text-xs font-bold mr-1">View Details</Text>
                <Ionicons name="chevron-forward" size={13} color="#E85D26" />
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};
