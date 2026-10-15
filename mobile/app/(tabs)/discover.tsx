import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MatchFixtureCard } from '../../components/ui/MatchFixtureCard';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { IMAGES } from '../../constants/images';
import { MatchSlotItem } from '../../constants/matches';
import { useAuthStore } from '../../store/useAuthStore';
import { Sport } from '../../types';
import { weatherService, WeatherOutlook } from '../../services/weatherService';
import { WeatherCompactBar } from '../../components/ui/WeatherCompactBar';
import { matchService } from '../../services/matchService';
import { AmbientGlowOverlay } from '../../components/ui/AmbientCanvas';

type SportFilter = 'ALL' | 'CRICKET' | 'BADMINTON' | 'PADEL' | 'FOOTBALL';

interface SportFilterConfig {
  key: SportFilter;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const SPORT_FILTERS: SportFilterConfig[] = [
  { key: 'ALL', label: 'All Sports', icon: 'trophy-outline' },
  { key: 'CRICKET', label: 'Cricket', icon: 'cricket' },
  { key: 'FOOTBALL', label: 'Football', icon: 'soccer' },
  { key: 'PADEL', label: 'Padel', icon: 'tennis' },
  { key: 'BADMINTON', label: 'Badminton', icon: 'badminton' },
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

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');
  const [activeSport, setActiveSport] = useState<SportFilter>('ALL');
  const [matches, setMatches] = useState<MatchSlotItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMapMatch, setSelectedMapMatch] = useState<MatchSlotItem | null>(null);
  const [weather, setWeather] = useState<WeatherOutlook | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);

  const isMountedRef = React.useRef(true);

  const loadWeather = React.useCallback(async () => {
    try {
      if (isMountedRef.current) setWeatherLoading(true);
      const data = await weatherService.getWeather({
        area: 'Lahore',
        sport: activeSport !== 'ALL' ? activeSport.toLowerCase() : undefined,
      });
      if (isMountedRef.current) {
        setWeather(data);
      }
    } catch {
      // Non-critical: leaves weather state null, fallback rendered gracefully
    } finally {
      if (isMountedRef.current) {
        setWeatherLoading(false);
      }
    }
  }, [activeSport]);

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
      loadWeather();
      return () => {
        isMountedRef.current = false;
      };
    }, [loadMatches, loadWeather])
  );

  const filteredMatches = matches.filter((m) => {
    if (activeSport === 'ALL') return true;
    return m.sport.toUpperCase() === activeSport;
  });

  const featuredMatch: MatchSlotItem | null =
    filteredMatches.length > 0
      ? filteredMatches.find((m) => m.slotsOpen <= 2) || filteredMatches[0]
      : null;

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
    <SafeAreaView className="flex-1 bg-[#0C0D0E]" edges={['top']}>
      {/* Cinematic Top Section: Heading + Integrated Sports Photography */}
      <View className="relative bg-[#0C0D0E] border-b border-white/[0.08] overflow-hidden">
        {/* Subtle Ambient Stadium Bloom */}
        <AmbientGlowOverlay top={-40} right={-30} size={260} opacity={0.12} />

        {/* Top Action Bar */}
        <View className="px-5 pt-3 pb-2 flex-row items-center justify-between z-10">
          {/* Location Badge */}
          <View className="flex-row items-center bg-[#141518] px-3 py-1.5 rounded-full border border-white/[0.08]">
            <Ionicons name="location-sharp" size={12} color="#E85D26" />
            <Text
              style={{ color: '#FFFFFF' }}
              className="text-white text-xs font-bold ml-1 tracking-tight"
            >
              Lahore, PK
            </Text>
          </View>

          {/* Quick Actions (Notifications & Profile) */}
          <View className="flex-row items-center space-x-2">
            <Pressable
              onPress={handleNotifications}
              className="w-9 h-9 rounded-xl bg-[#1B1D22] border border-white/[0.08] items-center justify-center mr-2 active:bg-[#22252B]"
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={17} color="#FFFFFF" />
            </Pressable>

            <Pressable
              onPress={handleProfilePress}
              className="w-9 h-9 rounded-xl bg-[#1B1D22] border border-white/[0.12] items-center justify-center active:scale-95 overflow-hidden"
              accessibilityRole="button"
              accessibilityLabel="My Profile"
            >
              <View className="w-full h-full items-center justify-center bg-[#E85D26]/15">
                <Ionicons name="person" size={16} color="#E85D26" />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Athletic Headline & Hero Integration Area */}
        <View className="px-5 pt-2 pb-4 flex-row items-end justify-between z-10">
          <View className="flex-1 pr-3">
            <Text
              style={{ color: '#E85D26' }}
              className="text-[#E85D26] text-[10px] font-black uppercase tracking-widest mb-0.5"
            >
              RECREATIONAL MATCHMAKING
            </Text>
            <Text
              style={{ color: '#FFFFFF' }}
              className="text-white text-3xl font-black tracking-tight leading-[1.05] uppercase"
            >
              Find{'\n'}Your{'\n'}Match
            </Text>
          </View>

          {/* Dynamic Live Circuit Beacon Card */}
          <View className="px-4 py-3 rounded-2xl border border-white/[0.10] bg-[#141518] items-center justify-center min-w-[104px] shadow-sm">
            <View className="flex-row items-center mb-1">
              <View className="w-2 h-2 rounded-full bg-[#E85D26] mr-1.5" />
              <Text
                style={{ color: '#E85D26' }}
                className="text-[#E85D26] text-[10px] font-black uppercase tracking-wider"
              >
                LIVE
              </Text>
            </View>
            <Text
              style={{ color: '#FFFFFF' }}
              className="text-white text-xl font-black tracking-tight"
            >
              {filteredMatches.length}
            </Text>
            <Text
              style={{ color: '#A0A5AD' }}
              className="text-[#A0A5AD] text-[9px] font-bold uppercase tracking-wider mt-0.5"
            >
              Fixtures
            </Text>
          </View>
        </View>

        {/* Compact Weather Summary Bar */}
        <View className="px-5 pb-3">
          <WeatherCompactBar weather={weather} loading={weatherLoading} />
        </View>

        {/* Horizontal Sport Discipline Selector Pills */}
        <View className="pb-3.5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
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
                  className={`flex-row items-center py-2 px-3.5 rounded-2xl mr-2.5 border transition-all ${
                    isSelected
                      ? 'bg-[#1B1D22] border-2 border-[#E85D26] shadow-sm shadow-[#E85D26]/25'
                      : 'bg-[#141518] border border-white/[0.08] active:bg-[#1B1D22]'
                  }`}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={16}
                    color={isSelected ? '#E85D26' : '#A0A5AD'}
                  />
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : '#A0A5AD',
                    }}
                    className={`text-xs font-bold ml-2 tracking-wide ${
                      isSelected ? 'text-white font-extrabold' : 'text-[#A0A5AD]'
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Segmented View Toggle: LIST VIEW vs MAP VIEW */}
        <View className="px-5 pb-3">
          <View className="flex-row p-1 rounded-xl bg-[#141518] border border-white/[0.08]">
            <Pressable
              onPress={() => setViewMode('LIST')}
              accessibilityRole="tab"
              accessibilityState={{ selected: viewMode === 'LIST' }}
              accessibilityLabel="Switch to List View"
              className={`flex-1 py-1.5 rounded-lg flex-row items-center justify-center transition-all ${
                viewMode === 'LIST'
                  ? 'bg-[#1B1D22] border border-white/[0.12] shadow-xs'
                  : 'bg-transparent'
              }`}
            >
              <Ionicons
                name="list"
                size={14}
                color={viewMode === 'LIST' ? '#E85D26' : '#5C616A'}
              />
              <Text
                style={{ color: viewMode === 'LIST' ? '#FFFFFF' : '#5C616A' }}
                className={`text-xs font-bold uppercase tracking-wider ml-1.5 ${
                  viewMode === 'LIST' ? 'text-white font-extrabold' : 'text-[#5C616A]'
                }`}
              >
                List View
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setViewMode('MAP')}
              accessibilityRole="tab"
              accessibilityState={{ selected: viewMode === 'MAP' }}
              accessibilityLabel="Switch to Map View"
              className={`flex-1 py-1.5 rounded-lg flex-row items-center justify-center transition-all ${
                viewMode === 'MAP'
                  ? 'bg-[#1B1D22] border border-white/[0.12] shadow-xs'
                  : 'bg-transparent'
              }`}
            >
              <Ionicons
                name="map"
                size={14}
                color={viewMode === 'MAP' ? '#E85D26' : '#5C616A'}
              />
              <Text
                style={{ color: viewMode === 'MAP' ? '#FFFFFF' : '#5C616A' }}
                className={`text-xs font-bold uppercase tracking-wider ml-1.5 ${
                  viewMode === 'MAP' ? 'text-white font-extrabold' : 'text-[#5C616A]'
                }`}
              >
                Map View
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      {viewMode === 'LIST' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 16) + 40,
          }}
          className="flex-1"
        >
          {isLoading ? (
            <View className="px-5 pt-4 space-y-3">
              <SkeletonCard height={160} />
              <SkeletonCard height={110} />
              <SkeletonCard height={110} />
            </View>
          ) : error ? (
            <View className="px-5 pt-6">
              <EmptyState
                title="Failed to Sync Matches"
                description={error}
                actionTitle="Retry Sync"
                onAction={loadMatches}
                iconName="cloud-offline-outline"
              />
            </View>
          ) : (
            <>
              {/* Local Matches Section Header */}
              <View className="px-5 pt-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Text
                      style={{ color: '#FFFFFF' }}
                      className="text-white text-sm font-bold uppercase tracking-wider"
                    >
                      Local matches
                    </Text>
                    <Text
                      style={{ color: '#E85D26' }}
                      className="text-[#E85D26] text-xs font-bold ml-1.5"
                    >
                      ({filteredMatches.length})
                    </Text>
                  </View>

                  <Text
                    style={{ color: '#5C616A' }}
                    className="text-[#5C616A] text-xs font-bold uppercase tracking-wider"
                  >
                    Lahore
                  </Text>
                </View>

                {filteredMatches.length === 0 ? (
                  <View className="p-8 rounded-2xl bg-[#141518] border border-white/[0.08] items-center justify-center my-4">
                    <View className="w-12 h-12 rounded-full bg-[#1B1D22] items-center justify-center mb-3 border border-white/[0.08]">
                      <Ionicons name="filter-outline" size={22} color="#A0A5AD" />
                    </View>
                    <Text
                      style={{ color: '#FFFFFF' }}
                      className="text-white text-base font-bold tracking-tight text-center"
                    >
                      No Matches Found
                    </Text>
                    <Text
                      style={{ color: '#5C616A' }}
                      className="text-[#5C616A] text-xs text-center mt-1 max-w-[240px]"
                    >
                      {matches.length === 0
                        ? 'No open match fixtures are currently scheduled. Check back soon.'
                        : 'Try another sport filter or show all matches.'}
                    </Text>
                    {activeSport !== 'ALL' && (
                      <Pressable
                        onPress={() => setActiveSport('ALL')}
                        className="mt-4 px-4 py-2 rounded-xl bg-[#E85D26] active:opacity-90"
                      >
                        <Text
                          style={{ color: '#FFFFFF' }}
                          className="text-white text-xs font-bold uppercase tracking-wider"
                        >
                          Show All Matches
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {filteredMatches.map((m, index) => (
                      <MatchFixtureCard
                        key={m.id}
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
                        isFeatured={index === 0 && m.slotsOpen <= 2}
                        onPress={() => handleMatchPress(m.id)}
                      />
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        /* SCREEN 05: MAP VIEW (STAGE 2 REFINEMENT) */
        <View className="flex-1 relative bg-[#0C0D0E] flex-col justify-between">
          <View className="flex-1 relative overflow-hidden bg-[#0C0D0E]">
            {/* Tactical Grid Guides & Crease Line Motifs */}
            <View className="absolute inset-0" pointerEvents="none">
              <View className="absolute left-[20%] top-0 bottom-0 w-px bg-white/[0.04]" />
              <View className="absolute left-[50%] top-0 bottom-0 w-px bg-white/[0.04] border-l border-dashed border-white/[0.08]" />
              <View className="absolute left-[80%] top-0 bottom-0 w-px bg-white/[0.04]" />
              <View className="absolute top-[25%] left-0 right-0 h-px bg-white/[0.04]" />
              <View className="absolute top-[55%] left-0 right-0 h-px bg-white/[0.04] border-t border-dashed border-white/[0.08]" />
              <View className="absolute top-[80%] left-0 right-0 h-px bg-white/[0.04]" />

              {/* Faded Pitch & Crease Line Motifs */}
              <View className="absolute top-[18%] right-[12%] w-24 h-16 rounded-md border border-[#E85D26]/10 opacity-30" />
              <View className="absolute bottom-[28%] left-[10%] w-28 h-20 rounded-md border border-[#E85D26]/10 opacity-30" />
            </View>

            {/* Tactical Schematic View Indicator Badge */}
            <View className="absolute top-3.5 left-4 bg-[#141518]/95 px-3 py-1.5 rounded-xl border border-white/[0.08] shadow-sm z-10">
              <View className="flex-row items-center gap-1.5">
                <View className="w-1.5 h-1.5 rounded-full bg-[#E85D26]" />
                <Text
                  style={{ color: '#E85D26' }}
                  className="text-[#E85D26] text-[10px] font-black uppercase tracking-wider"
                >
                  SCHEMATIC VIEW
                </Text>
              </View>
              <Text
                style={{ color: '#A0A5AD' }}
                className="text-[#A0A5AD] text-[10px] font-medium mt-0.5"
              >
                {filteredMatches.length} Active {filteredMatches.length === 1 ? 'Fixture' : 'Fixtures'} · Circuit Map
              </Text>
            </View>

            {/* Floating Map Re-center Action (44x44px accessible touch target) */}
            <Pressable
              onPress={() => {
                if (filteredMatches.length > 0) {
                  setSelectedMapMatch(filteredMatches[0]);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Re-center map"
              className="absolute top-3.5 right-4 w-11 h-11 rounded-xl bg-[#141518]/90 border border-white/[0.12] items-center justify-center active:bg-[#1B1D22] shadow-md z-10"
            >
              <Ionicons name="locate-outline" size={20} color="#E85D26" />
            </Pressable>

            {/* Schematic District Area Markers */}
            <View className="absolute top-[15%] left-[58%] opacity-50 px-2 py-1 rounded bg-[#141518]/60">
              <Text style={{ color: '#5C616A' }} className="text-[10px] font-bold tracking-wider uppercase">
                Cantt Sector
              </Text>
            </View>
            <View className="absolute top-[32%] left-[32%] opacity-50 px-2 py-1 rounded bg-[#141518]/60">
              <Text style={{ color: '#5C616A' }} className="text-[10px] font-bold tracking-wider uppercase">
                Gulberg Central
              </Text>
            </View>
            <View className="absolute top-[46%] left-[62%] opacity-50 px-2 py-1 rounded bg-[#141518]/60">
              <Text style={{ color: '#5C616A' }} className="text-[10px] font-bold tracking-wider uppercase">
                DHA Phase 5
              </Text>
            </View>
            <View className="absolute top-[56%] left-[16%] opacity-50 px-2 py-1 rounded bg-[#141518]/60">
              <Text style={{ color: '#5C616A' }} className="text-[10px] font-bold tracking-wider uppercase">
                Model Town
              </Text>
            </View>
            <View className="absolute top-[72%] left-[12%] opacity-50 px-2 py-1 rounded bg-[#141518]/60">
              <Text style={{ color: '#5C616A' }} className="text-[10px] font-bold tracking-wider uppercase">
                Johar Town
              </Text>
            </View>

            {/* Interactive Map Markers with Accessible >=44px Touch Targets */}
            {!isLoading && !error && filteredMatches.map((match, index) => {
              const isSelected = selectedMapMatch?.id === match.id;
              const isUrgent = match.slotsOpen === 1;
              const iconName = getSportIcon(match.sport);
              const sectorCoordinates = [
                { x: 64, y: 24 }, // Cantt Sector
                { x: 36, y: 38 }, // Gulberg Central
                { x: 68, y: 52 }, // DHA Phase 5
                { x: 26, y: 64 }, // Model Town
                { x: 22, y: 78 }, // Johar Town
                { x: 52, y: 32 }, // Central
                { x: 44, y: 70 }, // Southern
                { x: 74, y: 36 }, // Eastern
              ];
              const fallbackPos = sectorCoordinates[index % sectorCoordinates.length];
              const posX = typeof match.coordinates?.x === 'number' ? match.coordinates.x : fallbackPos.x;
              const posY = typeof match.coordinates?.y === 'number' ? match.coordinates.y : fallbackPos.y;

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
                    minWidth: 44,
                    minHeight: 44,
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className={`-ml-14 -mt-6 items-center justify-center z-20 ${
                    isSelected ? 'z-30 scale-110' : 'scale-100 opacity-95'
                  }`}
                >
                  <View
                    className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                      isSelected
                        ? 'bg-[#E85D26] border-[#E85D26] shadow-lg shadow-[#E85D26]/40'
                        : isUrgent
                        ? 'bg-[#F59E0B] border-[#F59E0B] shadow-sm'
                        : 'bg-[#141518] border-white/[0.12] shadow-sm'
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={iconName}
                      size={14}
                      color="#FFFFFF"
                    />
                    <Text
                      style={{ color: '#FFFFFF' }}
                      className="text-white text-[11px] font-bold tracking-wider ml-1.5"
                    >
                      {match.slotsOpen} {match.slotsOpen === 1 ? 'Slot' : 'Open'}
                    </Text>
                  </View>
                  <View
                    className={`w-2.5 h-2.5 rotate-45 -mt-1.5 border-r border-b ${
                      isSelected
                        ? 'bg-[#E85D26] border-[#E85D26]'
                        : isUrgent
                        ? 'bg-[#F59E0B] border-[#F59E0B]'
                        : 'bg-[#141518] border-white/[0.12]'
                    }`}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* Compact Dismissible Bottom Match Preview Card */}
          {!isLoading && !error && selectedMapMatch ? (
            <View
              className="absolute bottom-3 left-4 right-4 bg-[#141518] border border-white/[0.12] rounded-2xl p-3.5 shadow-2xl z-30"
              style={{
                marginBottom: Math.max(insets.bottom, 6),
              }}
            >
              {/* Header: Sport Badge + Spots Pill + Dismiss Button */}
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="px-2 py-0.5 rounded-md bg-[#1B1D22] border border-white/[0.08] mr-2">
                    <Text
                      style={{ color: '#E85D26' }}
                      className="text-[#E85D26] text-[10px] font-black uppercase tracking-wider"
                    >
                      {selectedMapMatch.sportLabel}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{ color: '#A0A5AD' }}
                    className="text-[#A0A5AD] text-xs font-medium flex-1"
                  >
                    {selectedMapMatch.time} • {selectedMapMatch.date}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <View
                    className={`px-2 py-0.5 rounded-full border mr-2 ${
                      selectedMapMatch.slotsOpen === 1
                        ? 'bg-[#F59E0B]/15 border-[#F59E0B]/40'
                        : 'bg-[#E85D26]/15 border-[#E85D26]/40'
                    }`}
                  >
                    <Text
                      style={{
                        color: selectedMapMatch.slotsOpen === 1 ? '#F59E0B' : '#E85D26',
                      }}
                      className="text-[10px] font-bold uppercase tracking-tight"
                    >
                      {selectedMapMatch.slotsOpen === 1 ? '1 slot' : `${selectedMapMatch.slotsOpen} open`}
                    </Text>
                  </View>

                  {/* Dismiss Close Action */}
                  <Pressable
                    onPress={() => setSelectedMapMatch(null)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss fixture preview"
                    className="w-6 h-6 rounded-full bg-[#1B1D22] border border-white/[0.12] items-center justify-center active:bg-[#252830]"
                  >
                    <Ionicons name="close" size={13} color="#A0A5AD" />
                  </Pressable>
                </View>
              </View>

              {/* Title & Ground Location */}
              <Text
                numberOfLines={1}
                style={{ color: '#FFFFFF' }}
                className="text-white text-sm font-bold tracking-tight"
              >
                {selectedMapMatch.title}
              </Text>

              {/* Bottom Row: Location & Compact CTA */}
              <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-white/[0.06]">
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons name="location-outline" size={12} color="#5C616A" />
                  <Text
                    numberOfLines={1}
                    style={{ color: '#A0A5AD' }}
                    className="text-[#A0A5AD] text-xs font-normal ml-1 flex-1"
                  >
                    {selectedMapMatch.groundName}
                  </Text>
                </View>

                <Pressable
                  onPress={() => handleMatchPress(selectedMapMatch.id)}
                  accessibilityRole="button"
                  accessibilityLabel="View Match Details"
                  className="px-4 py-1.5 rounded-full bg-[#E85D26] active:scale-[0.98] active:bg-[#FF723A] flex-row items-center justify-center shadow-sm"
                >
                  <Text
                    style={{ color: '#FFFFFF' }}
                    className="text-white text-xs font-bold uppercase tracking-wider mr-1"
                  >
                    View
                  </Text>
                  <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          ) : (
            /* Map Hint Pill when no fixture is active */
            <View
              className="absolute bottom-4 self-center bg-[#141518]/90 border border-white/[0.10] px-4 py-2 rounded-full flex-row items-center shadow-lg pointer-events-none"
              style={{
                marginBottom: Math.max(insets.bottom, 6),
              }}
            >
              <Ionicons name="map-outline" size={13} color="#E85D26" style={{ marginRight: 6 }} />
              <Text style={{ color: '#A0A5AD' }} className="text-xs font-medium">
                Tap any fixture pin to preview details
              </Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  thumbVignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(12, 13, 14, 0.40)',
  },
});
