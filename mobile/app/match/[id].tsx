import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { IMAGES } from '../../constants/images';
import { MatchSlotItem } from '../../constants/matches';
import { useAuthStore } from '../../store/useAuthStore';
import { Sport } from '../../types';

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

import { matchService } from '../../services/matchService';
import { joinRequestService } from '../../services/joinRequestService';

export default function MatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser, selectedRole } = useAuthStore();
  const currentRole = currentUser?.role || selectedRole || 'PLAYER';

  const [match, setMatch] = useState<MatchSlotItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSentNotice, setRequestSentNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);

  // Fetch match by ID from backend via matchService
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

      // Navigate only upon real API success
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

  // Loading State
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
        <ArenaHeader
          title="MATCH FIXTURE"
          subtitle="CIRCUIT LINEUP // SCREEN 07"
          showBack
          onBack={handleBack}
        />
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color="#1A1C19" />
          <Text className="text-stone text-xs font-black uppercase tracking-widest mt-4">
            LOADING FIXTURE DETAILS...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error State with Retry
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
        <ArenaHeader
          title="MATCH FIXTURE"
          subtitle="CIRCUIT LINEUP // SCREEN 07"
          showBack
          onBack={handleBack}
        />
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-16 h-16 rounded-full bg-rust/10 border border-rust/40 items-center justify-center mb-4">
            <Ionicons name="cloud-offline-outline" size={32} color="#875646" />
          </View>
          <Text className="text-graphite text-lg font-black uppercase tracking-tight text-center">
            FAILED TO LOAD FIXTURE
          </Text>
          <Text className="text-stone-muted text-sm text-center mt-1.5 max-w-[280px]">
            {error}
          </Text>
          <View className="flex-row space-x-3 mt-6">
            <Pressable
              onPress={loadMatch}
              accessibilityRole="button"
              accessibilityLabel="Retry Loading Match"
              className="px-6 py-3 rounded-xl bg-olive border-b-[3px] border-olive-dark active:scale-[0.98] mr-2"
            >
              <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                RETRY
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/(tabs)/discover')}
              accessibilityRole="button"
              accessibilityLabel="Back to Discover"
              className="px-6 py-3 rounded-xl bg-stone/20 border border-stone active:scale-[0.98]"
            >
              <Text className="text-graphite text-xs font-black uppercase tracking-wider">
                BACK TO DISCOVER
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Match Not Found State (404)
  if (isNotFound || !match) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
        <ArenaHeader
          title="MATCH FIXTURE"
          subtitle="CIRCUIT LINEUP // SCREEN 07"
          showBack
          onBack={handleBack}
        />
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-16 h-16 rounded-full bg-stone/30 border border-stone items-center justify-center mb-4">
            <Ionicons name="alert-circle-outline" size={32} color="#666B60" />
          </View>
          <Text className="text-graphite text-lg font-black uppercase tracking-tight text-center">
            MATCH NOT FOUND
          </Text>
          <Text className="text-stone-muted text-sm text-center mt-1.5 max-w-[280px]">
            This match fixture is unavailable or may have been removed from the circuit board.
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)/discover')}
            accessibilityRole="button"
            accessibilityLabel="Back to Discover"
            className="mt-6 px-6 py-3 rounded-xl bg-olive border-b-[3px] border-olive-dark active:scale-[0.98]"
          >
            <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
              BACK TO DISCOVER
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isCaptainOfMatch = Boolean(
    currentUser?.id && match.captainId && currentUser.id === match.captainId
  );
  const isMatchFull = match.slotsOpen === 0;
  const isUrgent = match.slotsOpen === 1;
  const sportIconName = getSportIcon(match.sport);
  const heroPhoto = getSportPhoto(match.sport);

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
      {/* Concrete Arena Header */}
      <ArenaHeader
        title="MATCH FIXTURE"
        subtitle="CIRCUIT LINEUP // SCREEN 07"
        showBack
        onBack={handleBack}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        className="flex-1"
      >
        {/* Documentary Photography Hero Section */}
        <View className="relative w-full h-64 bg-graphite overflow-hidden border-b border-stone">
          <Image
            source={heroPhoto}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* Gritty Stadium Floodlight Vignette Mask */}
          <View className="absolute inset-0 bg-graphite/45" />
          <View className="absolute inset-0 bg-gradient-to-t from-graphite via-graphite/50 to-transparent" />

          {/* Top Badges Row */}
          <View className="absolute top-3.5 left-4 right-4 flex-row items-center justify-between">
            <View className="flex-row items-center bg-graphite/90 px-2.5 py-1 rounded-sm border border-stone/30">
              <MaterialCommunityIcons
                name={sportIconName}
                size={14}
                color="#F4F1EA"
                style={{ marginRight: 5 }}
              />
              <Text className="text-warm-white text-[10px] font-black uppercase tracking-wider">
                {match.sportLabel}
              </Text>
            </View>

            {isMatchFull ? (
              <ArenaBadge label="MATCH FULL" variant="rust" />
            ) : isUrgent ? (
              <ArenaBadge label="1 SLOT LEFT" variant="rust" />
            ) : (
              <ArenaBadge
                label={`${match.slotsOpen} SLOTS OPEN`}
                variant="olive"
              />
            )}
          </View>

          {/* Match Identity Bottom Text */}
          <View className="absolute bottom-4 left-4 right-4">
            <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-widest mb-0.5">
              MATCH DAY // OPEN FIXTURE
            </Text>
            <Text
              numberOfLines={2}
              className="text-warm-white text-2xl font-black uppercase tracking-tight"
            >
              {match.title}
            </Text>

            <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-stone/20">
              <View className="flex-row items-center flex-1 mr-2">
                <Ionicons name="time-outline" size={13} color="#D6D1C6" />
                <Text className="text-stone text-xs font-semibold ml-1.5">
                  {match.date} • {match.time}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Ionicons name="location-sharp" size={13} color="#D6D1C6" />
                <Text
                  numberOfLines={1}
                  className="text-stone text-xs font-medium ml-1 max-w-[130px]"
                >
                  {match.area}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Temporary Notification Notice */}
        {requestSentNotice && (
          <View className="mx-4 mt-3 p-3 bg-graphite rounded-lg border border-stone/30 flex-row items-center">
            <Ionicons name="information-circle" size={16} color="#F4F1EA" />
            <Text className="text-warm-white text-xs font-medium ml-2 flex-1">
              {requestSentNotice}
            </Text>
          </View>
        )}

        {/* Body Content Container */}
        <View className="px-4 pt-4 space-y-4">
          {/* Tactical Scoreboard Information Cards */}
          <View className="flex-row space-x-2">
            {/* Format Card */}
            <View className="flex-1 bg-warm-white border border-stone rounded-xl p-3 mr-2 shadow-xs">
              <Text className="text-stone-muted text-[9px] font-black uppercase tracking-wider">
                FORMAT
              </Text>
              <Text numberOfLines={1} className="text-graphite text-xs font-black uppercase mt-1">
                {match.format || match.sportLabel}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium mt-0.5">
                {match.duration || '90 Mins'}
              </Text>
            </View>

            {/* Skill Level Card */}
            <View className="flex-1 bg-warm-white border border-stone rounded-xl p-3 mr-2 shadow-xs">
              <Text className="text-stone-muted text-[9px] font-black uppercase tracking-wider">
                SKILL LEVEL
              </Text>
              <Text className="text-graphite text-xs font-black uppercase mt-1">
                {match.skillLevel}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium mt-0.5">
                Competitive
              </Text>
            </View>

            {/* Match Fee Metadata Card */}
            <View className="flex-1 bg-warm-white border border-stone rounded-xl p-3 shadow-xs">
              <Text className="text-stone-muted text-[9px] font-black uppercase tracking-wider">
                MATCH FEE
              </Text>
              <Text numberOfLines={1} className="text-graphite text-xs font-black uppercase mt-1">
                {match.feePerPlayer || 'Free'}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium mt-0.5">
                Per player
              </Text>
            </View>
          </View>

          {/* Squad Host & Captain Context Card */}
          <View className="bg-warm-white border border-stone rounded-xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-stone-muted text-[10px] font-black uppercase tracking-wider">
                FIXTURE ORGANIZER
              </Text>
              <View className="bg-stone/25 px-2 py-0.5 rounded-sm border border-stone">
                <Text className="text-graphite text-[9px] font-black uppercase tracking-wider">
                  TEAM CAPTAIN
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-graphite border border-stone items-center justify-center mr-3">
                <Ionicons name="shield-outline" size={20} color="#F4F1EA" />
              </View>
              <View className="flex-1">
                <Text className="text-graphite text-sm font-black uppercase tracking-tight">
                  {match.captainName || 'Team Captain'}
                </Text>
                <Text className="text-stone-muted text-xs font-medium mt-0.5">
                  {match.teamName || 'Squad Captain & Match Coordinator'}
                </Text>
              </View>
            </View>

            <View className="mt-3 pt-2.5 border-t border-stone flex-row items-center">
              <Ionicons name="information-circle-outline" size={13} color="#666B60" />
              <Text className="text-stone-muted text-[11px] font-medium ml-1.5 flex-1">
                Captain reviews all join requests before confirming your spot.
              </Text>
            </View>
          </View>

          {/* Confirmed Squad Lineup Section */}
          <View className="bg-warm-white border border-stone rounded-xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Text className="text-graphite text-xs font-black uppercase tracking-wider">
                  CONFIRMED SQUAD LINEUP
                </Text>
                <Text className="text-stone-muted text-xs font-bold ml-1.5">
                  ({match.totalSlots - match.slotsOpen} / {match.totalSlots})
                </Text>
              </View>

              <View
                className={`px-2 py-0.5 rounded-sm ${
                  isMatchFull ? 'bg-stone/30' : isUrgent ? 'bg-rust/20' : 'bg-olive/15'
                }`}
              >
                <Text
                  className={`text-[10px] font-black uppercase ${
                    isMatchFull ? 'text-graphite' : isUrgent ? 'text-rust' : 'text-olive'
                  }`}
                >
                  {isMatchFull ? 'FULL' : `${match.slotsOpen} OPEN`}
                </Text>
              </View>
            </View>

            {/* Participant Chips */}
            <View className="flex-row flex-wrap gap-2">
              {match.confirmedPlayers && match.confirmedPlayers.length > 0 ? (
                match.confirmedPlayers.map((player) => (
                  <View
                    key={player.id}
                    className={`flex-row items-center px-2.5 py-1.5 rounded-lg border mr-2 mb-2 ${
                      player.isCaptain
                        ? 'bg-graphite border-surface-border-dark'
                        : 'bg-stone-light/60 border-stone/80'
                    }`}
                  >
                    <Ionicons
                      name={player.isCaptain ? 'star' : 'person-outline'}
                      size={11}
                      color={player.isCaptain ? '#F4F1EA' : '#666B60'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        player.isCaptain ? 'text-warm-white' : 'text-graphite'
                      }`}
                    >
                      {player.name}
                    </Text>
                    {player.isCaptain && (
                      <Text className="text-stone text-[9px] font-black uppercase ml-1">
                        (C)
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <Text className="text-stone-muted text-xs">
                  {match.totalSlots - match.slotsOpen} players currently confirmed.
                </Text>
              )}

              {/* Vacant Open Slot Placeholders */}
              {Array.from({ length: match.slotsOpen }).map((_, idx) => (
                <View
                  key={`open-${idx}`}
                  className="flex-row items-center px-2.5 py-1.5 rounded-lg border border-dashed border-olive/60 bg-olive/5 mr-2 mb-2"
                >
                  <Ionicons name="add-circle-outline" size={12} color="#4B6344" style={{ marginRight: 4 }} />
                  <Text className="text-olive text-xs font-bold uppercase tracking-wider">
                    Open Slot
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Fixture Notes / Match Brief */}
          <View className="bg-warm-white border border-stone rounded-xl p-4 shadow-sm">
            <Text className="text-graphite text-xs font-black uppercase tracking-wider mb-2">
              FIXTURE NOTES // MATCH BRIEF
            </Text>

            <Text className="text-graphite text-xs font-medium leading-5">
              {match.description || 'Standard competitive recreational match on local Lahore circuit.'}
            </Text>

            {match.venueNotes && (
              <View className="mt-3 pt-2.5 border-t border-stone flex-row items-start">
                <Ionicons name="pin-outline" size={13} color="#666B60" style={{ marginTop: 1 }} />
                <Text className="text-stone-muted text-xs font-medium ml-1.5 flex-1 leading-4">
                  {match.venueNotes}
                </Text>
              </View>
            )}

            <View className="mt-2.5 pt-2 border-t border-stone/60 flex-row items-center">
              <Ionicons name="shield-checkmark-outline" size={13} color="#4B6344" />
              <Text className="text-stone-muted text-[11px] font-semibold ml-1.5 flex-1">
                Players adhere to Maidaan Fair Play standards & punctual arrival.
              </Text>
            </View>
          </View>

          {/* Venue & Location Overview */}
          <View className="bg-warm-white border border-stone rounded-xl p-4 shadow-sm">
            <Text className="text-graphite text-xs font-black uppercase tracking-wider mb-2">
              VENUE & LOCATION
            </Text>

            <View className="flex-row items-start">
              <View className="w-8 h-8 rounded-lg bg-stone/30 border border-stone items-center justify-center mr-2.5">
                <Ionicons name="location-sharp" size={16} color="#242522" />
              </View>
              <View className="flex-1">
                <Text className="text-graphite text-sm font-black uppercase tracking-tight">
                  {match.groundName}
                </Text>
                <Text className="text-stone-muted text-xs font-medium mt-0.5">
                  {match.area}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Docked Tactile Bottom CTA Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-warm-white border-t border-stone px-5 py-3 shadow-2xl">
        <SafeAreaView edges={['bottom']}>
          {isMatchFull ? (
            /* Match Full State */
            <View className="items-center py-2">
              <View className="w-full bg-stone/40 border border-stone py-3 rounded-xl items-center justify-center">
                <Text className="text-stone-muted text-xs font-black uppercase tracking-wider">
                  MATCH FULL — NO SLOTS OPEN
                </Text>
              </View>
              <Text className="text-stone-muted text-[11px] font-medium mt-1">
                All player slots for this fixture have been allocated.
              </Text>
            </View>
          ) : isCaptainOfMatch ? (
            /* Match Owner / Captain View */
            <View className="items-center py-1">
              <Text className="text-stone-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                YOU ARE HOSTING THIS FIXTURE
              </Text>
              <Pressable
                onPress={() => router.push('/captain/dashboard')}
                accessibilityRole="button"
                accessibilityLabel="View Captain Dashboard"
                className="w-full bg-graphite border border-surface-border-dark py-3.5 rounded-xl items-center justify-center active:scale-[0.98]"
              >
                <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                  VIEW CAPTAIN DASHBOARD
                </Text>
              </Pressable>
            </View>
          ) : currentRole !== 'PLAYER' ? (
            /* Non-Player Role Notice */
            <View className="items-center py-1">
              <View className="w-full bg-stone-light border border-stone py-3 rounded-xl items-center justify-center">
                <Text className="text-stone-muted text-xs font-bold uppercase tracking-wider">
                  PLAYER ACCOUNT REQUIRED TO REQUEST A SLOT
                </Text>
              </View>
              <Text className="text-stone-muted text-[10px] font-medium mt-1">
                Only registered players can request open match slots.
              </Text>
            </View>
          ) : (
            <View>
              {submitError && (
                <View className="mb-2 p-2.5 bg-rust/10 border border-rust/30 rounded-lg">
                  <Text className="text-rust text-[11px] font-bold text-center">
                    {submitError}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleRequestJoin}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Request to join match"
                className={`w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-olive border-b-[3px] border-olive-dark items-center justify-center flex-row shadow-sm transition-all ${
                  isSubmitting ? 'opacity-80' : 'active:scale-[0.98] active:opacity-90'
                }`}
              >
                {isSubmitting ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#F4F1EA" />
                    <Text className="text-warm-white text-sm font-black uppercase tracking-wider ml-2">
                      SENDING REQUEST...
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <Text className="text-warm-white text-sm font-black uppercase tracking-wider mr-1.5">
                      REQUEST TO JOIN
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color="#F4F1EA" />
                  </View>
                )}
              </Pressable>

              <Text className="text-stone-muted text-[10px] font-medium text-center mt-1.5">
                Requires captain approval • Slot confirmed upon acceptance
              </Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
