import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { MatchFixtureCard } from '../../components/ui/MatchFixtureCard';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { IMAGES } from '../../constants/images';
import { MatchSlotItem } from '../../constants/matches';
import { useAuthStore } from '../../store/useAuthStore';
import { Sport } from '../../types';

type SportFilter = 'ALL' | 'CRICKET' | 'BADMINTON' | 'PADEL' | 'FOOTBALL';

const SPORT_FILTERS: { key: SportFilter; label: string }[] = [
  { key: 'ALL', label: 'All Sports' },
  { key: 'CRICKET', label: 'Cricket' },
  { key: 'BADMINTON', label: 'Badminton' },
  { key: 'PADEL', label: 'Padel' },
  { key: 'FOOTBALL', label: 'Football' },
];

const getSportIcon = (sport: Sport): 'cricket' | 'badminton' | 'tennis' | 'soccer' => {
  switch (sport) {
    case 'cricket':
      return 'cricket';
    case 'badminton':
      return 'badminton';
    case 'padel':
      return 'tennis';
    case 'football':
    default:
      return 'soccer';
  }
};

import { matchService } from '../../services/matchService';
import { useFocusEffect } from 'expo-router';

export default function DiscoverScreen() {
  const { currentUser } = useAuthStore();
  // Intentionally defaulted to Screen 06 LIST VIEW as the primary Discover state; Screen 05 MAP VIEW is the alternate state
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');
  const [activeSport, setActiveSport] = useState<SportFilter>('ALL');
  const [matches, setMatches] = useState<MatchSlotItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMapMatch, setSelectedMapMatch] = useState<MatchSlotItem | null>(null);

  const isMountedRef = React.useRef(true);

  const loadMatches = React.useCallback(async () => {
    try {
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }
      const data = await matchService.getMatches();
      if (isMountedRef.current) {
        setMatches(data || []);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn('[DiscoverScreen] Failed to load matches:', err);
        setError('Unable to sync match fixtures from server. Please check your connection.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      isMountedRef.current = true;
      loadMatches();
      return () => {
        isMountedRef.current = false;
      };
    }, [loadMatches])
  );

  const filteredMatches = matches.filter((m) => {
    if (activeSport === 'ALL') return true;
    return m.sport.toUpperCase() === activeSport;
  });

  // Featured urgent fixture: prioritized match with lowest slots open in active filter
  const featuredMatch: MatchSlotItem | null = filteredMatches.length > 0
    ? (filteredMatches.find((m) => m.slotsOpen <= 2) || filteredMatches[0])
    : null;

  // Keep selected map match in sync with active sport filters
  useEffect(() => {
    if (filteredMatches.length > 0) {
      if (!selectedMapMatch || !filteredMatches.some((m) => m.id === selectedMapMatch.id)) {
        setSelectedMapMatch(filteredMatches[0]);
      }
    } else {
      setSelectedMapMatch(null);
    }
  }, [activeSport, matches]);

  const handleMatchPress = (matchId: string) => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // Navigates dynamically to the actual fixture route: /match/[id] -> e.g. /match/m1
    router.push(`/match/${matchId}`);
  };

  const handleNotifications = () => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    router.push('/notifications');
  };

  const handleProfilePress = () => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    router.push('/(tabs)/profile');
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
      {/* Concrete Arena Header */}
      <ArenaHeader
        title="MAIDAAN"
        subtitle="LOCAL CIRCUIT // MATCH DISCOVERY"
        locationBadge="GULBERG, LAHORE"
        rightAction={
          <View className="flex-row items-center space-x-2">
            <Pressable
              onPress={handleNotifications}
              className="w-10 h-10 rounded-xl bg-warm-white border border-stone items-center justify-center mr-2 active:bg-stone-light"
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={19} color="#242522" />
            </Pressable>

            <Pressable
              onPress={handleProfilePress}
              className="w-10 h-10 rounded-xl bg-graphite border border-stone overflow-hidden items-center justify-center active:scale-95"
              accessibilityRole="button"
              accessibilityLabel="My Profile"
            >
              <Image source={IMAGES.arenaPlayer} className="w-full h-full object-cover" />
            </Pressable>
          </View>
        }
      />

      {/* Screen Mode & Filters Control Strip */}
      <View className="px-4 pt-3 pb-2.5 bg-warm-white border-b border-stone">
        {/* Segmented View Toggle: LIST VIEW vs MAP VIEW (Screens 05 & 06) */}
        <View className="flex-row p-1 rounded-xl bg-stone/25 border border-stone mb-2.5">
          <Pressable
            onPress={() => setViewMode('LIST')}
            accessibilityRole="tab"
            accessibilityState={{ selected: viewMode === 'LIST' }}
            accessibilityLabel="Switch to List View"
            className={`flex-1 py-2 rounded-lg flex-row items-center justify-center transition-all ${
              viewMode === 'LIST'
                ? 'bg-warm-white border border-stone shadow-xs'
                : 'bg-transparent'
            }`}
          >
            <Ionicons
              name="list"
              size={14}
              color={viewMode === 'LIST' ? '#242522' : '#666B60'}
            />
            <Text
              className={`text-xs font-black uppercase tracking-wider ml-1.5 ${
                viewMode === 'LIST' ? 'text-graphite' : 'text-stone-muted'
              }`}
            >
              LIST VIEW
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setViewMode('MAP')}
            accessibilityRole="tab"
            accessibilityState={{ selected: viewMode === 'MAP' }}
            accessibilityLabel="Switch to Map View"
            className={`flex-1 py-2 rounded-lg flex-row items-center justify-center transition-all ${
              viewMode === 'MAP'
                ? 'bg-warm-white border border-stone shadow-xs'
                : 'bg-transparent'
            }`}
          >
            <Ionicons
              name="map"
              size={14}
              color={viewMode === 'MAP' ? '#242522' : '#666B60'}
            />
            <Text
              className={`text-xs font-black uppercase tracking-wider ml-1.5 ${
                viewMode === 'MAP' ? 'text-graphite' : 'text-stone-muted'
              }`}
            >
              MAP VIEW
            </Text>
          </Pressable>
        </View>

        {/* 4 Supported Sports Horizontal Filter Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 10 }}
        >
          {SPORT_FILTERS.map((item) => {
            const isSelected = activeSport === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setActiveSport(item.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Filter sport: ${item.label}`}
                className={`px-3 py-1.5 rounded-lg mr-2 border transition-all ${
                  isSelected
                    ? 'bg-olive border-olive-dark shadow-xs'
                    : 'bg-warm-white border-stone active:bg-stone-light'
                }`}
              >
                <Text
                  className={`text-xs font-black uppercase tracking-wider ${
                    isSelected ? 'text-warm-white' : 'text-graphite'
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Body: Either LIST VIEW (Screen 06) or MAP VIEW (Screen 05) */}
      {viewMode === 'LIST' ? (
        /* SCREEN 06: DISCOVER LIST VIEW */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          className="flex-1"
        >
          {isLoading ? (
            /* Loading Treatment while fetching from API */
            <View className="px-4 pt-4 space-y-3">
              <SkeletonCard height={180} />
              <SkeletonCard height={120} />
              <SkeletonCard height={120} />
            </View>
          ) : error ? (
            /* Error / Retry Treatment */
            <View className="px-4 pt-6">
              <EmptyState
                title="FAILED TO SYNC FIXTURES"
                description={error}
                actionTitle="RETRY SYNC"
                onAction={loadMatches}
                iconName="cloud-offline-outline"
              />
            </View>
          ) : (
            <>
              {/* Featured Urgent Open-Slot Fixture Banner (When matches exist) */}
              {featuredMatch && (
                <View className="px-4 pt-4">
                  <Pressable
                    onPress={() => handleMatchPress(featuredMatch.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Featured match: ${featuredMatch.title}, ${featuredMatch.slotsOpen} slots open`}
                    className="w-full rounded-2xl overflow-hidden bg-graphite border border-surface-border-dark shadow-md active:opacity-95"
                  >
                    <View className="h-48 w-full relative">
                      <Image
                        source={IMAGES.arenaHome}
                        className="w-full h-full object-cover"
                        resizeMode="cover"
                      />
                      {/* Gritty Vignette & Stadium Lighting Mask */}
                      <View className="absolute inset-0 bg-graphite/50" />
                      <View className="absolute inset-0 bg-gradient-to-t from-graphite via-graphite/40 to-transparent" />

                      {/* Top Banner Tag */}
                      <View className="absolute top-3 left-4 right-4 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          {featuredMatch.slotsOpen === 1 ? (
                            <ArenaBadge label="LAST PLAYER NEEDED" variant="rust" />
                          ) : (
                            <ArenaBadge label="SQUAD REPLACEMENT NEEDED" variant="rust" />
                          )}
                          <Text className="text-stone text-[10px] font-bold uppercase tracking-wider ml-2">
                            {featuredMatch.sportLabel}
                          </Text>
                        </View>

                        <View className="bg-graphite/90 px-2.5 py-1 rounded-sm border border-stone/30">
                          <Text className="text-warm-white text-[11px] font-black uppercase">
                            {featuredMatch.date} • {featuredMatch.time.split(' - ')[0]}
                          </Text>
                        </View>
                      </View>

                      {/* Match Headliners */}
                      <View className="absolute bottom-3 left-4 right-4">
                        <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-widest mb-0.5">
                          FEATURED FIXTURE // {featuredMatch.groundName}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className="text-warm-white text-lg font-black uppercase tracking-tight"
                        >
                          {featuredMatch.title}
                        </Text>

                        <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-stone/20">
                          <View className="flex-row items-center flex-1 mr-2">
                            <Ionicons name="location-sharp" size={13} color="#D6D1C6" />
                            <Text
                              numberOfLines={1}
                              className="text-stone text-xs font-medium ml-1"
                            >
                              {featuredMatch.area}
                            </Text>
                          </View>

                          <View
                            className={`px-3 py-1 rounded-sm ${
                              featuredMatch.slotsOpen === 1 ? 'bg-rust' : 'bg-olive'
                            }`}
                          >
                            <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                              {featuredMatch.slotsOpen === 1
                                ? '1 SLOT LEFT'
                                : `${featuredMatch.slotsOpen} SLOTS OPEN`}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </View>
              )}

              {/* Section: Nearby Open Match Fixture Lineups */}
              <View className="px-4 pt-5">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Text className="text-graphite text-xs font-black uppercase tracking-wider">
                      NEARBY MATCHES & OPEN SLOTS
                    </Text>
                    <Text className="text-stone-muted text-xs font-bold ml-1.5">
                      ({filteredMatches.length})
                    </Text>
                  </View>

                  <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider">
                    LAHORE CIRCUIT
                  </Text>
                </View>

                {filteredMatches.length === 0 ? (
                  /* Empty State When Sport Filter Has 0 Matches */
                  <View className="p-8 rounded-xl bg-stone-light/50 border border-stone items-center justify-center my-4">
                    <View className="w-12 h-12 rounded-full bg-stone/40 items-center justify-center mb-2.5 border border-stone">
                      <Ionicons name="filter-outline" size={22} color="#666B60" />
                    </View>
                    <Text className="text-graphite text-sm font-black uppercase tracking-tight text-center">
                      NO FIXTURES ON THE BOARD
                    </Text>
                    <Text className="text-stone-muted text-xs text-center mt-1 max-w-[240px]">
                      {matches.length === 0
                        ? 'No open match fixtures are currently scheduled. Check back soon or create a fixture.'
                        : 'Try another sport or switch back to all fixtures.'}
                    </Text>
                    {activeSport !== 'ALL' && (
                      <Pressable
                        onPress={() => setActiveSport('ALL')}
                        className="mt-4 px-4 py-2 rounded-lg bg-olive active:opacity-90"
                      >
                        <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                          SHOW ALL FIXTURES
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  /* Concrete Arena Match Fixture Sheets */
                  <View className="space-y-3">
                    {filteredMatches.map((m) => (
                      <View key={m.id} className="mb-3">
                        <MatchFixtureCard
                          title={m.title}
                          sport={m.sportLabel}
                          sportIcon={getSportIcon(m.sport)}
                          date={m.date}
                          time={m.time}
                          groundName={m.groundName}
                          area={m.area}
                          slotsOpen={m.slotsOpen}
                          totalSlots={m.totalSlots}
                          skillLevel={m.skillLevel}
                          pricePerPlayer={m.feePerPlayer}
                          captainName={m.captainName}
                          onPress={() => handleMatchPress(m.id)}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        /* SCREEN 05: DISCOVER MAP VIEW (Completed State Preserved Exactly) */
        <View className="flex-1 relative bg-warm-white flex-col justify-between">
          {/* Tactical Schematic Canvas Area */}
          <View className="flex-1 relative overflow-hidden bg-[#E7E2D7]">
            {/* Architectural Grid & Circuit Line Motifs */}
            <View className="absolute inset-0">
              {/* Vertical sector grid guides */}
              <View className="absolute left-[20%] top-0 bottom-0 w-px bg-stone/50" />
              <View className="absolute left-[40%] top-0 bottom-0 w-px bg-stone/40 border-l border-dashed border-stone/60" />
              <View className="absolute left-[60%] top-0 bottom-0 w-px bg-stone/40 border-l border-dashed border-stone/60" />
              <View className="absolute left-[80%] top-0 bottom-0 w-px bg-stone/50" />

              {/* Horizontal sector grid guides */}
              <View className="absolute top-[25%] left-0 right-0 h-px bg-stone/50" />
              <View className="absolute top-[50%] left-0 right-0 h-px bg-stone/40 border-t border-dashed border-stone/60" />
              <View className="absolute top-[75%] left-0 right-0 h-px bg-stone/50" />

              {/* Faded Pitch & Crease Line Motifs */}
              <View className="absolute top-[18%] right-[12%] w-24 h-16 rounded-md border border-stone/40 opacity-40" />
              <View className="absolute top-[26%] right-[12%] w-24 h-px bg-stone/50 opacity-40" />
              <View className="absolute bottom-[22%] left-[10%] w-28 h-20 rounded-md border border-stone/40 opacity-40" />
              <View className="absolute bottom-[32%] left-[10%] w-28 h-px bg-stone/50 opacity-40" />
            </View>

            {/* Neighborhood District Schematics & Signage Labels */}
            <View className="absolute top-4 left-4 bg-warm-white/95 px-2.5 py-1 rounded-sm border border-stone shadow-xs z-10">
              <Text className="text-graphite text-[9px] font-black uppercase tracking-widest">
                CIRCUIT // LAHORE GROUNDS
              </Text>
              <Text className="text-stone-muted text-[10px] font-bold">
                {filteredMatches.length} Active Fixture {filteredMatches.length === 1 ? 'Location' : 'Locations'}
              </Text>
            </View>

            {/* Schematic Neighborhood Area Markers */}
            <View className="absolute top-[16%] left-[60%] opacity-55">
              <Text className="text-stone-muted text-[9px] font-black tracking-widest uppercase">
                [ CANTT SECTOR ]
              </Text>
              <Text className="text-stone-muted text-[8px] font-semibold">Garrison Sports Complex</Text>
            </View>

            <View className="absolute top-[32%] left-[38%] opacity-55">
              <Text className="text-stone-muted text-[9px] font-black tracking-widest uppercase">
                [ GULBERG CENTRAL ]
              </Text>
              <Text className="text-stone-muted text-[8px] font-semibold">Central Sports Nets</Text>
            </View>

            <View className="absolute top-[44%] left-[64%] opacity-55">
              <Text className="text-stone-muted text-[9px] font-black tracking-widest uppercase">
                [ DHA PHASE 5 ]
              </Text>
              <Text className="text-stone-muted text-[8px] font-semibold">Lahore Padel Club</Text>
            </View>

            <View className="absolute top-[52%] left-[18%] opacity-55">
              <Text className="text-stone-muted text-[9px] font-black tracking-widest uppercase">
                [ MODEL TOWN ]
              </Text>
              <Text className="text-stone-muted text-[8px] font-semibold">Football Turf Pitch 1</Text>
            </View>

            <View className="absolute top-[68%] left-[10%] opacity-55">
              <Text className="text-stone-muted text-[9px] font-black tracking-widest uppercase">
                [ JOHAR TOWN ]
              </Text>
              <Text className="text-stone-muted text-[8px] font-semibold">Arena Turf Grounds</Text>
            </View>

            {/* Interactive Match Markers on Schematic Canvas */}
            {!isLoading && !error && filteredMatches.map((match) => {
              const isSelected = selectedMapMatch?.id === match.id;
              const isUrgent = match.slotsOpen === 1;
              const iconName = getSportIcon(match.sport);
              const posX = typeof match.coordinates?.x === 'number' ? match.coordinates.x : 50;
              const posY = typeof match.coordinates?.y === 'number' ? match.coordinates.y : 50;

              return (
                <Pressable
                  key={match.id}
                  onPress={() => setSelectedMapMatch(match)}
                  accessibilityRole="button"
                  accessibilityLabel={`${match.sportLabel} match at ${match.groundName}, ${match.slotsOpen} slots open`}
                  style={{
                    position: 'absolute',
                    left: `${posX}%`,
                    top: `${posY}%`,
                  }}
                  className={`-ml-14 -mt-6 items-center z-20 ${
                    isSelected ? 'z-30 scale-105' : 'scale-100 opacity-95'
                  }`}
                >
                  {/* Tactical Marker Badge */}
                  <View
                    className={`flex-row items-center px-2.5 py-1.5 rounded-lg border ${
                      isSelected
                        ? 'bg-olive border-olive-dark shadow-md'
                        : isUrgent
                        ? 'bg-warm-white border-rust shadow-xs'
                        : 'bg-warm-white border-stone shadow-xs'
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={iconName}
                      size={14}
                      color={isSelected ? '#F4F1EA' : isUrgent ? '#C44529' : '#242522'}
                    />
                    <Text
                      className={`text-[10px] font-black uppercase tracking-wider ml-1.5 ${
                        isSelected
                          ? 'text-warm-white'
                          : isUrgent
                          ? 'text-rust'
                          : 'text-graphite'
                      }`}
                    >
                      {match.slotsOpen} {match.slotsOpen === 1 ? 'SLOT' : 'OPEN'}
                    </Text>
                  </View>

                  {/* Marker Pin Point Arrow */}
                  <View
                    className={`w-2.5 h-2.5 rotate-45 -mt-1.5 border-r border-b ${
                      isSelected
                        ? 'bg-olive border-olive-dark'
                        : isUrgent
                        ? 'bg-warm-white border-rust'
                        : 'bg-warm-white border-stone'
                    }`}
                  />
                </Pressable>
              );
            })}

            {/* Loading Overlay if fetching */}
            {isLoading && (
              <View className="absolute inset-0 bg-warm-white/80 items-center justify-center p-6 z-40">
                <View className="w-12 h-12 rounded-xl bg-stone/20 border border-stone items-center justify-center mb-3">
                  <Ionicons name="sync-outline" size={24} color="#3D4438" />
                </View>
                <Text className="text-graphite text-xs font-black uppercase tracking-wider">
                  SYNCING MAP FIXTURES...
                </Text>
              </View>
            )}

            {/* Error Overlay if sync fails */}
            {error && !isLoading && (
              <View className="absolute inset-0 bg-warm-white/95 items-center justify-center p-6 z-40">
                <View className="w-12 h-12 rounded-xl bg-rust/10 border border-rust/40 items-center justify-center mb-3">
                  <Ionicons name="cloud-offline-outline" size={24} color="#875646" />
                </View>
                <Text className="text-graphite text-sm font-black uppercase tracking-tight text-center">
                  CIRCUIT SYNC FAILED
                </Text>
                <Text className="text-stone-muted text-xs text-center mt-1 max-w-[240px]">
                  Unable to load fixtures for the map. Check your connection and retry.
                </Text>
                <Pressable
                  onPress={loadMatches}
                  className="mt-4 px-4 py-2 rounded-lg bg-olive active:opacity-90"
                >
                  <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                    RETRY SYNC
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Empty State Overlay if filtered matches is 0 */}
            {!isLoading && !error && filteredMatches.length === 0 && (
              <View className="absolute inset-0 bg-warm-white/90 items-center justify-center p-6 z-40">
                <View className="w-12 h-12 rounded-full bg-stone/30 items-center justify-center mb-3 border border-stone">
                  <Ionicons name="filter-outline" size={22} color="#666B60" />
                </View>
                <Text className="text-graphite text-sm font-black uppercase tracking-tight text-center">
                  NO FIXTURES ON THIS CIRCUIT
                </Text>
                <Text className="text-stone-muted text-xs text-center mt-1 max-w-[240px]">
                  {matches.length === 0
                    ? 'No open match fixtures are currently scheduled on the circuit.'
                    : 'No open match slots found for this sport filter. Try selecting another sport or view all circuit fixtures.'}
                </Text>
                {activeSport !== 'ALL' && (
                  <Pressable
                    onPress={() => setActiveSport('ALL')}
                    className="mt-4 px-4 py-2 rounded-lg bg-olive active:opacity-90"
                  >
                    <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                      SHOW ALL FIXTURES
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Selected Match Preview Sheet / Ticket Panel */}
          {!isLoading && !error && selectedMapMatch && (
            <View className="bg-warm-white border-t border-stone p-4 shadow-xl z-30">
              {/* Header Row: Sport Badge, Urgency, Date/Time */}
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center space-x-1.5">
                  <ArenaBadge
                    label={selectedMapMatch.sportLabel.toUpperCase()}
                    variant="stone"
                  />
                  <View className="ml-1.5">
                    {selectedMapMatch.slotsOpen === 1 ? (
                      <ArenaBadge label="1 SLOT LEFT" variant="rust" />
                    ) : (
                      <ArenaBadge
                        label={`${selectedMapMatch.slotsOpen} SLOTS OPEN`}
                        variant="olive"
                      />
                    )}
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={13} color="#666B60" />
                  <Text className="text-stone-muted text-xs font-bold ml-1">
                    {selectedMapMatch.date} • {selectedMapMatch.time}
                  </Text>
                </View>
              </View>

              {/* Match Title & Ground */}
              <Text
                numberOfLines={1}
                className="text-graphite text-base font-black uppercase tracking-tight"
              >
                {selectedMapMatch.title}
              </Text>

              <View className="flex-row items-center justify-between mt-1">
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons name="location-sharp" size={12} color="#666B60" />
                  <Text
                    numberOfLines={1}
                    className="text-stone-muted text-xs font-medium ml-1 flex-1"
                  >
                    {selectedMapMatch.groundName}
                  </Text>
                </View>

                {selectedMapMatch.skillLevel && (
                  <View className="px-2 py-0.5 rounded-sm bg-stone/25 border border-stone">
                    <Text className="text-graphite text-[10px] font-bold uppercase tracking-wider">
                      {selectedMapMatch.skillLevel}
                    </Text>
                  </View>
                )}
              </View>

              {/* Capacity and Action Button CTA */}
              <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-stone">
                <View>
                  <Text className="text-graphite text-xs font-black">
                    {selectedMapMatch.slotsOpen} of {selectedMapMatch.totalSlots} Slots Open
                  </Text>
                  {selectedMapMatch.feePerPlayer && (
                    <Text className="text-stone-muted text-[11px] font-medium">
                      {selectedMapMatch.feePerPlayer} / player
                    </Text>
                  )}
                </View>

                <Pressable
                  onPress={() => handleMatchPress(selectedMapMatch.id)}
                  accessibilityRole="button"
                  accessibilityLabel="View Match Details"
                  className="py-2.5 px-5 rounded-xl bg-olive border-b-[2px] border-olive-dark active:scale-[0.98] active:opacity-90 flex-row items-center"
                >
                  <Text className="text-warm-white text-xs font-black uppercase tracking-wider mr-1">
                    VIEW MATCH DETAILS
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color="#F4F1EA" />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
