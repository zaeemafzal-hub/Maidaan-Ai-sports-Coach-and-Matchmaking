import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState, useCallback } from "react";
import { View, Text, Pressable, Image, ActivityIndicator } from "react-native";

import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { ArenaBadge } from "../../components/ui/ArenaBadge";
import { IMAGES } from "../../constants/images";
import { MatchSlotItem } from "../../constants/matches";
import { matchService } from "../../services/matchService";
import {
  joinRequestService,
  JoinRequest,
} from "../../services/joinRequestService";
import { chatService } from "../../services/chatService";
import { Sport } from "../../types";

const getSportPhoto = (sport?: Sport) => {
  switch (sport) {
    case "football":
      return IMAGES.arenaMatch;
    case "cricket":
      return IMAGES.arenaGround;
    case "padel":
      return IMAGES.arenaTeam;
    case "badminton":
      return IMAGES.arenaOnboard;
    default:
      return IMAGES.arenaTeam;
  }
};

const getSportIcon = (
  sport?: Sport,
): "cricket" | "badminton" | "tennis" | "soccer" => {
  switch (sport) {
    case "cricket":
      return "cricket";
    case "badminton":
      return "badminton";
    case "padel":
      return "tennis";
    case "football":
    default:
      return "soccer";
  }
};

