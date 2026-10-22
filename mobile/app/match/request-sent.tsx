import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState, useCallback } from "react";
import { View, Text, Pressable, Image, ActivityIndicator } from "../../components/theme/Primitives";

import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "../../components/theme/Icons";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { ArenaBadge } from "../../components/ui/ArenaBadge";
import { IMAGES } from "../../constants/images";
import { MatchSlotItem } from "../../constants/matches";
import { matchService } from "../../services/matchService";
import {
  joinRequestService,
  JoinRequest,
} from "../../services/joinRequestService";
import { Sport } from "../../types";

const getSportPhoto = (sport: Sport) => {
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
      return IMAGES.arenaHome;
  }
};

const getSportIcon = (
  sport: Sport,
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

export default function RequestSentScreen() {
  const { matchId, requestId } = useLocalSearchParams<{
    matchId?: string;
    requestId?: string;
  }>();

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
        console.warn("[RequestSentScreen] Failed to load request status:", err);
        setError(
          "Unable to load latest request status. Please check your connection.",
        );
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
    }, [loadData]),
  );

  const handleBackToDiscover = () => {
    router.replace("/(tabs)/discover");
  };

  const handleViewConfirmedSpot = () => {
    const targetMatchId = matchId || request?.matchId;
    if (targetMatchId) {
      router.push({
        pathname: "/match/confirmed",
        params: { matchId: targetMatchId },
      });
    } else {
      router.replace("/(tabs)/discover");
    }
  };

  const handleViewMatchDetails = () => {
    const targetMatchId = matchId || request?.matchId;
    if (targetMatchId) {
      router.push(`/match/${targetMatchId}`);
    } else {
      router.replace("/(tabs)/discover");
    }
  };

  const status = request?.status || "PENDING";

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      {/* Modern Header */}
      <ArenaHeader
        title="Request Status"
        subtitle="Match squad call-up"
        showBack
        onBack={handleBackToDiscover}
      />

      <ThemedScroll
        kind="venues"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1"
      >
        {isLoading && !request && !match ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#E85D26" />
            <Text className="text-[#A0A5AD] text-xs font-semibold tracking-wider mt-4">
              SYNCING REQUEST STATUS...
            </Text>
          </View>
        ) : (
          <>
            <View className="px-5 pt-6 items-center">
              {/* Status Icon */}
              {status === "ACCEPTED" ? (
                <View className="w-16 h-16 rounded-full bg-[#E85D26]/15 border-2 border-[#E85D26] items-center justify-center mb-4">
                  <Ionicons name="checkmark-done" size={32} color="#E85D26" />
                </View>
              ) : status === "REJECTED" ? (
                <View className="w-16 h-16 rounded-full bg-[#F4A261]/15 border-2 border-[#F4A261] items-center justify-center mb-4">
                  <Ionicons name="close" size={32} color="#F4A261" />
                </View>
              ) : (
                <View className="w-16 h-16 rounded-full bg-[#E85D26]/10 border-2 border-[#E85D26]/40 items-center justify-center mb-4">
                  <Ionicons name="checkmark-sharp" size={32} color="#E85D26" />
                </View>
              )}

              {/* Headings */}
              <Text className="text-[#FFFFFF] text-2xl font-black uppercase tracking-tight text-center">
                {status === "ACCEPTED"
                  ? "REQUEST ACCEPTED"
                  : status === "REJECTED"
                    ? "REQUEST DECLINED"
                    : "REQUEST SENT"}
              </Text>

              {/* Status Badge */}
              <View
                className={`mt-2 px-3 py-1 rounded-full border ${
                  status === "ACCEPTED"
                    ? "bg-[#E85D26]/15 border-[#E85D26]"
                    : status === "REJECTED"
                      ? "bg-[#F4A261]/15 border-[#F4A261]"
                      : "bg-white/5 border-white/[0.08]"
                }`}
              >
                <Text
                  className={`text-xs font-bold uppercase tracking-wider ${
                    status === "ACCEPTED"
                      ? "text-[#E85D26]"
                      : status === "REJECTED"
                        ? "text-[#F4A261]"
                        : "text-[#A0A5AD]"
                  }`}
                >
                  {status === "ACCEPTED"
                    ? "SPOT CONFIRMED BY CAPTAIN"
                    : status === "REJECTED"
                      ? "CAPTAIN DECLINED SLOT REQUEST"
                      : "AWAITING CAPTAIN APPROVAL"}
                </Text>
              </View>

              {/* Explanatory Context Copy */}
              <Text className="text-[#A0A5AD] text-xs font-medium text-center mt-3 max-w-[320px] leading-5">
                {status === "ACCEPTED"
                  ? "Congratulations! The match captain accepted your request. Your spot on the match roster is confirmed."
                  : status === "REJECTED"
                    ? "The team captain was unable to accommodate your slot request for this fixture. Explore other open matches."
                    : "Your request has been sent to the match captain. You'll see updates here when they accept or decline."}
              </Text>
            </View>

            {/* Request Progression Status Board */}
            <View className="mx-4 mt-6 bg-[#141518]/25 border border-white/[0.08] rounded-2xl p-4 shadow-sm">
              <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider mb-3">
                MATCHMAKING PROGRESSION
              </Text>

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
                      Player profile and slot request registered on server.
                    </Text>
                  </View>
                </View>

                {/* Step 2: Captain Review */}
                <View className="flex-row items-center mt-2 pt-2 border-t border-white/[0.08]">
                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                      status !== "PENDING"
                        ? "bg-[#E85D26]"
                        : "bg-[#F4A261]/20 border border-[#F4A261]"
                    }`}
                  >
                    <Ionicons
                      name={status !== "PENDING" ? "checkmark" : "time-outline"}
                      size={14}
                      color={status !== "PENDING" ? "#0C0D0E" : "#F4A261"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-xs font-bold uppercase tracking-wide ${
                        status === "PENDING"
                          ? "text-[#F4A261]"
                          : "text-[#FFFFFF]"
                      }`}
                    >
                      02. Captain Review{" "}
                      {status === "PENDING" ? "(Pending)" : "(Evaluated)"}
                    </Text>
                    <Text className="text-[#A0A5AD] text-[11px] font-medium">
                      Team captain evaluated lineup balance and roster
                      availability.
                    </Text>
                  </View>
                </View>

                {/* Step 3: Decision */}
                <View className="flex-row items-center mt-2 pt-2 border-t border-white/[0.08]">
                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                      status === "ACCEPTED"
                        ? "bg-[#E85D26]"
                        : status === "REJECTED"
                          ? "bg-[#F4A261]"
                          : "bg-[#1B1D22] border border-white/[0.08]"
                    }`}
                  >
                    <Ionicons
                      name={
                        status === "ACCEPTED"
                          ? "checkmark"
                          : status === "REJECTED"
                            ? "close"
                            : "radio-button-off"
                      }
                      size={13}
                      color={status !== "PENDING" ? "#0C0D0E" : "#5C616A"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-xs font-bold uppercase tracking-wide ${
                        status === "ACCEPTED"
                          ? "text-[#E85D26]"
                          : status === "REJECTED"
                            ? "text-[#F4A261]"
                            : "text-[#5C616A]"
                      }`}
                    >
                      03. Final Decision{" "}
                      {status !== "PENDING" ? `(${status})` : ""}
                    </Text>
                    <Text className="text-[#A0A5AD] text-[11px] font-medium">
                      {status === "ACCEPTED"
                        ? "Player confirmed in match lineup."
                        : status === "REJECTED"
                          ? "Request declined. Slot remains closed for this athlete."
                          : "Spot confirmed upon acceptance."}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Match Summary Ticket */}
            {match && (
              <View className="mx-4 mt-4 bg-[#141518]/25 border border-white/[0.08] rounded-2xl overflow-hidden shadow-sm">
                <View className="h-28 w-full relative bg-[#1B1D22]">
                  <Image
                    source={getSportPhoto(match.sport)}
                    className="w-full h-full object-cover"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-[#0C0D0E]/60" />

                  <View className="absolute top-3 left-3 right-3 flex-row items-center justify-between">
                    <View className="flex-row items-center bg-[#141518]/90 px-2.5 py-1 rounded-lg border border-white/[0.08]">
                      <MaterialCommunityIcons
                        name={getSportIcon(match.sport)}
                        size={12}
                        color="#E85D26"
                        style={{ marginRight: 4 }}
                      />
                      <Text className="text-[#FFFFFF] text-[10px] font-bold uppercase tracking-wider">
                        {match.sportLabel}
                      </Text>
                    </View>

                    <ArenaBadge
                      label={
                        status === "ACCEPTED"
                          ? "CONFIRMED"
                          : status === "REJECTED"
                            ? "DECLINED"
                            : "PENDING"
                      }
                      variant={
                        status === "ACCEPTED"
                          ? "olive"
                          : status === "REJECTED"
                            ? "rust"
                            : "stone"
                      }
                    />
                  </View>

                  <View className="absolute bottom-2.5 left-3 right-3">
                    <Text
                      numberOfLines={1}
                      className="text-[#FFFFFF] text-base font-bold uppercase tracking-tight"
                    >
                      {match.title}
                    </Text>
                  </View>
                </View>

                <View className="p-4">
                  <View className="flex-row items-center justify-between pb-3 border-b border-dashed border-white/[0.08]">
                    <View>
                      <Text className="text-[#5C616A] text-[10px] font-bold uppercase">
                        SCHEDULED TIME
                      </Text>
                      <Text className="text-[#FFFFFF] text-xs font-bold uppercase mt-0.5">
                        {match.date} • {match.startTime || match.time}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-[#5C616A] text-[10px] font-bold uppercase">
                        SKILL LEVEL
                      </Text>
                      <Text className="text-[#FFFFFF] text-xs font-bold uppercase mt-0.5">
                        {match.skillLevel}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3 flex-row items-start">
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
                      <Text className="text-[#A0A5AD] text-[11px] font-medium">
                        {match.area}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3.5 pt-3 border-t border-white/[0.08] flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 pr-2">
                      <View className="w-8 h-8 rounded-lg bg-[#1B1D22] items-center justify-center mr-2 border border-white/[0.08]">
                        <Ionicons
                          name="shield-outline"
                          size={14}
                          color="#E85D26"
                        />
                      </View>
                      <View>
                        <Text className="text-[#5C616A] text-[10px] font-bold uppercase">
                          REQUEST SENT TO
                        </Text>
                        <Text className="text-[#FFFFFF] text-xs font-bold uppercase">
                          {match.captainName || "Team Captain"}
                        </Text>
                      </View>
                    </View>

                    <View className="bg-[#1B1D22] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                      <Text className="text-[#A0A5AD] text-[10px] font-bold uppercase">
                        MATCH HOST
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View className="mx-4 mt-6 space-y-3">
              {status === "ACCEPTED" ? (
                /* Accepted CTA: View Confirmed Spot */
                <Pressable
                  onPress={handleViewConfirmedSpot}
                  accessibilityRole="button"
                  accessibilityLabel="View Confirmed Spot"
                  className="w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-[#E85D26] items-center justify-center shadow-sm active:scale-[0.98] active:opacity-90 flex-row"
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#0C0D0E"
                    style={{ marginRight: 6 }}
                  />
                  <Text className="text-[#0C0D0E] text-sm font-black uppercase tracking-wider">
                    VIEW CONFIRMED SPOT
                  </Text>
                </Pressable>
              ) : (
                /* Pending / Rejected CTA: Back to Discover */
                <Pressable
                  onPress={handleBackToDiscover}
                  accessibilityRole="button"
                  accessibilityLabel="Back to Discover"
                  className="w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-[#E85D26] items-center justify-center shadow-sm active:scale-[0.98] active:opacity-90 flex-row"
                >
                  <Ionicons
                    name="search"
                    size={15}
                    color="#0C0D0E"
                    style={{ marginRight: 6 }}
                  />
                  <Text className="text-[#0C0D0E] text-sm font-black uppercase tracking-wider">
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
                  <Text className="text-[#E85D26] text-xs font-bold uppercase tracking-wider">
                    VIEW MATCH DETAILS
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </ThemedScroll>
    </ThemedScreen>
  );
}
