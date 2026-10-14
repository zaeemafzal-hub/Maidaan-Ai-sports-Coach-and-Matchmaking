import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { Sport, SkillLevel } from '../../types';

// Sport icons and configurations
const SPORT_META: Record<
  Sport,
  { label: string; icon: 'cricket' | 'badminton' | 'tennis' | 'soccer'; color: string }
> = {
  cricket: { label: 'Cricket', icon: 'cricket', color: '#875646' },
  badminton: { label: 'Badminton', icon: 'badminton', color: '#7A6B56' },
  padel: { label: 'Padel', icon: 'tennis', color: '#5A6254' },
  football: { label: 'Football', icon: 'soccer', color: '#3D4438' },
};

// Skill tier metadata
const SKILL_METAS: Record<SkillLevel, { label: string; tierBadge: string; tag: string }> = {
  beginner: { label: 'Beginner', tierBadge: 'DIV 03', tag: 'Grassroots Casual' },
  intermediate: { label: 'Intermediate', tierBadge: 'DIV 02', tag: 'Club Regular' },
  advanced: { label: 'Advanced', tierBadge: 'DIV 01', tag: 'Premier League' },
};

// Typed deterministic recent matches presentation model (separate from open discovery)
export interface PlayerMatchHistoryItem {
  id: string;
  title: string;
  sport: Sport;
  sportLabel: string;
  format: string;
  date: string;
  venueName: string;
  status: 'completed' | 'confirmed' | 'upcoming';
  result?: 'WIN' | 'LOSS' | 'TIED';
}

const DETERMINISTIC_RECENT_MATCHES: PlayerMatchHistoryItem[] = [
  {
    id: 'hist-01',
    title: 'Model Town 7v7 Evening Floodlit',
    sport: 'football',
    sportLabel: 'Football',
    format: '7v7 Artificial Turf',
    date: 'Yesterday · 8:30 PM',
    venueName: 'Model Town Football Turf, Pitch 1',
    status: 'completed',
    result: 'WIN',
  },
  {
    id: 'hist-02',
    title: 'Gulberg Floodlit Tape-Ball T10',
    sport: 'cricket',
    sportLabel: 'Cricket',
    format: 'T10 Tape-Ball (8 Overs)',
    date: '3 Days Ago · 9:00 PM',
    venueName: 'Gulberg Central Sports Nets',
    status: 'completed',
    result: 'WIN',
  },
  {
    id: 'hist-03',
    title: 'DHA Phase 5 Padel Doubles',
    sport: 'padel',
    sportLabel: 'Padel',
    format: '2v2 Outdoor Padel',
    date: 'Last Weekend · 7:00 PM',
    venueName: 'DHA Phase 5 Padel Club, Court B',
    status: 'completed',
    result: 'LOSS',
  },
  {
    id: 'hist-04',
    title: 'Johar Town Badminton Open',
    sport: 'badminton',
    sportLabel: 'Badminton',
    format: 'Men Doubles Indoor',
    date: 'Tomorrow · 7:30 PM',
    venueName: 'Johar Town Sports Complex, Court 2',
    status: 'upcoming',
  },
];