export default function SpotConfirmedScreen() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();

  const [match, setMatch] = useState<MatchSlotItem | null>(null);
  const [acceptedRequest, setAcceptedRequest] = useState<JoinRequest | null>(
    null,
  );
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
        (r) => r.matchId === matchId && r.status === "ACCEPTED",
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
        console.warn("[SpotConfirmedScreen] Verification error:", err);
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
    }, [verifyConfirmation]),
  );

  const handleBackToDiscover = () => {
    router.replace("/(tabs)/discover");
  };

  // Safe invalid-context guard: do not expose arbitrary group rooms or fabricated match details
  const [openingChat, setOpeningChat] = useState(false);
  const [chatAuthError, setChatAuthError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
        <ArenaHeader
          title="Spot Confirmed"
          subtitle="Lineup secured"
          showBack
          onBack={handleBackToDiscover}
        />
        <View className="flex-1 px-6 justify-center items-center">
          <ActivityIndicator size="large" color="#E85D26" />
          <Text className="text-[#A0A5AD] text-xs font-semibold tracking-wider mt-4">
            VERIFYING CONFIRMED SPOT...
          </Text>
        </View>
      </ThemedScreen>
    );
  }

  if (isUnauthorized || !match || !acceptedRequest) {
    return (
      <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
        <ArenaHeader
          title="Spot Confirmed"
          subtitle="Lineup secured"
          showBack
          onBack={handleBackToDiscover}
        />
        <View className="flex-1 px-6 justify-center items-center">
          <View className="w-16 h-16 rounded-full bg-[#1B1D22] border border-white/[0.08] items-center justify-center mb-4">
            <Ionicons name="alert-circle-outline" size={32} color="#F4A261" />
          </View>
          <Text className="text-[#FFFFFF] text-xl font-black uppercase tracking-tight text-center">
            CONFIRMATION UNAVAILABLE
          </Text>
          <Text className="text-[#A0A5AD] text-xs font-medium text-center mt-2 max-w-[280px] leading-5">
            You do not have an accepted spot for this fixture on the match
            roster.
          </Text>
          <View className="w-full mt-8 max-w-[320px]">
            <Pressable
              onPress={handleBackToDiscover}
              accessibilityRole="button"
              accessibilityLabel="Back to Discover"
              className="w-full py-4 rounded-xl bg-[#E85D26] items-center justify-center active:opacity-90 shadow-sm"
            >
              <Text className="text-[#0C0D0E] text-xs font-black uppercase tracking-wider">
                BACK TO DISCOVER
              </Text>
            </Pressable>
          </View>
        </View>
      </ThemedScreen>
    );
  }

  const handleOpenMatchChat = async () => {
    try {
      setOpeningChat(true);
      setChatAuthError(null);
      const room = await chatService.openMatchGroupRoom(match.id);
      router.push({
        pathname: "/chat/[id]",
        params: { id: room.id, type: room.type },
      });
    } catch (err: any) {
      console.warn("[handleOpenMatchChat] Failed to open group room:", err);
      if (err?.status === 403) {
        setChatAuthError(
          "Access denied: You are not yet verified as a confirmed participant in this match squad.",
        );
      } else {
        setChatAuthError(
          err?.message || "Unable to open squad chat channel at this time.",
        );
      }
    } finally {
      setOpeningChat(false);
    }
  };

  const handleViewMatchDetails = () => {
    router.push(`/match/${match.id}`);
  };

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      {/* Modern Header */}
      <ArenaHeader
        title="Spot Confirmed"
        subtitle="Lineup secured"
        showBack
        onBack={handleBackToDiscover}
      />

      <ThemedScroll
        kind="venues"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        className="flex-1"
      >
        {/* Match Confirmation Hero Header */}
        <View className="px-5 pt-6 items-center">
          <View className="w-16 h-16 rounded-full bg-[#E85D26]/15 border-2 border-[#E85D26] items-center justify-center mb-4 shadow-sm">
            <Ionicons name="checkmark-done-sharp" size={34} color="#E85D26" />
          </View>

          <View className="bg-[#E85D26]/20 px-3.5 py-1 rounded-full border border-[#E85D26]/40 mb-2.5">
            <Text className="text-[#E85D26] text-[11px] font-bold uppercase tracking-widest">
              LINEUP CONFIRMED
            </Text>
          </View>

          <Text className="text-[#FFFFFF] text-2xl font-black uppercase tracking-tight text-center">
            SPOT CONFIRMED
          </Text>

          <Text className="text-[#E85D26] text-sm font-bold uppercase tracking-wider text-center mt-1">
            YOU'RE IN THE LINEUP
          </Text>

          <Text className="text-[#A0A5AD] text-xs font-medium text-center mt-2.5 max-w-[320px] leading-5">
            The captain accepted your request. Your spot on the match roster is
            secured and group coordination is now open.
          </Text>
        </View>

        {/* 3-Step Matchmaking Progression Board */}
        <View className="mx-4 mt-6 bg-[#141518]/25 border border-white/[0.08] rounded-2xl p-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-white/[0.08]">
            <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider">
              MATCHMAKING PROGRESSION
            </Text>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-[#E85D26] mr-1.5" />
              <Text className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider">
                ROSTER CONFIRMED
              </Text>
            </View>
          </View>

          <View className="space-y-3">
            {/* Step 1: Request Submitted */}
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full bg-[#E85D26] items-center justify-center mr-3">
                <Ionicons name="checkmark" size={14} color="#0C0D0E" />
              </View>
              <View className="flex-1">
                <Text className="text-[#FFFFFF] text-xs font-bold uppercase tracking-wide">
                  01. Request Submitted
                </Text>
                <Text className="text-[#A0A5AD] text-[11px] font-medium">
                  Player profile and skill level relayed
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={16} color="#E85D26" />
            </View>

            {/* Connecting Track 1 */}
            <View className="w-0.5 h-3 bg-[#E85D26] ml-3 my-0.5" />

            {/* Step 2: Captain Approved */}
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full bg-[#E85D26] items-center justify-center mr-3">
                <Ionicons name="checkmark" size={14} color="#0C0D0E" />
              </View>
              <View className="flex-1">
                <Text className="text-[#FFFFFF] text-xs font-bold uppercase tracking-wide">
                  02. Captain Approved
                </Text>
                <Text className="text-[#A0A5AD] text-[11px] font-medium">
                  {match.captainName
                    ? `${match.captainName} approved your entry`
                    : "Match captain approved your entry"}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={16} color="#E85D26" />
            </View>

            {/* Connecting Track 2 */}
            <View className="w-0.5 h-3 bg-[#E85D26] ml-3 my-0.5" />

            {/* Step 3: Spot Confirmed */}
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full bg-[#E85D26] items-center justify-center mr-3">
                <Ionicons name="checkmark" size={14} color="#0C0D0E" />
              </View>
              <View className="flex-1">
                <Text className="text-[#FFFFFF] text-xs font-bold uppercase tracking-wide">
                  03. Spot Confirmed
                </Text>
                <Text className="text-[#E85D26] text-[11px] font-bold">
                  Active roster spot secured
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={16} color="#E85D26" />
            </View>
          </View>
        </View>

        {/* Photography Card */}
        <View className="mx-4 mt-6 rounded-2xl overflow-hidden bg-[#141518]/25 border border-white/[0.08] shadow-md">
          <View className="h-44 w-full relative">
            <Image
              source={getSportPhoto(match.sport)}
              className="w-full h-full object-cover"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-[#0C0D0E]/50" />
            <View className="absolute inset-0 bg-gradient-to-t from-[#0C0D0E] via-[#0C0D0E]/30 to-transparent" />

            <View className="absolute top-3 left-4 right-4 flex-row items-center justify-between">
              <View className="bg-[#141518]/90 px-2.5 py-1 rounded-lg border border-white/[0.08]">
                <Text className="text-[#FFFFFF] text-[10px] font-bold uppercase tracking-wider">
                  MATCH ROSTER ENTRY
                </Text>
              </View>

              <View className="bg-[#E85D26] px-2.5 py-1 rounded-lg">
                <Text className="text-[#0C0D0E] text-[10px] font-black uppercase tracking-widest">
                  CONFIRMED
                </Text>
              </View>
            </View>

            <View className="absolute bottom-3 left-4 right-4">
              <Text className="text-[#A0A5AD] text-[10px] font-bold uppercase tracking-widest">
                {match.groundName || "Local Sports Venue"}
              </Text>
              <Text
                numberOfLines={1}
                className="text-[#FFFFFF] text-base font-black uppercase tracking-tight"
              >
                {match.title}
              </Text>
            </View>
          </View>
        </View>

        {/* Confirmed Fixture Ticket Sheet */}
        <View className="mx-4 mt-4 bg-[#141518]/25 border border-white/[0.08] rounded-2xl p-5 shadow-sm">
          {/* Ticket Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-white/[0.08]">
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name={getSportIcon(match.sport)}
                size={16}
                color="#E85D26"
                style={{ marginRight: 6 }}
              />
              <ArenaBadge
                label={match.sportLabel.toUpperCase()}
                variant="stone"
              />
            </View>

            <View className="bg-[#E85D26]/20 border border-[#E85D26]/40 px-2.5 py-0.5 rounded-full">
              <Text className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider">
                CONFIRMED
              </Text>
            </View>
          </View>

          {/* Match Title & Format */}
          <View className="py-3.5 border-b border-white/[0.08]">
            <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-widest mb-0.5">
              MATCH FIXTURE
            </Text>
            <Text className="text-[#FFFFFF] text-base font-bold uppercase tracking-tight">
              {match.title}
            </Text>
            {match.format && (
              <Text className="text-[#A0A5AD] text-xs font-semibold mt-0.5">
                {match.format}
              </Text>
            )}
          </View>

          {/* Date & Time + Skill Level */}
          <View className="py-3 border-b border-white/[0.08] flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-widest mb-0.5">
                DATE & TIME
              </Text>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={14} color="#E85D26" />
                <Text className="text-[#FFFFFF] text-xs font-bold ml-1.5">
                  {match.date} • {match.startTime || match.time}
                </Text>
              </View>
            </View>

            {match.skillLevel && (
              <View className="items-end">
                <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-widest mb-0.5">
                  LEVEL
                </Text>
                <View className="px-2 py-0.5 rounded-md bg-[#1B1D22] border border-white/[0.08]">
                  <Text className="text-[#FFFFFF] text-[10px] font-bold uppercase tracking-wider">
                    {match.skillLevel}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Venue & Location */}
          <View className="py-3 border-b border-white/[0.08]">
            <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-widest mb-0.5">
              VENUE & LOCATION
            </Text>
            <View className="flex-row items-start">
              <Ionicons
                name="location-sharp"
                size={14}
                color="#E85D26"
                style={{ marginTop: 1 }}
              />
              <View className="ml-1.5 flex-1">
                <Text className="text-[#FFFFFF] text-xs font-bold">
                  {match.groundName}
                </Text>
                <Text className="text-[#A0A5AD] text-xs font-medium">
                  {match.area}
                </Text>
              </View>
            </View>
          </View>

          {/* Captain Approval Context & Fee */}
          <View className="py-3 border-b border-white/[0.08] flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-widest mb-0.5">
                APPROVED BY
              </Text>
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark" size={14} color="#E85D26" />
                <Text className="text-[#FFFFFF] text-xs font-bold ml-1.5">
                  {match.captainName || "Team Captain"}
                </Text>
              </View>
              <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider ml-5">
                MATCH HOST
              </Text>
            </View>

            {match.feePerPlayer && (
              <View className="items-end">
                <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-widest mb-0.5">
                  MATCH FEE
                </Text>
                <Text className="text-[#E85D26] text-xs font-bold">
                  {match.feePerPlayer}
                </Text>
                <Text className="text-[#5C616A] text-[9px]">per player</Text>
              </View>
            )}
          </View>

          {/* Arrival Notes */}
          <View className="pt-3">
            <View className="p-3 rounded-xl bg-[#1B1D22] border border-white/[0.08]">
              <View className="flex-row items-center mb-1">
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color="#E85D26"
                />
                <Text className="text-[#FFFFFF] text-xs font-bold uppercase tracking-wider ml-1.5">
                  ARRIVE 15 MIN EARLY
                </Text>
              </View>
              <Text className="text-[#A0A5AD] text-xs leading-4">
                {match.venueNotes ||
                  "Bring required playing kit and check in with the team captain at the venue."}
              </Text>
            </View>
          </View>
        </View>

        {/* Primary Action: OPEN MATCH CHAT */}
        <View className="px-4 mt-6">
          {chatAuthError && (
            <View className="p-3 mb-3 rounded-xl bg-[#F4A261]/10 border border-[#F4A261]/30 flex-row items-center">
              <Ionicons name="alert-circle" size={16} color="#F4A261" />
              <Text className="text-[#F4A261] text-xs font-semibold ml-2 flex-1">
                {chatAuthError}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleOpenMatchChat}
            disabled={openingChat}
            accessibilityRole="button"
            accessibilityLabel="Open Match Chat"
            className="w-full py-4 rounded-xl bg-[#E85D26] items-center justify-center shadow-sm active:scale-[0.99] active:opacity-90 flex-row"
          >
            {openingChat ? (
              <ActivityIndicator size="small" color="#0C0D0E" />
            ) : (
              <>
                <Ionicons name="chatbubbles" size={18} color="#0C0D0E" />
                <Text className="text-[#0C0D0E] text-sm font-black uppercase tracking-wider ml-2">
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
            className="w-full py-3.5 rounded-xl bg-[#141518]/25 border border-white/[0.08] items-center justify-center shadow-sm active:bg-[#1B1D22] flex-row"
          >
            <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
            <Text className="text-[#FFFFFF] text-xs font-bold uppercase tracking-wider ml-1.5">
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
            <Text className="text-[#A0A5AD] text-xs font-bold uppercase tracking-wider">
              BACK TO DISCOVER
            </Text>
          </Pressable>
        </View>
      </ThemedScroll>
    </ThemedScreen>
  );
}
