import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { IMAGES } from '../../constants/images';
import { MatchSlotItem } from '../../constants/matches';
import { useAuthStore } from '../../store/useAuthStore';
import { Sport } from '../../types';
import { weatherService, WeatherOutlook } from '../../services/weatherService';
import { WeatherOutlookCard } from '../../components/ui/WeatherOutlookCard';
import { SpotProgressRing } from '../../components/ui/SpotProgressRing';
import { matchService } from '../../services/matchService';
import { joinRequestService } from '../../services/joinRequestService';
import { AmbientGlowOverlay } from '../../components/ui/AmbientCanvas';

const getSportPhoto = (sport: Sport) => {
  switch (sport) {
    case 'football':
      return IMAGES.arenaMatch;
    case 'cricket':
      return IMAGES.arenaGround;
    case 'padel':
      return IMAGES.arenaTeam;
    case 'badminton':
      return IMAGES.arenaOnboard;
    default:
      return IMAGES.arenaMatch;
  }
};

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

export default function MatchDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser, selectedRole } = useAuthStore();
  const currentRole = currentUser?.role || selectedRole || 'PLAYER';

  const [match, setMatch] = useState<MatchSlotItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherOutlook | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);

  const isMountedRef = React.useRef(true);

  const loadMatch = React.useCallback(async () => {
    if (!id || typeof id !== 'string' || !id.trim()) {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsNotFound(true);
        setError(null);
        setMatch(null);
      }
      return;
    }

    try {
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
        setIsNotFound(false);
      }
      const data = await matchService.getMatchById(id.trim());
      if (isMountedRef.current) {
        if (!data) {
          setIsNotFound(true);
          setMatch(null);
        } else {
          setMatch(data);
          setIsNotFound(false);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn('[MatchDetailsScreen] Error loading fixture:', err);
        setError('Unable to load match fixture details. Please check your connection.');
        setMatch(null);
        setIsNotFound(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [id]);

  React.useEffect(() => {
    isMountedRef.current = true;
    loadMatch();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadMatch]);

  React.useEffect(() => {
    if (!match) return;
    let isCancelled = false;

    const fetchWeather = async () => {
      try {
        setWeatherLoading(true);
        const data = await weatherService.getWeather({
          area: match.area,
          date: match.date,
          time: match.time,
          sport: match.sport,
        });
        if (!isCancelled) {
          setWeather(data);
        }
      } catch {
        // Non-critical: failure leaves weather as null / fallback
      } finally {
        if (!isCancelled) {
          setWeatherLoading(false);
        }
      }
    };

    fetchWeather();

    return () => {
      isCancelled = true;
    };
  }, [match?.id, match?.area, match?.date, match?.time, match?.sport]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/discover');
    }
  };

  const handleRequestJoin = async () => {
    if (!match || match.slotsOpen === 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const request = await joinRequestService.createJoinRequest(match.id);

      router.push({
        pathname: '/match/request-sent',
        params: {
          matchId: match.id,
          requestId: request.id,
        },
      });
    } catch (err: any) {
      console.warn('[MatchDetailsScreen] Request slot error:', err);
      setSubmitError(
        err?.message || 'Unable to submit join request. Please verify your connection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0C0D0E] items-center justify-center p-6" edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#E85D26" />
        <Text style={{ color: '#A0A5AD' }} className="text-[#A0A5AD] text-xs font-semibold uppercase tracking-wider mt-4">
          Loading Match Details...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-[#0C0D0E] items-center justify-center p-6" edges={['top', 'bottom']}>
        <View className="w-16 h-16 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 items-center justify-center mb-4">
          <Ionicons name="cloud-offline-outline" size={32} color="#EF4444" />
        </View>
        <Text style={{ color: '#FFFFFF' }} className="text-white text-xl font-bold tracking-tight text-center">
          Failed to Load Match
        </Text>
        <Text style={{ color: '#5C616A' }} className="text-[#5C616A] text-sm text-center mt-1.5 max-w-[280px]">
          {error}
        </Text>
        <View className="flex-row space-x-3 mt-6">
          <Pressable
            onPress={loadMatch}
            accessibilityRole="button"
            className="px-6 py-3 rounded-full bg-[#E85D26] active:scale-[0.98] mr-2"
          >
            <Text style={{ color: '#FFFFFF' }} className="text-white text-xs font-bold uppercase tracking-wider">
              Retry
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/(tabs)/discover')}
            accessibilityRole="button"
            className="px-6 py-3 rounded-full bg-[#141518] border border-white/[0.08] active:scale-[0.98]"
          >
            <Text style={{ color: '#FFFFFF' }} className="text-white text-xs font-bold uppercase tracking-wider">
              Back to Discover
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isNotFound || !match) {
    return (
      <SafeAreaView className="flex-1 bg-[#0C0D0E] items-center justify-center p-6" edges={['top', 'bottom']}>
        <View className="w-16 h-16 rounded-2xl bg-[#141518] border border-white/[0.08] items-center justify-center mb-4">
          <Ionicons name="alert-circle-outline" size={32} color="#A0A5AD" />
        </View>
        <Text style={{ color: '#FFFFFF' }} className="text-white text-xl font-bold tracking-tight text-center">
          Match Not Found
        </Text>
        <Text style={{ color: '#5C616A' }} className="text-[#5C616A] text-sm text-center mt-1.5 max-w-[280px]">
          This match is unavailable or may have been removed from the schedule.
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)/discover')}
          accessibilityRole="button"
          className="mt-6 px-6 py-3 rounded-full bg-[#E85D26] active:scale-[0.98]"
        >
          <Text style={{ color: '#FFFFFF' }} className="text-white text-xs font-bold uppercase tracking-wider">
            Back to Discover
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isCaptainOfMatch = Boolean(
    currentUser?.id && match.captainId && currentUser.id === match.captainId
  );
  const isMatchFull = match.slotsOpen === 0;
  const heroPhoto = getSportPhoto(match.sport);
  const filledSlots = match.totalSlots - match.slotsOpen;

  return (
    <SafeAreaView className="flex-1 bg-[#0C0D0E]" edges={['top']}>
      {/* Scrollable Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 125,
        }}
        className="flex-1"
      >
        {/* Cinematic Photographic Hero Section */}
        <View className="relative w-full h-72 bg-[#0C0D0E] overflow-hidden">
          <Image
            source={heroPhoto}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* Multi-stop Cinematic Vignette */}
          <View style={styles.heroTopVignette} pointerEvents="none" />
          <View style={styles.heroBottomFade} pointerEvents="none" />

          {/* Floating Back Navigation Chevron */}
          <View className="absolute top-3.5 left-5 z-20">
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
              className="w-10 h-10 rounded-full bg-[#1B1D22]/85 border border-white/[0.12] items-center justify-center active:bg-[#20232A] active:scale-95 shadow-md"
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Top-Right Sport Tag */}
          <View className="absolute top-3.5 right-5 z-20">
            <View className="px-3 py-1 rounded-full bg-[#141518]/90 border border-white/[0.12] flex-row items-center">
              <MaterialCommunityIcons
                name={getSportIcon(match.sport)}
                size={14}
                color="#E85D26"
                style={{ marginRight: 5 }}
              />
              <Text
                style={{ color: '#FFFFFF' }}
                className="text-white text-xs font-bold uppercase tracking-wider"
              >
                {match.sportLabel}
              </Text>
            </View>
          </View>

          {/* Hero Bottom Fixture Title & Location */}
          <View className="absolute bottom-4 left-5 right-5 z-10">
            <Text
              style={{ color: '#E85D26' }}
              className="text-[#E85D26] text-[10px] font-black uppercase tracking-widest mb-1"
            >
              CONFIRMED FIXTURE • {match.groundName}
            </Text>
            <Text
              numberOfLines={2}
              style={{ color: '#FFFFFF' }}
              className="text-white text-2xl font-black tracking-tight uppercase"
            >
              {match.title}
            </Text>

            <View className="flex-row items-center mt-2 pt-2 border-t border-white/[0.08]">
              <Ionicons name="time-outline" size={13} color="#A0A5AD" />
              <Text
                style={{ color: '#A0A5AD' }}
                className="text-[#A0A5AD] text-xs font-medium ml-1.5"
              >
                {match.date} • {match.time}
              </Text>
              <Text style={{ color: '#5C616A' }} className="text-[#5C616A] text-xs mx-2">•</Text>
              <Ionicons name="location-outline" size={13} color="#A0A5AD" />
              <Text
                numberOfLines={1}
                style={{ color: '#A0A5AD' }}
                className="text-[#A0A5AD] text-xs font-medium ml-1 flex-1"
              >
                {match.area}
              </Text>
            </View>
          </View>
        </View>

        {/* PROMINENT BENCHMARK ELEMENT: Glowing Circular Capacity Ring */}
        <View className="px-5 pt-6 pb-2 items-center">
          <AmbientGlowOverlay top={-20} size={240} opacity={0.14} />

          <View className="items-center justify-center relative">
            <SpotProgressRing
              slotsOpen={match.slotsOpen}
              totalSlots={match.totalSlots}
              size={124}
              strokeWidth={9}
              displayMode="filled"
              glow={true}
              progressColor="#E85D26"
              trackColor="rgba(255, 255, 255, 0.10)"
            />
          </View>

          <Text
            style={{ color: '#A0A5AD' }}
            className="text-[#A0A5AD] text-xs font-medium mt-3"
          >
            {match.slotsOpen > 0
              ? `${match.slotsOpen} open spots remaining for this fixture`
              : 'All spots currently filled'}
          </Text>
        </View>

        {/* Match Details & Context Cards */}
        <View className="px-5 pt-4 space-y-3.5">
          {/* Weather Outlook Card */}
          <WeatherOutlookCard
            weather={weather}
            loading={weatherLoading}
            timeContext={`${match.date} • ${match.time}`}
            sport={match.sport}
          />

          {/* Fixture Host / Organizer Card (Matching Benchmark Phone 2) */}
          <View className="bg-[#141518] border border-white/[0.08] rounded-2xl p-4 flex-row items-center justify-between shadow-sm">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-12 h-12 rounded-full bg-[#1B1D22] border border-[#E85D26]/40 items-center justify-center mr-3.5 shadow-sm">
                <Ionicons name="person" size={20} color="#E85D26" />
              </View>

              <View className="flex-1">
                <Text
                  style={{ color: '#5C616A' }}
                  className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider"
                >
                  Host by
                </Text>
                <Text
                  style={{ color: '#FFFFFF' }}
                  className="text-white text-base font-bold tracking-tight"
                >
                  {match.captainName || 'Alex K.'}
                </Text>
                <Text
                  style={{ color: '#A0A5AD' }}
                  className="text-[#A0A5AD] text-xs font-normal"
                >
                  {match.teamName || 'Squad Coordinator'}
                </Text>
              </View>
            </View>

            <View className="px-3 py-1 rounded-full bg-[#1B1D22] border border-white/[0.12]">
              <Text
                style={{ color: '#E85D26' }}
                className="text-[#E85D26] text-xs font-bold uppercase tracking-wider"
              >
                Host
              </Text>
            </View>
          </View>

          {/* Tactical Metadata Grid: Format, Skill Level, Fee */}
          <View className="flex-row space-x-2">
            <View className="flex-1 bg-[#141518] border border-white/[0.08] rounded-2xl p-3.5 mr-2">
              <Text
                style={{ color: '#5C616A' }}
                className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider"
              >
                Format
              </Text>
              <Text
                numberOfLines={1}
                style={{ color: '#FFFFFF' }}
                className="text-white text-sm font-bold uppercase mt-1"
              >
                {match.format || match.sportLabel}
              </Text>
              <Text
                style={{ color: '#5C616A' }}
                className="text-[#5C616A] text-[11px] font-normal mt-0.5"
              >
                {match.duration || '90 Mins'}
              </Text>
            </View>

            <View className="flex-1 bg-[#141518] border border-white/[0.08] rounded-2xl p-3.5 mr-2">
              <Text
                style={{ color: '#5C616A' }}
                className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider"
              >
                Skill Tier
              </Text>
              <Text
                style={{ color: '#E85D26' }}
                className="text-[#E85D26] text-sm font-bold uppercase mt-1"
              >
                {match.skillLevel}
              </Text>
              <Text
                style={{ color: '#5C616A' }}
                className="text-[#5C616A] text-[11px] font-normal mt-0.5"
              >
                Competitive
              </Text>
            </View>

            <View className="flex-1 bg-[#141518] border border-white/[0.08] rounded-2xl p-3.5">
              <Text
                style={{ color: '#5C616A' }}
                className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider"
              >
                Match Fee
              </Text>
              <Text
                numberOfLines={1}
                style={{ color: '#FFFFFF' }}
                className="text-white text-sm font-bold mt-1"
              >
                {match.feePerPlayer || 'Free'}
              </Text>
              <Text
                style={{ color: '#5C616A' }}
                className="text-[#5C616A] text-[11px] font-normal mt-0.5"
              >
                Per Player
              </Text>
            </View>
          </View>

          {/* Squad Roster Chips */}
          <View className="bg-[#141518] border border-white/[0.08] rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text
                style={{ color: '#FFFFFF' }}
                className="text-white text-sm font-bold uppercase tracking-wider"
              >
                Squad Roster ({filledSlots} / {match.totalSlots})
              </Text>
              <Text
                style={{ color: '#E85D26' }}
                className="text-[#E85D26] text-xs font-bold uppercase tracking-wider"
              >
                {match.slotsOpen} Open
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {match.confirmedPlayers && match.confirmedPlayers.length > 0 ? (
                match.confirmedPlayers.map((player) => (
                  <View
                    key={player.id}
                    className={`flex-row items-center px-3 py-1.5 rounded-xl border mr-2 mb-2 ${
                      player.isCaptain
                        ? 'bg-[#1B1D22] border-[#E85D26]/40'
                        : 'bg-[#141518] border-white/[0.08]'
                    }`}
                  >
                    <Ionicons
                      name={player.isCaptain ? 'star' : 'person'}
                      size={12}
                      color={player.isCaptain ? '#E85D26' : '#A0A5AD'}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={{ color: player.isCaptain ? '#FFFFFF' : '#A0A5AD' }}
                      className="text-xs font-semibold"
                    >
                      {player.name}
                    </Text>
                    {player.isCaptain && (
                      <Text
                        style={{ color: '#E85D26' }}
                        className="text-[#E85D26] text-[10px] font-bold uppercase ml-1"
                      >
                        (C)
                      </Text>
                    )}
                  </View>
                ))
              ) : null}

              {Array.from({ length: match.slotsOpen }).map((_, idx) => (
                <View
                  key={`open-slot-${idx}`}
                  className="flex-row items-center px-3 py-1.5 rounded-xl border border-dashed border-[#E85D26]/40 bg-[#E85D26]/10 mr-2 mb-2"
                >
                  <Ionicons name="add-circle" size={13} color="#E85D26" style={{ marginRight: 4 }} />
                  <Text
                    style={{ color: '#E85D26' }}
                    className="text-[#E85D26] text-xs font-bold uppercase tracking-wider"
                  >
                    Open Slot
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Fixture Notes */}
          <View className="bg-[#141518] border border-white/[0.08] rounded-2xl p-4 shadow-sm">
            <Text
              style={{ color: '#FFFFFF' }}
              className="text-white text-sm font-bold uppercase tracking-wider mb-2"
            >
              Fixture Notes
            </Text>
            <Text
              style={{ color: '#A0A5AD' }}
              className="text-[#A0A5AD] text-sm font-normal leading-relaxed"
            >
              {match.description || 'Standard competitive recreational match on local Lahore circuit.'}
            </Text>
            {match.venueNotes && (
              <View className="mt-3 pt-3 border-t border-white/[0.08] flex-row items-start">
                <Ionicons name="pin" size={14} color="#E85D26" style={{ marginTop: 2 }} />
                <Text
                  style={{ color: '#5C616A' }}
                  className="text-[#5C616A] text-xs font-normal ml-2 flex-1 leading-5"
                >
                  {match.venueNotes}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Docked Solar Orange Glowing CTA Bar (Phone 2 Benchmark) */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-[#0C0D0E]/95 border-t border-white/[0.08] px-5 pt-3.5 pb-4 shadow-2xl z-30"
        style={{
          paddingBottom: Math.max(insets.bottom, 16) + 6,
        }}
      >
        {isMatchFull ? (
          <View className="items-center py-2">
            <View className="w-full bg-[#1B1D22] border border-white/[0.08] py-3.5 rounded-full items-center justify-center">
              <Text
                style={{ color: '#5C616A' }}
                className="text-[#5C616A] text-sm font-bold uppercase tracking-wider"
              >
                Match Full — No Slots Open
              </Text>
            </View>
          </View>
        ) : isCaptainOfMatch ? (
          <View className="items-center py-1">
            <Pressable
              onPress={() => router.push('/captain/dashboard')}
              accessibilityRole="button"
              className="w-full bg-[#1B1D22] border-2 border-[#E85D26] py-3.5 rounded-full items-center justify-center active:scale-[0.98]"
            >
              <Text
                style={{ color: '#FFFFFF' }}
                className="text-white text-sm font-bold uppercase tracking-wider"
              >
                View Captain Dashboard
              </Text>
            </Pressable>
          </View>
        ) : currentRole !== 'PLAYER' ? (
          <View className="items-center py-1">
            <View className="w-full bg-[#141518] border border-white/[0.08] py-3.5 rounded-full items-center justify-center">
              <Text
                style={{ color: '#5C616A' }}
                className="text-[#5C616A] text-xs font-semibold uppercase tracking-wider"
              >
                Player account required to request a slot
              </Text>
            </View>
          </View>
        ) : (
          <View>
            {submitError && (
              <View className="mb-2 p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 rounded-xl">
                <Text
                  style={{ color: '#EF4444' }}
                  className="text-[#EF4444] text-xs font-medium text-center"
                >
                  {submitError}
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleRequestJoin}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Request to join match"
              className={`w-full min-h-[56px] py-4 px-6 rounded-full bg-[#E85D26] items-center justify-center flex-row shadow-lg shadow-[#E85D26]/35 active:bg-[#FF723A] active:scale-[0.98] ${
                isSubmitting ? 'opacity-80' : ''
              }`}
            >
              {isSubmitting ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text
                    style={{ color: '#FFFFFF' }}
                    className="text-white text-sm font-extrabold uppercase tracking-wider ml-2"
                  >
                    Sending Request...
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text
                    style={{ color: '#FFFFFF' }}
                    className="text-white text-base font-extrabold uppercase tracking-wider mr-1.5"
                  >
                    Request to Join
                  </Text>
                  <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroTopVignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(12, 13, 14, 0.76)',
  },
  heroBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
    backgroundColor: '#0C0D0E',
    opacity: 0.98,
  },
});