export default function ProfileScreen() {
  const { currentUser, playerProfile, reset } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  const handleSignOut = () => {
    reset();
    router.replace('/(auth)/login');
  };

  const handleGoToSetup = () => {
    router.push('/onboarding/player-setup');
  };

  // Safe fallback name/email from currentUser if available
  const profileName = currentUser?.name || 'Player';
  const profileEmail = currentUser?.email || '';
  const profileRole = currentUser?.role || 'PLAYER';
  const userInitials = profileName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'P';

  // =========================================================================
  // 1. MISSING PROFILE BEHAVIOR: RENDER CONCRETE ARENA EMPTY STATE
  // =========================================================================
  if (!playerProfile) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
        <ArenaHeader
          title="MAIDAAN"
          subtitle="PLAYER PROFILE // SCREEN 15"
        />

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Identity Header Card with real currentUser data */}
          <View className="bg-graphite rounded-sm p-5 border border-graphite shadow-sm mb-8">
            <View className="flex-row items-center">
              <View className="w-14 h-14 rounded-full bg-arena-olive items-center justify-center border-2 border-warm-white">
                <Text className="text-warm-white text-lg font-black tracking-widest">
                  {userInitials}
                </Text>
              </View>
              <View className="ml-3.5 flex-1">
                <View className="flex-row items-center flex-wrap gap-1.5 mb-1">
                  <Text className="text-warm-white text-base font-black uppercase tracking-tight">
                    {profileName}
                  </Text>
                  <View className="bg-arena-olive/60 px-1.5 py-0.5 rounded-xs border border-arena-olive">
                    <Text className="text-warm-white text-[9px] font-black uppercase tracking-widest">
                      {profileRole}
                    </Text>
                  </View>
                </View>
                {profileEmail ? (
                  <Text className="text-stone-muted text-xs font-mono">
                    {profileEmail}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Empty State Card */}
          <View className="bg-white rounded-sm p-6 border border-stone items-center">
            <View className="w-14 h-14 rounded-full bg-stone/20 border border-stone items-center justify-center mb-4">
              <Ionicons name="person-outline" size={26} color="#666B60" />
            </View>

            <Text className="text-graphite text-lg font-black uppercase tracking-tight text-center">
              PLAYER PROFILE NOT SET
            </Text>

            <Text className="text-stone-muted text-xs font-medium text-center mt-2 leading-5 max-w-[280px]">
              Complete your player setup to build your Maidaan player identity.
            </Text>

            <View className="w-full mt-6">
              <Pressable
                onPress={handleGoToSetup}
                className="w-full bg-arena-olive rounded-sm py-3.5 items-center justify-center active:bg-olive-dark border border-arena-olive"
              >
                <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                  COMPLETE PLAYER SETUP
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Sign Out CTA */}
          <View className="mt-8">
            <Pressable
              onPress={handleSignOut}
              className="flex-row items-center justify-center bg-stone/20 rounded-sm py-3 border border-stone"
            >
              <Ionicons name="log-out-outline" size={16} color="#875646" />
              <Text className="text-rust text-xs font-black uppercase tracking-wider ml-1.5">
                SIGN OUT OF MAIDAAN
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // 2. CONFIGURED PROFILE DATA (Valid playerProfile exists)
  // =========================================================================
  const primaryLocation = playerProfile.primaryLocation || 'Lahore';
  const currentSkill: SkillLevel = playerProfile.skillLevel || 'intermediate';
  // Display only the sports actually chosen in playerProfile
  const preferredSports: Sport[] = playerProfile.preferredSports || [];

  const skillInfo = SKILL_METAS[currentSkill] || SKILL_METAS.intermediate;

  // Filter recent history to sports the player actually plays
  const relevantRecentMatches = DETERMINISTIC_RECENT_MATCHES.filter((m) =>
    preferredSports.includes(m.sport)
  );
  const displayMatches =
    relevantRecentMatches.length > 0
      ? relevantRecentMatches
      : DETERMINISTIC_RECENT_MATCHES.slice(0, 2);

  // 3. REAL DOMAIN STATS ONLY (No fabricated metrics, no mixed real/mock arithmetic)
  const actualMatchesPlayed =
    typeof playerProfile.matchesPlayed === 'number'
      ? playerProfile.matchesPlayed
      : 0;

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
      {/* Concrete Arena Header */}
      <ArenaHeader
        title="MAIDAAN"
        subtitle="PLAYER PROFILE // SCREEN 15"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* PLAYER IDENTITY HERO CARD */}
        <View className="px-4 pt-4">
          <View className="bg-graphite rounded-sm p-4 border border-graphite shadow-sm">
            <View className="flex-row items-center justify-between">
              {/* Avatar + Name Details */}
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-14 h-14 rounded-full bg-arena-olive items-center justify-center border-2 border-warm-white">
                  <Text className="text-warm-white text-lg font-black tracking-widest">
                    {userInitials}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center flex-wrap gap-1 mb-1">
                    <Text className="text-warm-white text-base font-black uppercase tracking-tight">
                      {profileName}
                    </Text>
                    <View className="bg-arena-olive/60 px-1.5 py-0.5 rounded-xs border border-arena-olive">
                      <Text className="text-warm-white text-[9px] font-black uppercase tracking-widest">
                        {profileRole}
                      </Text>
                    </View>
                  </View>
                  {profileEmail ? (
                    <Text className="text-stone-muted text-xs font-mono">
                      {profileEmail}
                    </Text>
                  ) : null}
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="location-sharp" size={11} color="#B8B2A6" />
                    <Text className="text-stone-muted text-[11px] font-medium ml-1">
                      {primaryLocation}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Skill Tier Badge */}
              <View className="items-end">
                <ArenaBadge
                  label={skillInfo.tierBadge}
                  variant="rust"
                  size="sm"
                />
                <Text className="text-stone-muted text-[10px] font-mono uppercase mt-1">
                  {skillInfo.label}
                </Text>
              </View>
            </View>

            {/* Sub-bar */}
            <View className="mt-4 pt-3 border-t border-white/10 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-olive-muted mr-2" />
                <Text className="text-warm-white/90 text-[11px] font-medium">
                  {skillInfo.tag}
                </Text>
              </View>
              <Text className="text-stone-muted text-[10px] font-mono">
                Maidaan Circuit
              </Text>
            </View>
          </View>
        </View>

        {/* BASIC SPORTING RECORD (Real playerProfile domain data only) */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold">
              BASIC STATS
            </Text>
            <Text className="text-stone-muted text-[10px] font-mono">
              Live Profile
            </Text>
          </View>

          <View className="bg-stone/20 rounded-sm p-3.5 border border-stone">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider">
                  MATCHES PLAYED
                </Text>
                <Text className="text-graphite text-3xl font-black tracking-tight mt-0.5">
                  {actualMatchesPlayed}
                </Text>
                <Text className="text-stone-muted text-xs font-medium mt-1">
                  {actualMatchesPlayed === 0
                    ? '0 confirmed matches recorded'
                    : actualMatchesPlayed === 1
                    ? '1 confirmed match recorded'
                    : `${actualMatchesPlayed} confirmed matches recorded`}
                </Text>
              </View>
              <View className="w-11 h-11 rounded-full bg-arena-olive/20 items-center justify-center border border-arena-olive/40">
                <Ionicons name="trophy-outline" size={20} color="#3D4438" />
              </View>
            </View>
          </View>
        </View>

        {/* REGISTERED SPORTS DISCIPLINES */}
        <View className="px-4 mt-5">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold">
              PREFERRED SPORTS
            </Text>
            <Text className="text-stone-muted text-[10px] font-mono">
              {preferredSports.length} Selected
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {preferredSports.map((sport) => {
              const meta = SPORT_META[sport] || {
                label: sport,
                icon: 'soccer' as const,
                color: '#3D4438',
              };
              return (
                <View
                  key={sport}
                  className="flex-row items-center bg-white rounded-sm px-3 py-2 border border-stone shadow-2xs"
                >
                  <MaterialCommunityIcons
                    name={meta.icon}
                    size={16}
                    color={meta.color}
                  />
                  <Text className="text-graphite text-xs font-bold uppercase tracking-wide ml-2">
                    {meta.label}
                  </Text>
                  <View className="w-1.5 h-1.5 rounded-full bg-arena-olive ml-2" />
                </View>
              );
            })}
          </View>
        </View>

        {/* SECTION TOGGLE: OVERVIEW / RECENT MATCHES */}
        <View className="px-4 mt-6">
          <View className="flex-row bg-stone/30 p-1 rounded-sm border border-stone">
            <Pressable
              onPress={() => setActiveTab('overview')}
              className={`flex-1 py-2 items-center rounded-xs ${
                activeTab === 'overview' ? 'bg-graphite' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-black uppercase tracking-wider ${
                  activeTab === 'overview' ? 'text-warm-white' : 'text-stone-muted'
                }`}
              >
                TACTICAL PROFILE
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('history')}
              className={`flex-1 py-2 items-center rounded-xs ${
                activeTab === 'history' ? 'bg-graphite' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-black uppercase tracking-wider ${
                  activeTab === 'history' ? 'text-warm-white' : 'text-stone-muted'
                }`}
              >
                RECENT MATCHES
              </Text>
            </Pressable>
          </View>
        </View>

        {/* TAB CONTENT */}
        {activeTab === 'overview' ? (
          <View className="px-4 mt-4 space-y-4">
            {/* Player Bio & On-court Role */}
            <View className="bg-white rounded-sm p-4 border border-stone shadow-2xs">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-graphite text-xs font-black uppercase tracking-wider">
                  TACTICAL SUMMARY
                </Text>
                <ArenaBadge label={skillInfo.label.toUpperCase()} variant="olive" size="sm" />
              </View>
              <Text className="text-graphite text-xs leading-5">
                {playerProfile.bio ||
                  `Recreational ${preferredSports.map((s) => SPORT_META[s]?.label || s).join(', ')} player competing in ${primaryLocation}. Skill tier: ${skillInfo.label}.`}
              </Text>
            </View>
          </View>
        ) : (
          /* RECENT MATCHES LIST (Typed deterministic presentation history) */
          <View className="px-4 mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold">
                RECENT MATCHES
              </Text>
              <Text className="text-stone-muted text-[10px] font-mono">
                Sample History
              </Text>
            </View>

            {displayMatches.map((item) => (
              <View
                key={item.id}
                className="bg-white rounded-sm p-3.5 mb-2.5 border border-stone shadow-2xs"
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center">
                    <ArenaBadge
                      label={item.sportLabel.toUpperCase()}
                      variant={item.sport === 'cricket' ? 'rust' : 'olive'}
                      size="sm"
                    />
                    <Text className="text-stone-muted text-[10px] font-mono ml-2">
                      {item.date}
                    </Text>
                  </View>
                  {item.result ? (
                    <View
                      className={`px-1.5 py-0.5 rounded-xs ${
                        item.result === 'WIN' ? 'bg-arena-olive/20' : 'bg-stone/30'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-black ${
                          item.result === 'WIN' ? 'text-arena-olive' : 'text-graphite'
                        }`}
                      >
                        {item.result}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-stone-muted text-[10px] font-mono uppercase">
                      {item.status}
                    </Text>
                  )}
                </View>

                <Text className="text-graphite text-sm font-black uppercase tracking-tight">
                  {item.title}
                </Text>

                <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-stone/30">
                  <View className="flex-row items-center flex-1">
                    <Ionicons name="location-outline" size={12} color="#666B60" />
                    <Text
                      numberOfLines={1}
                      className="text-stone-muted text-xs font-medium ml-1 flex-1"
                    >
                      {item.venueName}
                    </Text>
                  </View>
                  <Text className="text-stone-muted text-[10px] font-mono">
                    {item.format}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* QUICK NAVIGATION BRIDGES */}
        <View className="px-4 mt-6">
          <Text className="text-graphite text-[11px] font-mono uppercase tracking-widest mb-2 font-bold">
            QUICK ACTIONS
          </Text>

          <View className="space-y-2">
            <Pressable
              onPress={() => router.push('/notifications')}
              className="flex-row items-center justify-between bg-white rounded-sm p-3 border border-stone shadow-2xs"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-stone/20 items-center justify-center border border-stone">
                  <Ionicons name="notifications-outline" size={16} color="#242522" />
                </View>
                <View className="ml-3">
                  <Text className="text-graphite text-xs font-bold uppercase tracking-wide">
                    NOTIFICATIONS
                  </Text>
                  <Text className="text-stone-muted text-[10px]">
                    Match reminders and activity alerts
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666B60" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/coach')}
              className="flex-row items-center justify-between bg-white rounded-sm p-3 border border-stone shadow-2xs mt-2"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-arena-olive/20 items-center justify-center border border-arena-olive/40">
                  <Ionicons name="fitness-outline" size={16} color="#3D4438" />
                </View>
                <View className="ml-3">
                  <Text className="text-graphite text-xs font-bold uppercase tracking-wide">
                    AI COACH
                  </Text>
                  <Text className="text-stone-muted text-[10px]">
                    Sport-specific tactical advice
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666B60" />
            </Pressable>
          </View>
        </View>

        {/* ACCOUNT SESSION MANAGEMENT */}
        <View className="px-4 mt-8">
          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center justify-center bg-stone/20 rounded-sm py-3 border border-stone"
          >
            <Ionicons name="log-out-outline" size={16} color="#875646" />
            <Text className="text-rust text-xs font-black uppercase tracking-wider ml-1.5">
              SIGN OUT OF MAIDAAN
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
