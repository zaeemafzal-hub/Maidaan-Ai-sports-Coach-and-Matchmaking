import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { ArenaBadge } from "../../components/ui/ArenaBadge";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useAuthStore } from "../../store/useAuthStore";
import { HubDashboardSummary, HubCourt, Sport } from "../../types";
import { hubCourtService } from "../../services/hubCourtService";

const SPORT_META: Record<
  Sport,
  { label: string; icon: "soccer" | "cricket" | "tennis" | "badminton" }
> = {
  football: { label: "Football", icon: "soccer" },
  cricket: { label: "Cricket", icon: "cricket" },
  padel: { label: "Padel", icon: "tennis" },
  badminton: { label: "Badminton", icon: "badminton" },
};

export default function HubDashboardScreen() {
  const { roles, activeMode, hubOwnerProfile, currentUser } = useAuthStore();

  const isHubOwner = roles.includes("HUB_OWNER") && activeMode === "HUB_OWNER";

  const [summary, setSummary] = useState<HubDashboardSummary | null>(null);
  const [courts, setCourts] = useState<HubCourt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);

  const fetchDashboardData = useCallback(async (isPullToRefresh = false) => {
    try {
      if (!isPullToRefresh) {
        setLoading(true);
      }
      setErrorMessage(null);

      const [summaryData, courtsData] = await Promise.all([
        hubCourtService.getDashboardSummary(),
        hubCourtService.getCourts(),
      ]);

      if (isMountedRef.current) {
        setSummary(summaryData);
        setCourts(courtsData);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMessage(err?.message || "Failed to load hub dashboard data.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      fetchDashboardData();
      return () => {
        isMountedRef.current = false;
      };
    }, [fetchDashboardData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(true);
  };

  // 1. Authorization Guard
  if (!isHubOwner) {
    return (
      <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
        <ArenaHeader
          title="Hub Workspace"
          subtitle="Access Restricted"
          showBack
          fallbackRoute="/(tabs)/profile"
        />
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/20 items-center justify-center mb-4">
            <Ionicons name="lock-closed" size={28} color="#EF4444" />
          </View>
          <Text className="text-white text-lg font-bold mb-2 text-center">
            Hub Owner Capability Required
          </Text>
          <Text className="text-[#8E9298] text-sm text-center mb-6 leading-5">
            You do not currently possess the HUB_OWNER role. Enable Hub Owner
            capability in your profile to operate a sports venue.
          </Text>
          <PrimaryButton
            title="Return to Profile"
            onPress={() => router.replace("/(tabs)/profile")}
          />
        </View>
      </ThemedScreen>
    );
  }

  // 2. Incomplete Setup Guard
  if (!loading && !summary && !hubOwnerProfile) {
    return (
      <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
        <ArenaHeader
          title="Hub Workspace"
          subtitle="Setup Incomplete"
          showBack
          fallbackRoute="/(tabs)/profile"
        />
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-[#1B1E22] border border-[#2B2F36] items-center justify-center mb-4">
            <Ionicons name="business-outline" size={28} color="#E85D26" />
          </View>
          <Text className="text-white text-lg font-bold mb-2 text-center">
            Register Your Sports Venue
          </Text>
          <Text className="text-[#8E9298] text-sm text-center mb-6 leading-5">
            Complete your hub setup by providing your facility name, sports
            supported, and location.
          </Text>
          <PrimaryButton
            title="Complete Hub Setup"
            onPress={() => router.push("/onboarding/hub-setup")}
          />
        </View>
      </ThemedScreen>
    );
  }

  const hubData =
    summary?.hub ||
    (hubOwnerProfile
      ? {
          id: hubOwnerProfile.userId,
          name: hubOwnerProfile.hubName,
          location: hubOwnerProfile.location,
          contactNumber: hubOwnerProfile.contactNumber || null,
          sports: hubOwnerProfile.sports || [],
          courtCount: hubOwnerProfile.courtsCount || 0,
          isVerified: hubOwnerProfile.isVerified,
        }
      : null);

  const verificationStatus =
    summary?.verification?.status ||
    (hubOwnerProfile?.isVerified ? "APPROVED" : "NOT_SUBMITTED");
  const adminNote = summary?.verification?.adminNote;

  const totalCourts = summary?.courts?.total ?? courts.length;
  const availableCourts =
    summary?.courts?.available ??
    courts.filter((c) => c.status === "AVAILABLE").length;
  const limitedCourts =
    summary?.courts?.limited ??
    courts.filter((c) => c.status === "LIMITED").length;
  const unavailableCourts =
    summary?.courts?.unavailable ??
    courts.filter((c) => c.status === "UNAVAILABLE").length;

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
      <ArenaHeader
        title="Hub Workspace"
        subtitle="Venue Operations & Facilities"
        showBack
        fallbackRoute="/(tabs)/profile"
        rightAction={
          <Pressable
            onPress={() => router.push("/hub/profile")}
            className="w-10 h-10 rounded-xl bg-[#141518]/25 border border-white/[0.08] items-center justify-center"
          >
            <Ionicons name="settings-outline" size={18} color="#A0A5AD" />
          </Pressable>
        }
      />

      <ThemedScroll
        kind="form"
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#E85D26"
            colors={["#E85D26"]}
          />
        }
      >
        {loading && !refreshing ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#E85D26" />
            <Text className="text-[#8E9298] text-xs font-semibold tracking-wider mt-3">
              Loading workspace...
            </Text>
          </View>
        ) : (
          <View className="px-5 pt-3">
            {errorMessage && (
              <View className="mb-4 p-3.5 rounded-xl bg-red-950/40 border border-red-500/20 flex-row items-center">
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#EF4444"
                />
                <Text className="ml-2 text-red-200 text-xs flex-1">
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Venue Hero Card */}
            <View className="p-5 rounded-2xl bg-[#141518]/25 border border-white/[0.08] mb-5">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1 pr-3">
                  <Text className="text-white text-xl font-bold tracking-tight">
                    {hubData?.name || "Sports Venue"}
                  </Text>
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color="#8E9298"
                    />
                    <Text className="text-[#8E9298] text-xs ml-1 font-medium">
                      {hubData?.location || "Lahore"}
                    </Text>
                  </View>
                  {hubData?.contactNumber && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="call-outline" size={13} color="#8E9298" />
                      <Text className="text-[#8E9298] text-xs ml-1 font-medium">
                        {hubData.contactNumber}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Verification Badge */}
                {verificationStatus === "APPROVED" ? (
                  <View className="flex-row items-center px-2.5 py-1 rounded-full bg-[#1B3B2B] border border-[#22C55E]/30">
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color="#22C55E"
                    />
                    <Text className="text-[#22C55E] text-[10px] font-bold uppercase tracking-wider ml-1">
                      Verified
                    </Text>
                  </View>
                ) : verificationStatus === "PENDING" ? (
                  <View className="flex-row items-center px-2.5 py-1 rounded-full bg-[#3B2C1A] border border-[#EAB308]/30">
                    <Ionicons name="time-outline" size={12} color="#EAB308" />
                    <Text className="text-[#EAB308] text-[10px] font-bold uppercase tracking-wider ml-1">
                      Pending
                    </Text>
                  </View>
                ) : verificationStatus === "REJECTED" ? (
                  <View className="flex-row items-center px-2.5 py-1 rounded-full bg-[#3B1A1A] border border-[#EF4444]/30">
                    <Ionicons name="close-circle" size={12} color="#EF4444" />
                    <Text className="text-[#EF4444] text-[10px] font-bold uppercase tracking-wider ml-1">
                      Action Req.
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center px-2.5 py-1 rounded-full bg-[#20242A] border border-white/10">
                    <Ionicons name="shield-outline" size={12} color="#8E9298" />
                    <Text className="text-[#8E9298] text-[10px] font-bold uppercase tracking-wider ml-1">
                      Unverified
                    </Text>
                  </View>
                )}
              </View>

              {/* Supported Sports Chips */}
              <View className="flex-row flex-wrap gap-1.5 pt-2 border-t border-white/[0.06]">
                {(hubData?.sports || []).map((sport: Sport) => {
                  const meta = SPORT_META[sport];
                  return (
                    <View
                      key={sport}
                      className="flex-row items-center px-2.5 py-1 rounded-lg bg-[#1B1E22] border border-white/[0.06]"
                    >
                      <MaterialCommunityIcons
                        name={meta?.icon || "soccer"}
                        size={12}
                        color="#E85D26"
                      />
                      <Text className="text-white/80 text-[11px] font-semibold ml-1 capitalize">
                        {sport}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 10, marginBottom: 18 }}>
              <PrimaryButton
                title="VENUE RESERVATIONS"
                onPress={() => router.push("/bookings?scope=owner" as any)}
              />
              <PrimaryButton
                title="VENUE DETAILS & PHOTOS"
                onPress={() => router.push("/hub/profile")}
              />
              <PrimaryButton
                title="PLAYING SPACES & AVAILABILITY"
                onPress={() => router.push("/hub/courts")}
              />
              <PrimaryButton
                title="PREVIEW PUBLIC VENUE"
                onPress={() => router.push(`/hubs/${currentUser?.id}` as any)}
              />
            </View>
            {/* Verification Status Alert Banner */}
            {verificationStatus === "REJECTED" && (
              <View className="p-4 rounded-2xl bg-[#3B1A1A]/70 border border-[#EF4444]/30 mb-5">
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text className="text-red-200 text-sm font-bold ml-2">
                    Verification Rejected
                  </Text>
                </View>
                <Text className="text-[#D1D5DB] text-xs leading-4 mb-3">
                  {adminNote ||
                    "Admin requested updates before this venue can be verified."}
                </Text>
                <Pressable
                  onPress={() => router.push("/hub/verification")}
                  className="py-2.5 px-4 rounded-xl bg-[#EF4444] items-center justify-center flex-row"
                >
                  <Text className="text-white text-xs font-bold uppercase tracking-wider">
                    Review & Resubmit
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color="#FFFFFF"
                    className="ml-1"
                  />
                </Pressable>
              </View>
            )}

            {verificationStatus === "NOT_SUBMITTED" && (
              <View className="p-4 rounded-2xl bg-[#1B1E22] border border-[#E85D26]/20 mb-5 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-white text-xs font-bold uppercase tracking-wider">
                    Official Hub Verification
                  </Text>
                  <Text className="text-[#8E9298] text-[11px] mt-0.5">
                    Verify your venue to stand out on player discovery.
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push("/hub/verification")}
                  className="px-3.5 py-2 rounded-xl bg-[#E85D26] items-center justify-center"
                >
                  <Text className="text-white text-xs font-bold">Verify</Text>
                </Pressable>
              </View>
            )}

            {verificationStatus === "PENDING" && (
              <View className="p-4 rounded-2xl bg-[#3B2C1A]/60 border border-[#EAB308]/20 mb-5 flex-row items-center">
                <Ionicons name="time" size={18} color="#EAB308" />
                <View className="ml-3 flex-1">
                  <Text className="text-[#EAB308] text-xs font-bold uppercase tracking-wider">
                    Verification In Review
                  </Text>
                  <Text className="text-[#A0A5AD] text-[11px] mt-0.5">
                    Platform administrators are evaluating your venue profile.
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push("/hub/verification")}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10"
                >
                  <Text className="text-white text-[11px] font-semibold">
                    Details
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Section: Court Availability Breakdown */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-white text-sm font-bold uppercase tracking-wider">
                  Court Availability
                </Text>
                <Pressable
                  onPress={() => router.push("/hub/courts")}
                  className="flex-row items-center"
                >
                  <Text className="text-[#E85D26] text-xs font-semibold mr-1">
                    Manage
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#E85D26" />
                </Pressable>
              </View>

              <View className="flex-row gap-2.5">
                {/* Total */}
                <View className="flex-1 p-3.5 rounded-2xl bg-[#141518]/25 border border-white/[0.08] items-center">
                  <Text className="text-[#8E9298] text-[10px] font-bold uppercase tracking-wider mb-1">
                    Total
                  </Text>
                  <Text className="text-white text-xl font-bold">
                    {totalCourts}
                  </Text>
                </View>

                {/* Available */}
                <View className="flex-1 p-3.5 rounded-2xl bg-[#141518]/25 border border-white/[0.08] items-center">
                  <Text className="text-[#22C55E] text-[10px] font-bold uppercase tracking-wider mb-1">
                    Available
                  </Text>
                  <Text className="text-[#22C55E] text-xl font-bold">
                    {availableCourts}
                  </Text>
                </View>

                {/* Limited */}
                <View className="flex-1 p-3.5 rounded-2xl bg-[#141518]/25 border border-white/[0.08] items-center">
                  <Text className="text-[#EAB308] text-[10px] font-bold uppercase tracking-wider mb-1">
                    Limited
                  </Text>
                  <Text className="text-[#EAB308] text-xl font-bold">
                    {limitedCourts}
                  </Text>
                </View>

                {/* Unavailable */}
                <View className="flex-1 p-3.5 rounded-2xl bg-[#141518]/25 border border-white/[0.08] items-center">
                  <Text className="text-[#8E9298] text-[10px] font-bold uppercase tracking-wider mb-1">
                    Offline
                  </Text>
                  <Text className="text-[#8E9298] text-xl font-bold">
                    {unavailableCourts}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions Grid */}
            <View className="flex-row gap-3 mb-6">
              <Pressable
                onPress={() => router.push("/hub/courts")}
                className="flex-1 p-4 rounded-2xl bg-[#E85D26] items-center justify-center flex-row"
              >
                <Ionicons name="tennisball-outline" size={18} color="#FFFFFF" />
                <Text className="text-white text-xs font-bold uppercase tracking-wider ml-2">
                  Courts ({totalCourts})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/hub/profile")}
                className="flex-1 p-4 rounded-2xl bg-[#141518]/25 border border-white/[0.08] items-center justify-center flex-row"
              >
                <Ionicons name="pencil-outline" size={16} color="#A0A5AD" />
                <Text className="text-white text-xs font-bold uppercase tracking-wider ml-2">
                  Edit Venue
                </Text>
              </Pressable>
            </View>

            {/* Courts Preview Section */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-white text-sm font-bold uppercase tracking-wider">
                  Registered Courts
                </Text>
                <Pressable
                  onPress={() => router.push("/hub/courts")}
                  className="px-2.5 py-1 rounded-lg bg-[#141518]/25 border border-white/[0.08]"
                >
                  <Text className="text-[#A0A5AD] text-xs font-semibold">
                    + Add Court
                  </Text>
                </Pressable>
              </View>

              {courts.length === 0 ? (
                <View className="p-6 rounded-2xl bg-[#141518]/25 border border-white/[0.08] items-center">
                  <Ionicons name="layers-outline" size={28} color="#4B5563" />
                  <Text className="text-white text-sm font-semibold mt-2">
                    No courts registered
                  </Text>
                  <Text className="text-[#8E9298] text-xs text-center mt-1">
                    Add your court facilities to open them for recreational
                    bookings and fixtures.
                  </Text>
                  <Pressable
                    onPress={() => router.push("/hub/courts")}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#E85D26]"
                  >
                    <Text className="text-white text-xs font-bold">
                      Add First Court
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View className="gap-2.5">
                  {courts.slice(0, 5).map((court) => (
                    <Pressable
                      key={court.id}
                      onPress={() => router.push("/hub/courts")}
                      className="p-3.5 rounded-xl bg-[#141518]/25 border border-white/[0.08] flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center flex-1 pr-2">
                        <View className="w-8 h-8 rounded-lg bg-[#1B1E22] items-center justify-center mr-3">
                          <MaterialCommunityIcons
                            name={SPORT_META[court.sport]?.icon || "soccer"}
                            size={16}
                            color="#E85D26"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white text-xs font-bold">
                            {court.name}
                          </Text>
                          <Text className="text-[#8E9298] text-[10px] capitalize font-medium">
                            {court.sport}
                          </Text>
                        </View>
                      </View>

                      <View
                        className={`px-2 py-0.5 rounded-md ${
                          court.status === "AVAILABLE"
                            ? "bg-green-950/60 border border-green-500/30"
                            : court.status === "LIMITED"
                              ? "bg-amber-950/60 border border-amber-500/30"
                              : "bg-zinc-800 border border-zinc-700"
                        }`}
                      >
                        <Text
                          className={`text-[9px] font-bold uppercase tracking-wider ${
                            court.status === "AVAILABLE"
                              ? "text-green-400"
                              : court.status === "LIMITED"
                                ? "text-amber-400"
                                : "text-zinc-400"
                          }`}
                        >
                          {court.status}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                  {courts.length > 5 && (
                    <Pressable
                      onPress={() => router.push("/hub/courts")}
                      className="py-2 items-center"
                    >
                      <Text className="text-[#8E9298] text-xs font-semibold">
                        View all {courts.length} courts →
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </ThemedScroll>
    </ThemedScreen>
  );
}
