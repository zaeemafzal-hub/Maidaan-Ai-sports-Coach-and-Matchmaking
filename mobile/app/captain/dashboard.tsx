import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { MatchSlotItem } from '../../constants/matches';
import { IMAGES } from '../../constants/images';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { Sport, SkillLevel } from '../../types';

// Sport display metadata
const SPORT_META: Record<
  Sport,
  { label: string; icon: 'cricket' | 'badminton' | 'tennis' | 'soccer' }
> = {
  football: { label: 'Football', icon: 'soccer' },
  cricket: { label: 'Cricket', icon: 'cricket' },
  padel: { label: 'Padel', icon: 'tennis' },
  badminton: { label: 'Badminton', icon: 'badminton' },
};

// Skill tier metadata matching Concrete Arena system
const SKILL_METAS: Record<
  SkillLevel,
  { label: string; tierBadge: string; tag: string }
> = {
  beginner: { label: 'Beginner', tierBadge: 'DIV 03', tag: 'Grassroots Casual' },
  intermediate: { label: 'Intermediate', tierBadge: 'DIV 02', tag: 'Club Regular' },
  advanced: { label: 'Advanced', tierBadge: 'DIV 01', tag: 'Premier Circuit' },
};

import { matchService } from '../../services/matchService';

// Helper to map MatchSlotItem into presentation fixture model
const mapToCaptainFixture = (m: MatchSlotItem): CaptainFixture => {
  let status: 'OPEN' | 'FULL' | 'UPCOMING' = 'OPEN';
  if (m.slotsOpen === 0) {
    status = 'FULL';
  } else if (
    m.date.toLowerCase().includes('tomorrow') ||
    m.date.toLowerCase().includes('wednesday') ||
    m.date.toLowerCase().includes('saturday')
  ) {
    status = m.slotsOpen > 0 ? 'OPEN' : 'FULL';
  }

  return {
    id: m.id,
    title: m.title,
    sport: m.sport,
    sportLabel: m.sportLabel,
    date: m.date,
    time: m.time,
    groundName: m.groundName,
    area: m.area,
    slotsOpen: m.slotsOpen,
    totalSlots: m.totalSlots,
    skillLevel: m.skillLevel,
    status,
  };
};

// Typed captain fixture presentation model
export interface CaptainFixture {
  id: string;
  title: string;
  sport: Sport;
  sportLabel: string;
  date: string;
  time: string;
  groundName: string;
  area: string;
  slotsOpen: number;
  totalSlots: number;
  skillLevel: string;
  status: 'OPEN' | 'FULL' | 'UPCOMING';
}

