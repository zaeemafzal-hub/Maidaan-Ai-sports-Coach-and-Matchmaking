import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { IMAGES } from '../../constants/images';
import { MatchSlotItem } from '../../constants/matches';
import { matchService } from '../../services/matchService';
import { joinRequestService, JoinRequest } from '../../services/joinRequestService';
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
      return IMAGES.arenaHome;
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

export default function RequestSentScreen() {
  const { matchId, requestId } = useLocalSearchParams<{ matchId?: string; requestId?: string }>();

  const [match, setMatch] = useState<MatchSlotItem | null>(null);
  const [request, setRequest] = useState<JoinRequest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = React.useRef(true);

  const loadData = useCallback(async () => {
    try {
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      // Load match details if matchId available
      if (matchId) {
        const matchData = await matchService.getMatchById(matchId);
        if (isMountedRef.current) {
          setMatch(matchData);
        }
      }

      // Load player's join requests to resolve current status
      const myRequests = await joinRequestService.getMyJoinRequests();
      let matchedRequest: JoinRequest | undefined;

      if (requestId) {
        matchedRequest = myRequests.find((r) => r.id === requestId);
      } else if (matchId) {
        matchedRequest = myRequests.find((r) => r.matchId === matchId);
      }

      if (isMountedRef.current) {
        setRequest(matchedRequest || null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn('[RequestSentScreen] Failed to load request status:', err);
        setError('Unable to load latest request status. Please check your connection.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [matchId, requestId]);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      loadData();
      return () => {
        isMountedRef.current = false;
      };
    }, [loadData])
  );

  const handleBackToDiscover = () => {
    router.replace('/(tabs)/discover');
  };

  const handleViewConfirmedSpot = () => {
    const targetMatchId = matchId || request?.matchId;
    if (targetMatchId) {
      router.push({
        pathname: '/match/confirmed',
        params: { matchId: targetMatchId },
      });
    } else {
      router.replace('/(tabs)/discover');
    }
  };

  const handleViewMatchDetails = () => {
    const targetMatchId = matchId || request?.matchId;
    if (targetMatchId) {
      router.push(`/match/${targetMatchId}`);
    } else {
      router.replace('/(tabs)/discover');
    }
  };

  const status = request?.status || 'PENDING';

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
      {/* Concrete Arena Header */}
      <ArenaHeader
        title="MAIDAAN"
        subtitle="CIRCUIT REQUEST // SCREEN 08"
        showBack
        onBack={handleBackToDiscover}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1"
      >
        {isLoading && !request && !match ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#1A1C19" />
            <Text className="text-stone-muted text-xs font-mono uppercase tracking-widest mt-4">
              SYNCING REQUEST STATUS...
            </Text>
          </View>
        ) : (
          <>
            <View className="px-5 pt-6 items-center">
              {/* Status Icon */}
              {status === 'ACCEPTED' ? (
                <View className="w-16 h-16 rounded-full bg-olive/20 border-2 border-olive items-center justify-center mb-4">
                  <Ionicons name="checkmark-done" size={32} color="#3D4438" />
                </View>
              ) : status === 'REJECTED' ? (
                <View className="w-16 h-16 rounded-full bg-rust/20 border-2 border-rust items-center justify-center mb-4">
                  <Ionicons name="close" size={32} color="#C44529" />
                </View>
              ) : (
                <View className="w-16 h-16 rounded-full bg-olive/15 border-2 border-olive items-center justify-center mb-4">
                  <Ionicons name="checkmark-sharp" size={32} color="#3D4438" />
                </View>
              )}

              {/* Dominant Headings */}
              <Text className="text-graphite text-2xl font-black uppercase tracking-tight text-center">
                {status === 'ACCEPTED'
                  ? 'REQUEST ACCEPTED'
                  : status === 'REJECTED'
                  ? 'REQUEST DECLINED'
                  : 'REQUEST SENT'}
              </Text>

              {/* Stamped Status Badge */}
              <View
                className={`mt-2 px-3 py-1 rounded-sm border ${
                  status === 'ACCEPTED'
                    ? 'bg-olive/20 border-olive'
                    : status === 'REJECTED'
                    ? 'bg-rust/20 border-rust'
                    : 'bg-rust/15 border-rust'
                }`}
              >
                <Text
                  className={`text-xs font-black uppercase tracking-wider ${
                    status === 'ACCEPTED'
                      ? 'text-olive-dark'
                      : status === 'REJECTED'
                      ? 'text-rust'
                      : 'text-rust'
                  }`}
                >
                  {status === 'ACCEPTED'
                    ? 'SPOT CONFIRMED BY CAPTAIN'
                    : status === 'REJECTED'
                    ? 'CAPTAIN DECLINED SLOT REQUEST'
                    : 'AWAITING CAPTAIN APPROVAL'}
                </Text>
              </View>

              {/* Explanatory Context Copy */}
              <Text className="text-stone-muted text-xs font-medium text-center mt-3 max-w-[320px] leading-5">
                {status === 'ACCEPTED'
                  ? 'Congratulations! The match captain accepted your request. Your spot on the match roster is confirmed.'
                  : status === 'REJECTED'
                  ? 'The team captain was unable to accommodate your slot request for this fixture. Explore other open circuit matches.'
                  : "Your request has been sent to the match captain. You'll see updates here when they accept or decline."}
              </Text>
            </View>

            {/* Request Progression Status Board */}
            <View className="mx-4 mt-6 bg-warm-white border border-stone rounded-xl p-4 shadow-xs">
              <Text className="text-stone-muted text-[10px] font-black uppercase tracking-wider mb-3">
                MATCHMAKING PROGRESSION
              </Text>

              <View className="space-y-3">
                {/* Step 1: Request Submitted */}
                <View className="flex-row items-center">
                  <View className="w-6 h-6 rounded-full bg-olive items-center justify-center mr-3">
                    <Ionicons name="checkmark" size={14} color="#F4F1EA" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-graphite text-xs font-black uppercase tracking-wide">
                      01. Request Submitted
                    </Text>
                    <Text className="text-stone-muted text-[11px] font-medium">
                      Player profile and slot request registered on server.
                    </Text>
                  </View>
                </View>

                {/* Step 2: Captain Review */}
                <View className="flex-row items-center mt-2 pt-2 border-t border-stone/50">
                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                      status !== 'PENDING'
                        ? 'bg-olive'
                        : 'bg-rust/20 border border-rust'
                    }`}
                  >
                    <Ionicons
                      name={status !== 'PENDING' ? 'checkmark' : 'time-outline'}
                      size={14}
                      color={status !== 'PENDING' ? '#F4F1EA' : '#C44529'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-xs font-black uppercase tracking-wide ${
                        status === 'PENDING' ? 'text-rust' : 'text-graphite'
                      }`}
                    >
                      02. Captain Review {status === 'PENDING' ? '(Pending)' : '(Evaluated)'}
                    </Text>
                    <Text className="text-stone-muted text-[11px] font-medium">
                      Team captain evaluated lineup balance and roster availability.
                    </Text>
                  </View>
                </View>

                {/* Step 3: Decision */}
                <View className="flex-row items-center mt-2 pt-2 border-t border-stone/50">
                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                      status === 'ACCEPTED'
                        ? 'bg-olive'
                        : status === 'REJECTED'
                        ? 'bg-rust'
                        : 'bg-stone/30 border border-stone'
                    }`}
                  >
                    <Ionicons
                      name={
                        status === 'ACCEPTED'
                          ? 'checkmark'
                          : status === 'REJECTED'
                          ? 'close'
                          : 'radio-button-off'
                      }
                      size={13}
                      color={status !== 'PENDING' ? '#F4F1EA' : '#666B60'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-xs font-black uppercase tracking-wide ${
                        status === 'ACCEPTED'
                          ? 'text-olive-dark'
                          : status === 'REJECTED'
                          ? 'text-rust'
                          : 'text-stone-muted'
                      }`}
                    >
                      03. Final Decision {status !== 'PENDING' ? `(${status})` : ''}
                    </Text>
                    <Text className="text-stone-muted text-[11px] font-medium">
                      {status === 'ACCEPTED'
                        ? 'Player confirmed in match lineup.'
                        : status === 'REJECTED'
                        ? 'Request declined. Slot remains closed for this athlete.'
                        : 'Spot confirmed upon acceptance.'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Match Summary Ticket */}
            {match && (
              <View className="mx-4 mt-4 bg-warm-white border border-stone rounded-2xl overflow-hidden shadow-sm">
                <View className="h-28 w-full relative bg-graphite">
                  <Image
                    source={getSportPhoto(match.sport)}
                    className="w-full h-full object-cover"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-graphite/50" />

                  <View className="absolute top-3 left-3 right-3 flex-row items-center justify-between">
                    <View className="flex-row items-center bg-graphite/90 px-2.5 py-1 rounded-sm border border-stone/30">
                      <MaterialCommunityIcons
                        name={getSportIcon(match.sport)}
                        size={12}
                        color="#F4F1EA"
                        style={{ marginRight: 4 }}
                      />
                      <Text className="text-warm-white text-[10px] font-black uppercase tracking-wider">
                        {match.sportLabel}
                      </Text>
                    </View>

                    <ArenaBadge
                      label={
                        status === 'ACCEPTED'
                          ? 'CONFIRMED'
                          : status === 'REJECTED'
                          ? 'DECLINED'
                          : 'PENDING REVIEW'
                      }
                      variant={
                        status === 'ACCEPTED'
                          ? 'olive'
                          : status === 'REJECTED'
                          ? 'stone'
                          : 'rust'
                      }
                    />
                  </View>

                  <View className="absolute bottom-2.5 left-3 right-3">
                    <Text
                      numberOfLines={1}
                      className="text-warm-white text-base font-black uppercase tracking-tight"
                    >
                      {match.title}
                    </Text>
                  </View>
                </View>

                <View className="p-4">
                  <View className="flex-row items-center justify-between pb-3 border-b border-dashed border-stone">
                    <View>
                      <Text className="text-stone-muted text-[10px] font-bold uppercase">
                        SCHEDULED TIME
                      </Text>
                      <Text className="text-graphite text-xs font-black uppercase mt-0.5">
                        {match.date} • {match.startTime || match.time}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-stone-muted text-[10px] font-bold uppercase">
                        SKILL LEVEL
                      </Text>
                      <Text className="text-graphite text-xs font-black uppercase mt-0.5">
                        {match.skillLevel}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3 flex-row items-start">
                    <Ionicons
                      name="location-sharp"
                      size={14}
                      color="#666B60"
                      style={{ marginTop: 1 }}
                    />
                    <View className="ml-1.5 flex-1">
                      <Text className="text-graphite text-xs font-bold">
                        {match.groundName}
                      </Text>
                      <Text className="text-stone-muted text-[11px] font-medium">
                        {match.area}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3.5 pt-3 border-t border-stone flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 pr-2">
                      <View className="w-8 h-8 rounded-lg bg-graphite items-center justify-center mr-2 border border-stone">
                        <Ionicons name="shield-outline" size={14} color="#F4F1EA" />
                      </View>
                      <View>
                        <Text className="text-stone-muted text-[10px] font-bold uppercase">
                          REQUEST SENT TO
                        </Text>
                        <Text className="text-graphite text-xs font-black uppercase">
                          {match.captainName || 'Team Captain'}
                        </Text>
                      </View>
                    </View>

                    <View className="bg-stone/25 px-2.5 py-1 rounded-sm border border-stone">
                      <Text className="text-stone-muted text-[10px] font-black uppercase">
                        MATCH HOST
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View className="mx-4 mt-6 space-y-3">
              {status === 'ACCEPTED' ? (
                /* Accepted CTA: View Confirmed Spot */
                <Pressable
                  onPress={handleViewConfirmedSpot}
                  accessibilityRole="button"
                  accessibilityLabel="View Confirmed Spot"
                  className="w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-olive border-b-[3px] border-olive-dark items-center justify-center shadow-sm active:scale-[0.98] active:opacity-90 flex-row"
                >
                  <Ionicons name="checkmark-circle" size={16} color="#F4F1EA" style={{ marginRight: 6 }} />
                  <Text className="text-warm-white text-sm font-black uppercase tracking-wider">
                    VIEW CONFIRMED SPOT
                  </Text>
                </Pressable>
              ) : (
                /* Pending / Rejected CTA: Back to Discover */
                <Pressable
                  onPress={handleBackToDiscover}
                  accessibilityRole="button"
                  accessibilityLabel="Back to Discover"
                  className="w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-olive border-b-[3px] border-olive-dark items-center justify-center shadow-sm active:scale-[0.98] active:opacity-90 flex-row"
                >
                  <Ionicons name="search" size={15} color="#F4F1EA" style={{ marginRight: 6 }} />
                  <Text className="text-warm-white text-sm font-black uppercase tracking-wider">
                    BACK TO DISCOVER
                  </Text>
                </Pressable>
              )}

              {/* View Match Details */}
              {match && (
                <Pressable
                  onPress={handleViewMatchDetails}
                  accessibilityRole="button"
                  accessibilityLabel="View Match Details"
                  className="w-full min-h-[44px] py-3 items-center justify-center mt-2.5 active:opacity-70"
                >
                  <Text className="text-graphite text-xs font-black uppercase tracking-wider underline">
                    VIEW MATCH DETAILS
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
