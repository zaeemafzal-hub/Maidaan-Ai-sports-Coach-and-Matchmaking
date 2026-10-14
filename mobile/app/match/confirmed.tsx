import React, { useState, useCallback } from 'react';
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
import { chatService } from '../../services/chatService';
import { Sport } from '../../types';

const getSportPhoto = (sport?: Sport) => {
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
      return IMAGES.arenaTeam;
  }
};

const getSportIcon = (sport?: Sport): 'cricket' | 'badminton' | 'tennis' | 'soccer' => {
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

export default function SpotConfirmedScreen() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();

  const [match, setMatch] = useState<MatchSlotItem | null>(null);
  const [acceptedRequest, setAcceptedRequest] = useState<JoinRequest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);

  const isMountedRef = React.useRef(true);

  const verifyConfirmation = useCallback(async () => {
    if (!matchId) {
      if (isMountedRef.current) {
        setIsUnauthorized(true);
        setIsLoading(false);
      }
      return;
    }

    try {
      if (isMountedRef.current) {
        setIsLoading(true);
        setIsUnauthorized(false);
      }

      // Verify that current user actually has an ACCEPTED request for this match
      const myRequests = await joinRequestService.getMyJoinRequests();
      const confirmedReq = myRequests.find(
        (r) => r.matchId === matchId && r.status === 'ACCEPTED'
      );

      if (!confirmedReq) {
        if (isMountedRef.current) {
          setIsUnauthorized(true);
          setMatch(null);
          setAcceptedRequest(null);
        }
        return;
      }

      if (isMountedRef.current) {
        setAcceptedRequest(confirmedReq);
      }

      // Load live match fixture details
      const matchData = await matchService.getMatchById(matchId);
      if (isMountedRef.current) {
        if (!matchData) {
          setIsUnauthorized(true);
          setMatch(null);
        } else {
          setMatch(matchData);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn('[SpotConfirmedScreen] Verification error:', err);
        setIsUnauthorized(true);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [matchId]);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      verifyConfirmation();
      return () => {
        isMountedRef.current = false;
      };
    }, [verifyConfirmation])
  );

  const handleBackToDiscover = () => {
    router.replace('/(tabs)/discover');
  };

  // Safe invalid-context guard: do not expose arbitrary group rooms or fabricated match details
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
        <ArenaHeader
          title="MAIDAAN"
          subtitle="MATCH ROSTER // SCREEN 09"
          showBack
          onBack={handleBackToDiscover}
        />
        <View className="flex-1 px-6 justify-center items-center">
          <ActivityIndicator size="large" color="#1A1C19" />
          <Text className="text-stone-muted text-xs font-mono uppercase tracking-widest mt-4">
            VERIFYING CONFIRMED SPOT...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isUnauthorized || !match || !acceptedRequest) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
        <ArenaHeader
          title="MAIDAAN"
          subtitle="MATCH ROSTER // SCREEN 09"
          showBack
          onBack={handleBackToDiscover}
        />
        <View className="flex-1 px-6 justify-center items-center">
          <View className="w-16 h-16 rounded-full bg-stone/30 border border-stone items-center justify-center mb-4">
            <Ionicons name="alert-circle-outline" size={32} color="#666B60" />
          </View>
          <Text className="text-graphite text-xl font-black uppercase tracking-tight text-center">
            CONFIRMATION UNAVAILABLE
          </Text>
          <Text className="text-stone-muted text-xs font-medium text-center mt-2 max-w-[280px] leading-5">
            You do not have an accepted spot for this fixture on the circuit roster.
          </Text>
          <View className="w-full mt-8 max-w-[320px]">
            <Pressable
              onPress={handleBackToDiscover}
              accessibilityRole="button"
              accessibilityLabel="Back to Discover"
              className="w-full py-4 rounded-xl bg-olive border-b-[3px] border-olive-dark items-center justify-center active:opacity-90"
            >
              <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                BACK TO DISCOVER
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const [openingChat, setOpeningChat] = useState(false);
  const [chatAuthError, setChatAuthError] = useState<string | null>(null);

  const handleOpenMatchChat = async () => {
    try {
      setOpeningChat(true);
      setChatAuthError(null);
      const room = await chatService.openMatchGroupRoom(match.id);
      router.push({
        pathname: '/chat/[id]',
        params: { id: room.id, type: room.type },
      });
    } catch (err: any) {
      console.warn('[handleOpenMatchChat] Failed to open group room:', err);
      if (err?.status === 403) {
        setChatAuthError('Access denied: You are not yet verified as a confirmed participant in this match squad.');
      } else {
        setChatAuthError(err?.message || 'Unable to open squad chat channel at this time.');
      }
    } finally {
      setOpeningChat(false);
    }
  };

  const handleViewMatchDetails = () => {
    router.push(`/match/${match.id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
      {/* Concrete Arena Header */}
      <ArenaHeader
        title="MAIDAAN"
        subtitle="MATCH ROSTER // SCREEN 09"
        showBack
        onBack={handleBackToDiscover}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        className="flex-1"
      >
        {/* Physical Match Confirmation Hero Header */}
        <View className="px-5 pt-6 items-center">
          <View className="w-16 h-16 rounded-full bg-olive/15 border-2 border-olive items-center justify-center mb-4 shadow-xs">
            <Ionicons name="checkmark-done-sharp" size={34} color="#3D4438" />
          </View>

          <View className="bg-olive px-3.5 py-1 rounded-sm border border-olive-dark mb-2.5">
            <Text className="text-warm-white text-[11px] font-black uppercase tracking-widest">
              LINEUP CONFIRMED
            </Text>
          </View>

          <Text className="text-graphite text-2xl font-black uppercase tracking-tight text-center">
            SPOT CONFIRMED
          </Text>

          <Text className="text-olive text-sm font-black uppercase tracking-wider text-center mt-1">
            YOU'RE IN THE LINEUP
          </Text>

          <Text className="text-stone-muted text-xs font-medium text-center mt-2.5 max-w-[320px] leading-5">
            The captain accepted your request. Your spot on the match roster is secured and group coordination is now open.
          </Text>
        </View>

        {/* 3-Step Matchmaking Progression Board (All 3 Completed) */}
        <View className="mx-4 mt-6 bg-warm-white border border-stone rounded-xl p-4 shadow-xs">
          <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-stone">
            <Text className="text-stone-muted text-[10px] font-black uppercase tracking-wider">
              MATCHMAKING PROGRESSION
            </Text>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-olive mr-1.5" />
              <Text className="text-olive text-[10px] font-black uppercase tracking-wider">
                ROSTER SEALED
              </Text>
            </View>
          </View>

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
                  Player profile and skill level relayed
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={16} color="#3D4438" />
            </View>

            {/* Connecting Track 1 */}
            <View className="w-0.5 h-3 bg-olive ml-3 my-0.5" />

            {/* Step 2: Captain Approved */}
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full bg-olive items-center justify-center mr-3">
                <Ionicons name="checkmark" size={14} color="#F4F1EA" />
              </View>
              <View className="flex-1">
                <Text className="text-graphite text-xs font-black uppercase tracking-wide">
                  02. Captain Approved
                </Text>
                <Text className="text-stone-muted text-[11px] font-medium">
                  {match.captainName ? `${match.captainName} approved your entry` : 'Match captain approved your entry'}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={16} color="#3D4438" />
            </View>

            {/* Connecting Track 2 */}
            <View className="w-0.5 h-3 bg-olive ml-3 my-0.5" />

            {/* Step 3: Spot Confirmed */}
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full bg-olive items-center justify-center mr-3">
                <Ionicons name="checkmark" size={14} color="#F4F1EA" />
              </View>
              <View className="flex-1">
                <Text className="text-graphite text-xs font-black uppercase tracking-wide">
                  03. Spot Confirmed
                </Text>
                <Text className="text-olive text-[11px] font-bold">
                  Active roster spot secured
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={16} color="#3D4438" />
            </View>
          </View>
        </View>

        {/* Documentary Photography Card */}
        <View className="mx-4 mt-6 rounded-2xl overflow-hidden bg-graphite border border-stone shadow-md">
          <View className="h-44 w-full relative">
            <Image
              source={getSportPhoto(match.sport)}
              className="w-full h-full object-cover"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-graphite/45" />
            <View className="absolute inset-0 bg-gradient-to-t from-graphite via-graphite/30 to-transparent" />

            <View className="absolute top-3 left-4 right-4 flex-row items-center justify-between">
              <View className="bg-graphite/90 px-2.5 py-1 rounded-sm border border-stone/30">
                <Text className="text-warm-white text-[10px] font-black uppercase tracking-wider">
                  MATCH ROSTER ENTRY
                </Text>
              </View>

              <View className="bg-olive/90 px-2.5 py-1 rounded-sm border border-olive-dark">
                <Text className="text-warm-white text-[10px] font-black uppercase tracking-widest">
                  CONFIRMED
                </Text>
              </View>
            </View>

            <View className="absolute bottom-3 left-4 right-4">
              <Text className="text-stone text-[10px] font-bold uppercase tracking-widest">
                {match.groundName || 'Local Sports Venue'}
              </Text>
              <Text
                numberOfLines={1}
                className="text-warm-white text-base font-black uppercase tracking-tight"
              >
                {match.title}
              </Text>
            </View>
          </View>
        </View>

        {/* Physical Confirmed Fixture Ticket Sheet */}
        <View className="mx-4 mt-4 bg-warm-white border border-stone rounded-2xl p-5 shadow-sm">
          {/* Ticket Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-stone">
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name={getSportIcon(match.sport)}
                size={16}
                color="#3D4438"
                style={{ marginRight: 6 }}
              />
              <ArenaBadge
                label={match.sportLabel.toUpperCase()}
                variant="stone"
              />
            </View>

            <View className="bg-olive px-2.5 py-0.5 rounded-sm">
              <Text className="text-warm-white text-[10px] font-black uppercase tracking-wider">
                CONFIRMED
              </Text>
            </View>
          </View>

          {/* Match Title & Format */}
          <View className="py-3.5 border-b border-stone">
            <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-widest mb-0.5">
              MATCH FIXTURE
            </Text>
            <Text className="text-graphite text-base font-black uppercase tracking-tight">
              {match.title}
            </Text>
            {match.format && (
              <Text className="text-stone-muted text-xs font-semibold mt-0.5">
                {match.format}
              </Text>
            )}
          </View>

          {/* Date & Time + Skill Level */}
          <View className="py-3 border-b border-stone flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-widest mb-0.5">
                DATE & TIME
              </Text>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={14} color="#242522" />
                <Text className="text-graphite text-xs font-bold ml-1.5">
                  {match.date} • {match.startTime || match.time}
                </Text>
              </View>
            </View>

            {match.skillLevel && (
              <View className="items-end">
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-widest mb-0.5">
                  LEVEL
                </Text>
                <View className="px-2 py-0.5 rounded-sm bg-stone/30 border border-stone">
                  <Text className="text-graphite text-[10px] font-bold uppercase tracking-wider">
                    {match.skillLevel}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Venue & Location */}
          <View className="py-3 border-b border-stone">
            <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-widest mb-0.5">
              VENUE & LOCATION
            </Text>
            <View className="flex-row items-start">
              <Ionicons name="location-sharp" size={14} color="#3D4438" style={{ marginTop: 1 }} />
              <View className="ml-1.5 flex-1">
                <Text className="text-graphite text-xs font-black">
                  {match.groundName}
                </Text>
                <Text className="text-stone-muted text-xs font-medium">
                  {match.area}
                </Text>
              </View>
            </View>
          </View>

          {/* Captain Approval Context & Fee */}
          <View className="py-3 border-b border-stone flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-widest mb-0.5">
                APPROVED BY
              </Text>
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark" size={14} color="#3D4438" />
                <Text className="text-graphite text-xs font-black ml-1.5">
                  {match.captainName || 'Team Captain'}
                </Text>
              </View>
              <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider ml-5">
                MATCH HOST // TEAM CAPTAIN
              </Text>
            </View>

            {match.feePerPlayer && (
              <View className="items-end">
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-widest mb-0.5">
                  MATCH FEE
                </Text>
                <Text className="text-graphite text-xs font-black">
                  {match.feePerPlayer}
                </Text>
                <Text className="text-stone-muted text-[9px]">
                  per player
                </Text>
              </View>
            )}
          </View>

          {/* Match-Day Arrival Notes */}
          <View className="pt-3">
            <View className="p-3 rounded-lg bg-stone/20 border border-stone/60">
              <View className="flex-row items-center mb-1">
                <Ionicons name="alert-circle-outline" size={14} color="#3D4438" />
                <Text className="text-graphite text-xs font-black uppercase tracking-wider ml-1.5">
                  ARRIVE 15 MIN EARLY
                </Text>
              </View>
              <Text className="text-stone-muted text-xs leading-4">
                {match.venueNotes || 'Bring required playing kit and check in with the team captain at the venue.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Primary Action: OPEN MATCH CHAT */}
        <View className="px-4 mt-6">
          {chatAuthError && (
            <View className="p-3 mb-3 rounded-lg bg-rust/10 border border-rust/30 flex-row items-center">
              <Ionicons name="alert-circle" size={16} color="#875646" />
              <Text className="text-rust text-xs font-semibold ml-2 flex-1">
                {chatAuthError}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleOpenMatchChat}
            disabled={openingChat}
            accessibilityRole="button"
            accessibilityLabel="Open Match Chat"
            className="w-full py-4 rounded-xl bg-olive border-b-[3px] border-olive-dark items-center justify-center shadow-sm active:scale-[0.99] active:opacity-90 flex-row"
          >
            {openingChat ? (
              <ActivityIndicator size="small" color="#F4F1EA" />
            ) : (
              <>
                <Ionicons name="chatbubbles" size={18} color="#F4F1EA" />
                <Text className="text-warm-white text-sm font-black uppercase tracking-wider ml-2">
                  OPEN MATCH CHAT
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Secondary Action: VIEW MATCH DETAILS */}
        <View className="px-4 mt-3">
          <Pressable
            onPress={handleViewMatchDetails}
            accessibilityRole="button"
            accessibilityLabel="View Match Details"
            className="w-full py-3.5 rounded-xl bg-warm-white border border-stone items-center justify-center shadow-2xs active:bg-stone-light flex-row"
          >
            <Ionicons name="document-text-outline" size={16} color="#242522" />
            <Text className="text-graphite text-xs font-black uppercase tracking-wider ml-1.5">
              VIEW MATCH DETAILS
            </Text>
          </Pressable>
        </View>

        {/* Tertiary Action: BACK TO DISCOVER */}
        <View className="px-4 mt-2.5">
          <Pressable
            onPress={handleBackToDiscover}
            accessibilityRole="button"
            accessibilityLabel="Back to Discover"
            className="w-full py-3 rounded-xl bg-transparent items-center justify-center active:opacity-70"
          >
            <Text className="text-stone-muted text-xs font-bold uppercase tracking-wider">
              BACK TO DISCOVER
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