export default function CaptainDashboardScreen() {
  const { currentUser, selectedRole, captainProfile } = useAuthStore();
  const [filterTab, setFilterTab] = useState<'all' | 'open' | 'full'>('all');

  // Determine current effective role without modifying store
  const effectiveRole = currentUser?.role || selectedRole || 'PLAYER';
  const isCaptain = effectiveRole === 'TEAM_CAPTAIN';

  // Deterministic local request count (presentation only, not claiming push sync)
  const pendingRequestsCount = 3;

  // =========================================================================
  // 1. ROLE GUARD: NON-CAPTAIN USER ACCESS
  // =========================================================================
  if (!isCaptain) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
        <ArenaHeader
          title="MAIDAAN"
          subtitle="MATCH OPERATIONS // ROLE RESTRICTION"
          showBack
          onBack={() => router.replace('/(tabs)/discover')}
        />

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-sm p-6 border border-stone items-center shadow-sm">
            <View className="w-16 h-16 rounded-full bg-stone/20 border border-stone items-center justify-center mb-4">
              <Ionicons name="shield-outline" size={30} color="#666B60" />
            </View>

            <Text
              accessibilityRole="header"
              className="text-graphite text-lg font-black uppercase tracking-tight text-center"
            >
              CAPTAIN ACCESS REQUIRED
            </Text>

            <Text className="text-stone-muted text-xs font-medium text-center mt-2.5 leading-5 max-w-[280px]">
              This workspace is available to Team Captain accounts.
            </Text>

            <View className="w-full mt-6 space-y-2.5">
              <Pressable
                onPress={() => router.replace('/(tabs)/discover')}
                accessibilityRole="button"
                accessibilityLabel="Return to Discover"
                className="w-full bg-arena-olive py-3.5 rounded-sm items-center justify-center border border-arena-olive active:bg-olive-dark"
              >
                <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                  RETURN TO DISCOVER
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(auth)/role-selection')}
                accessibilityRole="button"
                accessibilityLabel="Switch to Captain Account"
                className="w-full bg-stone/20 py-3 rounded-sm items-center justify-center border border-stone active:bg-stone/30 mt-2"
              >
                <Text className="text-graphite text-xs font-bold uppercase tracking-wide">
                  SWITCH ROLE IN SELECTION
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // 2. MISSING CAPTAIN PROFILE: ONBOARDING REQUIRED
  // =========================================================================
  if (!captainProfile) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
        <ArenaHeader
          title="MAIDAAN"
          subtitle="CAPTAIN DESK // SETUP REQUIRED"
          showBack
          onBack={() => router.replace('/(tabs)/discover')}
        />

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-sm p-6 border border-stone items-center shadow-sm">
            <View className="w-16 h-16 rounded-full bg-arena-olive/10 border border-arena-olive/30 items-center justify-center mb-4">
              <Ionicons name="clipboard-outline" size={30} color="#3D4438" />
            </View>

            <Text
              accessibilityRole="header"
              className="text-graphite text-lg font-black uppercase tracking-tight text-center"
            >
              CAPTAIN PROFILE NOT SET
            </Text>

            <Text className="text-stone-muted text-xs font-medium text-center mt-2.5 leading-5 max-w-[280px]">
              Complete your captain setup before managing fixtures.
            </Text>

            <View className="w-full mt-6 space-y-2.5">
              <Pressable
                onPress={() => router.push('/onboarding/captain-setup')}
                accessibilityRole="button"
                accessibilityLabel="Complete Captain Setup"
                className="w-full bg-arena-olive py-3.5 rounded-sm items-center justify-center border border-arena-olive active:bg-olive-dark"
              >
                <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                  COMPLETE CAPTAIN SETUP
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.replace('/(tabs)/discover')}
                accessibilityRole="button"
                accessibilityLabel="Return to Discover"
                className="w-full bg-stone/20 py-3 rounded-sm items-center justify-center border border-stone active:bg-stone/30 mt-2"
              >
                <Text className="text-graphite text-xs font-bold uppercase tracking-wide">
                  RETURN TO DISCOVER
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // 3. CAPTAIN PROFILE SOURCE (Strict values without synthetic fallbacks)
  // =========================================================================
  const teamName = captainProfile.teamName?.trim() || 'TEAM NAME NOT SET';
  // Use actual captain sports array established by Captain Setup
  const assignedSport: Sport | undefined = captainProfile.sports?.[0];
  const assignedSkill: SkillLevel | undefined = captainProfile.skillLevel;
  const primaryLocation = captainProfile.primaryLocation?.trim() || 'AREA NOT SET';
  const captainName = currentUser?.name?.trim() || 'Captain';

  const sportMeta = assignedSport ? SPORT_META[assignedSport] : null;
  const skillMeta = assignedSkill ? SKILL_METAS[assignedSkill] : null;

  // =========================================================================
  // 4. CAPTAIN FIXTURES MAPPING (Explicit Backend Ownership Only)
  // =========================================================================
  const [captainFixtures, setCaptainFixtures] = useState<CaptainFixture[]>([]);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState<boolean>(true);
  const [fixturesError, setFixturesError] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);

  const loadCaptainFixtures = React.useCallback(async () => {
    try {
      if (isMountedRef.current) {
        setIsLoadingFixtures(true);
        setFixturesError(null);
      }
      const data = await matchService.getCaptainMatches();
      if (isMountedRef.current) {
        setCaptainFixtures(data.map(mapToCaptainFixture));
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn('[CaptainDashboard] Failed to fetch captain fixtures:', err);
        setFixturesError(err?.message || 'Failed to load captain fixtures. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingFixtures(false);
      }
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      isMountedRef.current = true;
      loadCaptainFixtures();
      return () => {
        isMountedRef.current = false;
      };
    }, [loadCaptainFixtures])
  );

  // Filter based on selected presentation tab
  const displayedFixtures = useMemo(() => {
    if (filterTab === 'open') {
      return captainFixtures.filter((f) => f.slotsOpen > 0);
    }
    if (filterTab === 'full') {
      return captainFixtures.filter((f) => f.slotsOpen === 0);
    }
    return captainFixtures;
  }, [captainFixtures, filterTab]);

  // Operational metrics calculated strictly from captain's owned fixtures
  const activeFixturesCount = captainFixtures.length;
  const totalOpenSlots = captainFixtures.reduce((acc, f) => acc + f.slotsOpen, 0);

  // Helper for open-slot vacancy presentation
  const getSlotPresentation = (slotsOpen: number) => {
    if (slotsOpen === 0) {
      return {
        label: 'ROSTER FULL',
        badgeVariant: 'stone' as const,
        textColor: 'text-stone-muted',
      };
    }
    if (slotsOpen === 1) {
      return {
        label: '1 SLOT LEFT',
        badgeVariant: 'rust' as const,
        textColor: 'text-rust font-bold',
      };
    }
    return {
      label: `${slotsOpen} OPEN SLOTS`,
      badgeVariant: 'olive' as const,
      textColor: 'text-arena-olive font-bold',
    };
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
      {/* Concrete Arena Header */}
      <ArenaHeader
        title="MAIDAAN"
        subtitle="CAPTAIN DESK // MATCH OPERATIONS"
        showBack
        onBack={() => router.replace('/(tabs)/discover')}
        rightAction={
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            className="w-10 h-10 rounded-sm bg-stone/20 border border-stone items-center justify-center active:bg-stone/30"
          >
            <Ionicons name="notifications-outline" size={18} color="#242522" />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* RESTRAINED PHOTOGRAPHY: Narrow Captain Banner */}
        <View className="px-4 pt-3">
          <View className="h-16 w-full rounded-sm overflow-hidden border border-stone relative bg-graphite">
            <Image
              source={IMAGES.arenaTeam}
              className="w-full h-full opacity-35"
              resizeMode="cover"
            />
            <View className="absolute inset-0 px-3.5 py-2 flex-row items-center justify-between">
              <View>
                <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-widest">
                  TEAM CREDENTIALS
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-warm-white text-sm font-black uppercase tracking-tight"
                >
                  {teamName}
                </Text>
              </View>
              <View className="bg-arena-olive/70 px-2 py-0.5 rounded-xs border border-arena-olive">
                <Text className="text-warm-white text-[9px] font-mono uppercase tracking-wider font-bold">
                  {skillMeta ? skillMeta.tierBadge : 'DIV --'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* CAPTAIN IDENTITY STRIP (Operational Clipboard Credentials) */}
        <View className="px-4 mt-3">
          <View className="bg-white rounded-sm p-4 border border-stone shadow-2xs">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <View className="flex-row items-center flex-wrap gap-1.5 mb-1">
                  <Text
                    numberOfLines={1}
                    className="text-graphite text-base font-black uppercase tracking-tight"
                  >
                    {teamName}
                  </Text>
                  <ArenaBadge label="TEAM CAPTAIN" variant="olive" size="sm" />
                </View>
                <Text className="text-stone-muted text-xs font-medium">
                  Led by {captainName}
                </Text>
              </View>

              <View className="items-end">
                {sportMeta ? (
                  <View className="flex-row items-center bg-stone/20 px-2 py-1 rounded-xs border border-stone">
                    <MaterialCommunityIcons
                      name={sportMeta.icon}
                      size={13}
                      color="#3D4438"
                    />
                    <Text className="text-graphite text-[10px] font-mono uppercase ml-1 font-bold">
                      {sportMeta.label}
                    </Text>
                  </View>
                ) : (
                  <View className="bg-stone/20 px-2 py-1 rounded-xs border border-stone">
                    <Text className="text-stone-muted text-[10px] font-mono uppercase font-bold">
                      SPORT NOT SET
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Spec strip */}
            <View className="mt-3 pt-2.5 border-t border-stone/40 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="location-sharp" size={12} color="#666B60" />
                <Text
                  numberOfLines={1}
                  className="text-stone-muted text-[11px] font-medium ml-1 max-w-[190px]"
                >
                  {primaryLocation}
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-1.5 h-1.5 rounded-full bg-arena-olive mr-1.5" />
                <Text className="text-stone-muted text-[10px] font-mono">
                  {skillMeta ? `${skillMeta.label} Circuit` : 'SKILL NOT SET'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* DOMINANT ELEMENT: CAPTAIN MATCH OPERATIONS SUMMARY */}
        <View className="px-4 mt-4">
          <Text
            accessibilityRole="header"
            className="text-graphite text-[11px] font-mono uppercase tracking-widest mb-2 font-bold"
          >
            MATCH OPERATIONS
          </Text>

          <View className="flex-row gap-2">
            {/* Stat 1: Active Fixtures */}
            <View className="flex-1 bg-stone/20 rounded-sm p-3 border border-stone">
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider">
                ACTIVE FIXTURES
              </Text>
              <Text className="text-graphite text-2xl font-black tracking-tight mt-0.5">
                {activeFixturesCount}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium mt-0.5">
                On board
              </Text>
            </View>

            {/* Stat 2: Open Slots */}
            <View className="flex-1 bg-stone/20 rounded-sm p-3 border border-stone">
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider">
                OPEN SLOTS
              </Text>
              <Text className="text-arena-olive text-2xl font-black tracking-tight mt-0.5">
                {totalOpenSlots}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium mt-0.5">
                Available
              </Text>
            </View>

            {/* Stat 3: Pending Requests */}
            <View className="flex-1 bg-stone/20 rounded-sm p-3 border border-stone">
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider">
                REQUESTS
              </Text>
              <Text className="text-rust text-2xl font-black tracking-tight mt-0.5">
                {pendingRequestsCount}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium mt-0.5">
                Waiting
              </Text>
            </View>
          </View>
        </View>

        {/* PRIMARY ACTION: CREATE MATCH (Screen 17 Bridge) */}
        <View className="px-4 mt-4">
          <Pressable
            onPress={() => router.push('/captain/create-match')}
            accessibilityRole="button"
            accessibilityLabel="Create Match. Open new fixture for your squad"
            className="w-full bg-graphite rounded-sm p-4 border border-graphite shadow-sm active:bg-graphite/90 active:scale-[0.99]"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-10 h-10 rounded-sm bg-arena-olive items-center justify-center border border-warm-white/20 mr-3">
                  <Ionicons name="add" size={24} color="#F4F1EA" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-warm-white text-sm font-black uppercase tracking-wider">
                      CREATE MATCH
                    </Text>
                    <View className="ml-2 bg-arena-olive/60 px-1.5 py-0.5 rounded-xs">
                      <Text className="text-warm-white text-[9px] font-mono uppercase">
                        SCREEN 17
                      </Text>
                    </View>
                  </View>
                  <Text className="text-stone-muted text-xs mt-0.5">
                    Open player slots & schedule local fixture
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#F4F1EA" />
            </View>
          </Pressable>
        </View>

        {/* SECONDARY ACTION: REQUEST ACTIVITY PANEL (Screen 18 Bridge) */}
        <View className="px-4 mt-3">
          <Pressable
            onPress={() => router.push('/captain/join-requests')}
            accessibilityRole="button"
            accessibilityLabel={`Review join requests. ${pendingRequestsCount} athletes waiting for slot approval.`}
            className="w-full bg-white rounded-sm p-4 border border-stone shadow-2xs active:bg-stone/10 active:scale-[0.99]"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-rust mr-2" />
                <Text className="text-graphite text-xs font-black uppercase tracking-wide">
                  REQUEST ATTENTION
                </Text>
              </View>
              <ArenaBadge
                label={`${pendingRequestsCount} PENDING`}
                variant="rust"
                size="sm"
              />
            </View>

            <Text className="text-stone-muted text-xs leading-4 mb-3">
              {pendingRequestsCount} players are waiting for slot approval on your active fixtures.
            </Text>

            <View className="flex-row items-center justify-between pt-2.5 border-t border-stone/30">
              <Text className="text-rust text-xs font-black uppercase tracking-wider">
                REVIEW REQUESTS
              </Text>
              <Ionicons name="arrow-forward" size={15} color="#875646" />
            </View>
          </Pressable>
        </View>

        {/* FIXTURES SECTION: YOUR FIXTURES */}
        <View className="px-4 mt-6">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text
              accessibilityRole="header"
              className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold"
            >
              YOUR FIXTURES
            </Text>
            <Text className="text-stone-muted text-[10px] font-mono">
              {displayedFixtures.length} of {captainFixtures.length} Shown
            </Text>
          </View>

          {/* Presentation Filter Tabs */}
          <View className="flex-row bg-stone/30 p-1 rounded-sm border border-stone mb-3">
            <Pressable
              onPress={() => setFilterTab('all')}
              accessibilityRole="button"
              accessibilityLabel="Show all captain fixtures"
              className={`flex-1 py-1.5 items-center rounded-xs ${
                filterTab === 'all' ? 'bg-graphite' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-[11px] font-black uppercase tracking-wider ${
                  filterTab === 'all' ? 'text-warm-white' : 'text-stone-muted'
                }`}
              >
                ALL ({captainFixtures.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setFilterTab('open')}
              accessibilityRole="button"
              accessibilityLabel="Show open slot fixtures"
              className={`flex-1 py-1.5 items-center rounded-xs ${
                filterTab === 'open' ? 'bg-graphite' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-[11px] font-black uppercase tracking-wider ${
                  filterTab === 'open' ? 'text-warm-white' : 'text-stone-muted'
                }`}
              >
                OPEN SLOTS
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setFilterTab('full')}
              accessibilityRole="button"
              accessibilityLabel="Show full roster fixtures"
              className={`flex-1 py-1.5 items-center rounded-xs ${
                filterTab === 'full' ? 'bg-graphite' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-[11px] font-black uppercase tracking-wider ${
                  filterTab === 'full' ? 'text-warm-white' : 'text-stone-muted'
                }`}
              >
                ROSTER FULL
              </Text>
            </Pressable>
          </View>

          {/* FIXTURE CARDS, LOADING, ERROR OR EMPTY STATE */}
          {isLoadingFixtures ? (
            /* LOADING STATE */
            <View className="bg-white rounded-sm p-8 border border-stone items-center justify-center">
              <ActivityIndicator size="small" color="#1A1C19" />
              <Text className="text-stone-muted text-[10px] font-mono uppercase tracking-widest mt-3">
                SYNCING CAPTAIN FIXTURES...
              </Text>
            </View>
          ) : fixturesError ? (
            /* ERROR STATE WITH RETRY */
            <View className="bg-white rounded-sm p-6 border border-rust/40 items-center">
              <View className="w-12 h-12 rounded-full bg-rust/10 border border-rust/30 items-center justify-center mb-3">
                <Ionicons name="cloud-offline-outline" size={24} color="#875646" />
              </View>

              <Text className="text-graphite text-sm font-black uppercase tracking-tight text-center">
                FAILED TO LOAD CAPTAIN FIXTURES
              </Text>

              <Text className="text-stone-muted text-xs font-medium text-center mt-1.5 leading-5 max-w-[260px]">
                {fixturesError}
              </Text>

              <View className="w-full mt-5">
                <Pressable
                  onPress={loadCaptainFixtures}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading captain fixtures"
                  className="w-full bg-arena-olive rounded-sm py-3 items-center justify-center active:bg-olive-dark border border-arena-olive"
                >
                  <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                    RETRY
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : displayedFixtures.length === 0 ? (
            /* EMPTY CAPTAIN FIXTURES STATE */
            <View className="bg-white rounded-sm p-6 border border-stone items-center">
              <View className="w-12 h-12 rounded-full bg-stone/20 border border-stone items-center justify-center mb-3">
                <Ionicons name="calendar-outline" size={24} color="#666B60" />
              </View>

              <Text className="text-graphite text-sm font-black uppercase tracking-tight text-center">
                NO FIXTURES ON YOUR BOARD
              </Text>

              <Text className="text-stone-muted text-xs font-medium text-center mt-1.5 leading-5 max-w-[260px]">
                Create a match to open player slots in your local circuit.
              </Text>

              <View className="w-full mt-5">
                <Pressable
                  onPress={() => router.push('/captain/create-match')}
                  accessibilityRole="button"
                  accessibilityLabel="Create Match"
                  className="w-full bg-arena-olive rounded-sm py-3 items-center justify-center active:bg-olive-dark border border-arena-olive"
                >
                  <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                    CREATE MATCH
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            /* LIST OF CAPTAIN FIXTURES */
            displayedFixtures.map((fixture) => {
              const slotPresentation = getSlotPresentation(fixture.slotsOpen);
              const confirmedCount = fixture.totalSlots - fixture.slotsOpen;

              return (
                <Pressable
                  key={fixture.id}
                  onPress={() => router.push(`/match/${fixture.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Manage fixture ${fixture.title}, ${fixture.slotsOpen} open slots, at ${fixture.groundName}`}
                  className="bg-white rounded-sm p-4 mb-3 border border-stone shadow-2xs active:bg-stone/10 active:scale-[0.99]"
                >
                  {/* Top Bar: Sport and Open Slot Status */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <ArenaBadge
                        label={fixture.sportLabel.toUpperCase()}
                        variant={fixture.sport === 'cricket' ? 'rust' : 'olive'}
                        size="sm"
                      />
                      <Text className="text-stone-muted text-[10px] font-mono ml-2">
                        {fixture.date} · {fixture.time}
                      </Text>
                    </View>

                    {/* Prominent Slot Vacancy Status */}
                    <ArenaBadge
                      label={slotPresentation.label}
                      variant={slotPresentation.badgeVariant}
                      size="sm"
                    />
                  </View>

                  {/* Fixture Title */}
                  <Text
                    numberOfLines={1}
                    className="text-graphite text-sm font-black uppercase tracking-tight mb-2"
                  >
                    {fixture.title}
                  </Text>

                  {/* Venue and Area */}
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="location-outline" size={13} color="#666B60" />
                    <Text
                      numberOfLines={1}
                      className="text-stone-muted text-xs font-medium ml-1 flex-1"
                    >
                      {fixture.groundName} · {fixture.area}
                    </Text>
                  </View>

                  {/* Capacity & Operational Status Bar */}
                  <View className="pt-2.5 border-t border-stone/30 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="people-outline" size={13} color="#3D4438" />
                      <Text className="text-graphite text-xs font-bold ml-1.5">
                        {confirmedCount}/{fixture.totalSlots} Players
                      </Text>
                      <Text className="text-stone-muted text-[10px] font-mono ml-1.5">
                        ({slotPresentation.label})
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <Text className="text-graphite text-[10px] font-black uppercase tracking-wider mr-1">
                        MANAGE
                      </Text>
                      <Ionicons name="chevron-forward" size={13} color="#242522" />
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
