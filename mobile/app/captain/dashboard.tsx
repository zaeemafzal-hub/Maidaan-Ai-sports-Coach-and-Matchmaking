import { isActiveCapability } from "../../utils/capabilities";
import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";

import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/useAuthStore";
import { MatchSlotItem } from "../../constants/matches";
import { IMAGES } from "../../constants/images";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { ArenaBadge } from "../../components/ui/ArenaBadge";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { VenueBrowseCard } from "../../components/venues/VenueBrowseCard";
import { SpotProgressRing } from "../../components/ui/SpotProgressRing";
import { Sport, SkillLevel, CaptainProfile, User } from "../../types";
import { matchService } from "../../services/matchService";
import { teamService, TeamModel } from "../../services/teamService";
import { joinRequestService } from "../../services/joinRequestService";

// Sport display metadata
const SPORT_META: Record<
  Sport,
  { label: string; icon: "cricket" | "badminton" | "tennis" | "soccer" }
> = {
  football: { label: "Football", icon: "soccer" },
  cricket: { label: "Cricket", icon: "cricket" },
  padel: { label: "Padel", icon: "tennis" },
  badminton: { label: "Badminton", icon: "badminton" },
};

// Skill tier metadata conforming to Dark-Neutral Athletic design
const SKILL_METAS: Record<
  SkillLevel,
  { label: string; tierBadge: string; tag: string }
> = {
  beginner: {
    label: "Beginner",
    tierBadge: "Tier 3",
    tag: "Grassroots Casual",
  },
  intermediate: {
    label: "Intermediate",
    tierBadge: "Tier 2",
    tag: "Club Regular",
  },
  advanced: { label: "Advanced", tierBadge: "Tier 1", tag: "Premier Circuit" },
};

// Helper to map MatchSlotItem into presentation fixture model
const mapToCaptainFixture = (m: MatchSlotItem): CaptainFixture => {
  let status: "OPEN" | "FULL" | "UPCOMING" = "OPEN";
  if (m.slotsOpen === 0) {
    status = "FULL";
  } else if (
    m.date.toLowerCase().includes("tomorrow") ||
    m.date.toLowerCase().includes("wednesday") ||
    m.date.toLowerCase().includes("saturday")
  ) {
    status = m.slotsOpen > 0 ? "OPEN" : "FULL";
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
  status: "OPEN" | "FULL" | "UPCOMING";
}

export default function CaptainDashboardScreen() {
  const { currentUser, roles, activeMode, captainProfile } = useAuthStore();

  // Determine current effective role without modifying store
  const isCaptain = isActiveCapability(roles, activeMode, "TEAM_CAPTAIN");

  // =========================================================================
  // 1. ROLE GUARD: NON-CAPTAIN USER ACCESS
  // =========================================================================
  if (!isCaptain) {
    return (
      <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
        <ArenaHeader
          title="Captain Operations"
          subtitle="Role Restriction"
          showBack
          onBack={() => router.replace("/(tabs)/discover")}
        />

        <ThemedScroll
          kind="venues"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: "rgba(20,21,24,.24)",
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#1B1D22",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="shield-outline" size={30} color="#E85D26" />
            </View>

            <Text
              accessibilityRole="header"
              style={{
                color: "#FFFFFF",
                fontSize: 18,
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                textAlign: "center",
              }}
            >
              Captain Access Required
            </Text>

            <Text
              style={{
                color: "#A0A5AD",
                fontSize: 13,
                fontWeight: "500",
                textAlign: "center",
                marginTop: 10,
                lineHeight: 20,
                maxWidth: 280,
              }}
            >
              This workspace is reserved for Team Captain accounts to manage
              fixtures and team rosters.
            </Text>

            <View style={{ width: "100%", marginTop: 24, gap: 12 }}>
              <Pressable
                onPress={() => router.replace("/(tabs)/discover")}
                accessibilityRole="button"
                accessibilityLabel="Return to Discover"
                style={{
                  width: "100%",
                  backgroundColor: "#E85D26",
                  minHeight: 48,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#0C0D0E",
                    fontSize: 12,
                    fontWeight: "900",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Return to Discover
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/(tabs)/profile")}
                accessibilityRole="button"
                accessibilityLabel="Manage Roles in Profile"
                style={{
                  width: "100%",
                  backgroundColor: "#1B1D22",
                  minHeight: 48,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 12,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Manage Roles in Profile
                </Text>
              </Pressable>
            </View>
          </View>
        </ThemedScroll>
      </ThemedScreen>
    );
  }

  // =========================================================================
  // 2. MISSING CAPTAIN PROFILE: ONBOARDING REQUIRED
  // =========================================================================
  if (!captainProfile) {
    return (
      <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
        <ArenaHeader
          title="Captain Setup"
          subtitle="Profile Required"
          showBack
          onBack={() => router.replace("/(tabs)/discover")}
        />

        <ThemedScroll
          kind="venues"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: "rgba(20,21,24,.24)",
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "rgba(232,93,38,0.12)",
                borderWidth: 1,
                borderColor: "rgba(232,93,38,0.3)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="clipboard-outline" size={30} color="#E85D26" />
            </View>

            <Text
              accessibilityRole="header"
              style={{
                color: "#FFFFFF",
                fontSize: 18,
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                textAlign: "center",
              }}
            >
              Captain Profile Not Set
            </Text>

            <Text
              style={{
                color: "#A0A5AD",
                fontSize: 13,
                fontWeight: "500",
                textAlign: "center",
                marginTop: 10,
                lineHeight: 20,
                maxWidth: 280,
              }}
            >
              Complete your captain setup before scheduling matches and managing
              your squad.
            </Text>

            <View style={{ width: "100%", marginTop: 24, gap: 12 }}>
              <Pressable
                onPress={() => router.push("/onboarding/captain-setup")}
                accessibilityRole="button"
                accessibilityLabel="Complete Captain Setup"
                style={{
                  width: "100%",
                  backgroundColor: "#E85D26",
                  minHeight: 48,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#0C0D0E",
                    fontSize: 12,
                    fontWeight: "900",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Complete Captain Setup
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.replace("/(tabs)/discover")}
                accessibilityRole="button"
                accessibilityLabel="Return to Discover"
                style={{
                  width: "100%",
                  backgroundColor: "#1B1D22",
                  minHeight: 48,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 12,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Return to Discover
                </Text>
              </Pressable>
            </View>
          </View>
        </ThemedScroll>
      </ThemedScreen>
    );
  }

  return (
    <CaptainWorkspace
      captainProfile={captainProfile}
      currentUser={currentUser}
    />
  );
}

// Mount the workspace only after the existing guards pass. Its hook order stays
// stable while the asynchronous session/profile load updates the parent screen.
function CaptainWorkspace({
  captainProfile,
  currentUser,
}: {
  captainProfile: CaptainProfile;
  currentUser: User | null;
}) {
  const [filterTab, setFilterTab] = useState<"all" | "open" | "full">("all");
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  // =========================================================================
  // 3. CAPTAIN PROFILE SOURCE (Strict values without synthetic fallbacks)
  // =========================================================================
  const teamName = captainProfile.teamName?.trim() || "Team Name Not Set";
  const assignedSport: Sport | undefined = captainProfile.sports?.[0];
  const assignedSkill: SkillLevel | undefined = captainProfile.skillLevel;
  const primaryLocation =
    captainProfile.primaryLocation?.trim() || "Location Not Set";
  const captainName = currentUser?.name?.trim() || "Captain";

  const sportMeta = assignedSport ? SPORT_META[assignedSport] : null;
  const skillMeta = assignedSkill ? SKILL_METAS[assignedSkill] : null;

  // =========================================================================
  // 4. CAPTAIN FIXTURES MAPPING (Explicit Backend Ownership Only)
  // =========================================================================
  const [captainFixtures, setCaptainFixtures] = useState<CaptainFixture[]>([]);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState<boolean>(true);
  const [fixturesError, setFixturesError] = useState<string | null>(null);

  // Real Team Model & Recruitment State
  const [captainTeam, setCaptainTeam] = useState<TeamModel | null>(null);
  const [recruitingFixture, setRecruitingFixture] =
    useState<CaptainFixture | null>(null);
  const [recruitingSlots, setRecruitingSlots] = useState<number>(0);
  const [isUpdatingRecruitment, setIsUpdatingRecruitment] =
    useState<boolean>(false);

  const isMountedRef = React.useRef(true);

  const loadCaptainFixtures = React.useCallback(async () => {
    try {
      if (isMountedRef.current) {
        setIsLoadingFixtures(true);
        setFixturesError(null);
      }
      const [data, teamData] = await Promise.all([
        matchService.getCaptainMatches(),
        teamService.getMyTeam().catch(() => null),
      ]);
      if (isMountedRef.current) {
        setCaptainFixtures(data.map(mapToCaptainFixture));
        setCaptainTeam(teamData);
      }
      try {
        const reqPromises = data.map((m) =>
          joinRequestService.getMatchJoinRequests(m.id).catch(() => []),
        );
        const allReqArrays = await Promise.all(reqPromises);
        const totalPending = allReqArrays
          .flat()
          .filter((r) => r.status === "PENDING").length;
        if (isMountedRef.current) {
          setPendingRequestsCount(totalPending);
        }
      } catch {
        if (isMountedRef.current) {
          setPendingRequestsCount(0);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn(
          "[CaptainDashboard] Failed to fetch captain fixtures:",
          err,
        );
        setFixturesError(
          err?.message || "Failed to load captain fixtures. Please try again.",
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingFixtures(false);
      }
    }
  }, []);

  const handleOpenRecruitmentModal = (fixture: CaptainFixture) => {
    setRecruitingFixture(fixture);
    setRecruitingSlots(fixture.slotsOpen);
  };

  const handleSaveRecruitment = async () => {
    if (!recruitingFixture) return;
    try {
      setIsUpdatingRecruitment(true);
      await matchService.updateMatchRecruitment(
        recruitingFixture.id,
        recruitingSlots,
      );
      setCaptainFixtures((prev) =>
        prev.map((f) =>
          f.id === recruitingFixture.id
            ? {
                ...f,
                slotsOpen: recruitingSlots,
                status: recruitingSlots === 0 ? "FULL" : "OPEN",
              }
            : f,
        ),
      );
      setRecruitingFixture(null);
    } catch (err: any) {
      console.warn("[CaptainDashboard] Failed to update recruitment:", err);
    } finally {
      setIsUpdatingRecruitment(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      isMountedRef.current = true;
      loadCaptainFixtures();
      return () => {
        isMountedRef.current = false;
      };
    }, [loadCaptainFixtures]),
  );

  // Filter based on selected presentation tab
  const displayedFixtures = useMemo(() => {
    if (filterTab === "open") {
      return captainFixtures.filter((f) => f.slotsOpen > 0);
    }
    if (filterTab === "full") {
      return captainFixtures.filter((f) => f.slotsOpen === 0);
    }
    return captainFixtures;
  }, [captainFixtures, filterTab]);

  // Operational metrics calculated strictly from captain's owned fixtures
  const activeFixturesCount = captainFixtures.length;
  const totalOpenSlots = captainFixtures.reduce(
    (acc, f) => acc + f.slotsOpen,
    0,
  );

  // Featured match is the first scheduled fixture
  const featuredMatch = captainFixtures.length > 0 ? captainFixtures[0] : null;

  // Helper for open-slot vacancy presentation
  const getSlotPresentation = (slotsOpen: number) => {
    if (slotsOpen === 0) {
      return {
        label: "ROSTER FULL",
        badgeVariant: "stone" as const,
        textColor: "#5C616A",
      };
    }
    if (slotsOpen === 1) {
      return {
        label: "1 SLOT LEFT",
        badgeVariant: "rust" as const,
        textColor: "#F4A261",
      };
    }
    return {
      label: `${slotsOpen} OPEN SLOTS`,
      badgeVariant: "brand" as const,
      textColor: "#E85D26",
    };
  };

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
      {/* Cinematic Athletic Header */}
      <ArenaHeader
        title="Captain Desk"
        subtitle="Match Operations"
        showBack
        onBack={() => router.replace("/(tabs)/discover")}
        rightAction={
          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "#1B1D22",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="notifications-outline" size={19} color="#FFFFFF" />
          </Pressable>
        }
      />

      <ThemedScroll
        kind="venues"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 54 }}
      >
        <View style={{ padding: 16 }}>
          <VenueBrowseCard />
          <View style={{ marginTop: 12 }}>
            <PrimaryButton
              title="My venue bookings"
              variant="secondary"
              onPress={() => router.push("/bookings" as any)}
            />
          </View>
        </View>
        {/* Athletic Team Hero Banner */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <View
            style={{
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "rgba(20,21,24,.24)",
              position: "relative",
            }}
          >
            {/* Background Image with Cinematic Gradient Fade */}
            <View style={{ height: 110, width: "100%", position: "relative" }}>
              <Image
                source={IMAGES.arenaTeam}
                style={{ width: "100%", height: "100%", opacity: 0.25 }}
                resizeMode="cover"
              />
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(12,13,14,0.65)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: 14,
                  left: 16,
                  right: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <ArenaBadge label="CAPTAIN" variant="brand" size="sm" />
                  {skillMeta ? (
                    <View
                      style={{
                        backgroundColor: "rgba(255,255,255,0.08)",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.12)",
                      }}
                    >
                      <Text
                        style={{
                          color: "#A0A5AD",
                          fontSize: 10,
                          fontWeight: "700",
                          textTransform: "uppercase",
                        }}
                      >
                        {skillMeta.tierBadge}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {sportMeta ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#1B1D22",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <MaterialCommunityIcons
                      name={sportMeta.icon}
                      size={13}
                      color="#E85D26"
                    />
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 10,
                        fontWeight: "800",
                        textTransform: "uppercase",
                        marginLeft: 5,
                      }}
                    >
                      {sportMeta.label}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 16,
                  right: 16,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: "#FFFFFF",
                    fontSize: 22,
                    fontWeight: "900",
                    textTransform: "uppercase",
                    letterSpacing: -0.5,
                  }}
                >
                  {captainTeam?.name || teamName}
                </Text>
              </View>
            </View>

            {/* Sub-spec strip */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: "rgba(20,21,24,.24)",
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.06)",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="location-sharp" size={13} color="#E85D26" />
                <Text
                  numberOfLines={1}
                  style={{
                    color: "#A0A5AD",
                    fontSize: 12,
                    fontWeight: "600",
                    marginLeft: 4,
                    maxWidth: 170,
                  }}
                >
                  {captainTeam?.area || primaryLocation}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="person-circle-outline"
                  size={14}
                  color="#A0A5AD"
                />
                <Text
                  style={{
                    color: "#A0A5AD",
                    fontSize: 12,
                    fontWeight: "500",
                    marginLeft: 4,
                  }}
                >
                  Led by {captainName}
                </Text>
              </View>
            </View>

            {/* Squad Roster Strip */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: "#1B1D22",
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.06)",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="people-outline" size={15} color="#E85D26" />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 12,
                    fontWeight: "700",
                    marginLeft: 6,
                  }}
                >
                  {captainTeam?.memberCount
                    ? `${captainTeam.memberCount} Squad Members`
                    : "Official Team Roster"}
                </Text>
              </View>

              <Pressable
                onPress={() => router.push("/captain/team")}
                accessibilityRole="button"
                accessibilityLabel="Manage Squad Roster"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(232,93,38,0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(232,93,38,0.3)",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: "#E85D26",
                    fontSize: 11,
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginRight: 3,
                  }}
                >
                  Manage Roster
                </Text>
                <Ionicons name="chevron-forward" size={12} color="#E85D26" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* FEATURED MATCH CARD (If Active Matches Exist) */}
        {featuredMatch && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <View
              style={{
                backgroundColor: "rgba(20,21,24,.24)",
                borderRadius: 24,
                padding: 18,
                borderWidth: 1,
                borderColor: "rgba(232,93,38,0.3)",
                position: "relative",
                shadowColor: "#E85D26",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
              }}
            >
              {/* Card Tag & Sport */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <ArenaBadge
                    label="FEATURED FIXTURE"
                    variant="brand"
                    size="sm"
                  />
                  <Text
                    style={{
                      color: "#A0A5AD",
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                  >
                    {featuredMatch.date} · {featuredMatch.time}
                  </Text>
                </View>

                <ArenaBadge
                  label={featuredMatch.sportLabel.toUpperCase()}
                  variant="neutral"
                  size="sm"
                />
              </View>

              {/* Title & Progress Layout */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: "#FFFFFF",
                      fontSize: 17,
                      fontWeight: "900",
                      textTransform: "uppercase",
                      letterSpacing: -0.3,
                      lineHeight: 22,
                    }}
                  >
                    {featuredMatch.title}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 8,
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={13}
                      color="#A0A5AD"
                    />
                    <Text
                      numberOfLines={1}
                      style={{
                        color: "#A0A5AD",
                        fontSize: 12,
                        fontWeight: "500",
                        marginLeft: 4,
                      }}
                    >
                      {featuredMatch.groundName} · {featuredMatch.area}
                    </Text>
                  </View>
                </View>

                {/* Progress Ring Pattern Showing Filled Roster */}
                <View
                  style={{ alignItems: "center", justifyContent: "center" }}
                >
                  <SpotProgressRing
                    slotsOpen={featuredMatch.slotsOpen}
                    totalSlots={featuredMatch.totalSlots}
                    size={72}
                    strokeWidth={7}
                    glow={true}
                    displayMode="filled"
                    label="filled"
                  />
                </View>
              </View>

              {/* Manage Fixture Pill Button */}
              <View
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255,255,255,0.06)",
                }}
              >
                <Pressable
                  onPress={() => router.push(`/match/${featuredMatch.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Manage featured fixture ${featuredMatch.title}`}
                  style={{
                    backgroundColor: "#1B1D22",
                    minHeight: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(232,93,38,0.4)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#E85D26",
                      fontSize: 12,
                      fontWeight: "800",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Manage Fixture
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#E85D26" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* PRIMARY QUICK ACTIONS */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          {/* Action 1: CREATE MATCH (Solar Orange Primary CTA) */}
          <Pressable
            onPress={() => router.push("/captain/create-match")}
            accessibilityRole="button"
            accessibilityLabel="Create Match. Open new fixture for your squad"
            style={{
              width: "100%",
              backgroundColor: "#E85D26",
              minHeight: 56,
              borderRadius: 20,
              paddingHorizontal: 18,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: "#E85D26",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                marginRight: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="add" size={22} color="#E85D26" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#0C0D0E",
                    fontSize: 14,
                    fontWeight: "900",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Create Match
                </Text>
                <Text
                  style={{
                    color: "rgba(12,13,14,0.75)",
                    fontSize: 11,
                    fontWeight: "600",
                    marginTop: 1,
                  }}
                >
                  Open player slots & schedule local fixture
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#0C0D0E" />
          </Pressable>

          {/* Action 2: JOIN REQUESTS ATTENTION PANEL */}
          <Pressable
            onPress={() => router.push("/captain/join-requests")}
            accessibilityRole="button"
            accessibilityLabel={`Review join requests. ${pendingRequestsCount} athletes waiting for slot approval.`}
            style={{
              width: "100%",
              backgroundColor: "rgba(20,21,24,.24)",
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              marginTop: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: "#E85D26",
                    marginRight: 8,
                  }}
                />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 12,
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Join Requests Attention
                </Text>
              </View>
              <ArenaBadge
                label={`${pendingRequestsCount} PENDING`}
                variant="rust"
                size="sm"
              />
            </View>

            <Text
              style={{
                color: "#A0A5AD",
                fontSize: 12,
                lineHeight: 18,
                marginBottom: 10,
              }}
            >
              {pendingRequestsCount} athletes are waiting for slot approval on
              your active fixtures.
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.06)",
                minHeight: 28,
              }}
            >
              <Text
                style={{
                  color: "#E85D26",
                  fontSize: 12,
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Review Requests
              </Text>
              <Ionicons name="arrow-forward" size={15} color="#E85D26" />
            </View>
          </Pressable>

          {/* Action 3: MANAGE SQUAD ROSTER */}
          <Pressable
            onPress={() => router.push("/captain/team")}
            accessibilityRole="button"
            accessibilityLabel="Manage Team Squad and Roster"
            style={{
              width: "100%",
              backgroundColor: "rgba(20,21,24,.24)",
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              marginTop: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#1B1D22",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="people-outline" size={18} color="#E85D26" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  My Squad & Roster
                </Text>
                <Text
                  style={{
                    color: "#A0A5AD",
                    fontSize: 11,
                    fontWeight: "500",
                    marginTop: 1,
                  }}
                >
                  {captainTeam
                    ? `${captainTeam.name} • ${captainTeam.memberCount || 1} members`
                    : "Manage official team roster"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A0A5AD" />
          </Pressable>
        </View>

        {/* OPERATIONAL SUMMARY / METRICS */}
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <Text
            accessibilityRole="header"
            style={{
              color: "#A0A5AD",
              fontSize: 11,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 10,
              fontWeight: "700",
            }}
          >
            Match Operations
          </Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {/* Stat 1: Active Fixtures */}
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(20,21,24,.24)",
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <Text
                style={{
                  color: "#5C616A",
                  fontSize: 10,
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontWeight: "700",
                }}
              >
                FIXTURES
              </Text>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 24,
                  fontWeight: "900",
                  letterSpacing: -0.5,
                  marginTop: 2,
                }}
              >
                {activeFixturesCount}
              </Text>
              <Text
                style={{
                  color: "#A0A5AD",
                  fontSize: 10,
                  fontWeight: "500",
                  marginTop: 2,
                }}
              >
                Scheduled
              </Text>
            </View>

            {/* Stat 2: Open Slots */}
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(20,21,24,.24)",
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <Text
                style={{
                  color: "#5C616A",
                  fontSize: 10,
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontWeight: "700",
                }}
              >
                OPEN SLOTS
              </Text>
              <Text
                style={{
                  color: "#E85D26",
                  fontSize: 24,
                  fontWeight: "900",
                  letterSpacing: -0.5,
                  marginTop: 2,
                }}
              >
                {totalOpenSlots}
              </Text>
              <Text
                style={{
                  color: "#A0A5AD",
                  fontSize: 10,
                  fontWeight: "500",
                  marginTop: 2,
                }}
              >
                Vacancies
              </Text>
            </View>

            {/* Stat 3: Pending Requests */}
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(20,21,24,.24)",
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <Text
                style={{
                  color: "#5C616A",
                  fontSize: 10,
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontWeight: "700",
                }}
              >
                REQUESTS
              </Text>
              <Text
                style={{
                  color: "#F4A261",
                  fontSize: 24,
                  fontWeight: "900",
                  letterSpacing: -0.5,
                  marginTop: 2,
                }}
              >
                {pendingRequestsCount}
              </Text>
              <Text
                style={{
                  color: "#A0A5AD",
                  fontSize: 10,
                  fontWeight: "500",
                  marginTop: 2,
                }}
              >
                Pending
              </Text>
            </View>
          </View>
        </View>

        {/* FIXTURES SECTION: YOUR FIXTURES */}
        <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Your Fixtures
            </Text>
            <Text
              style={{
                color: "#5C616A",
                fontSize: 11,
                fontFamily: "monospace",
              }}
            >
              {displayedFixtures.length} of {captainFixtures.length} Shown
            </Text>
          </View>

          {/* Presentation Filter Tabs (44px min height touch target) */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "rgba(20,21,24,.24)",
              padding: 4,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              marginBottom: 14,
            }}
          >
            <Pressable
              onPress={() => setFilterTab("all")}
              accessibilityRole="button"
              accessibilityLabel="Show all captain fixtures"
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                backgroundColor:
                  filterTab === "all" ? "#E85D26" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: filterTab === "all" ? "#0C0D0E" : "#A0A5AD",
                }}
              >
                All ({captainFixtures.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setFilterTab("open")}
              accessibilityRole="button"
              accessibilityLabel="Show open slot fixtures"
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                backgroundColor:
                  filterTab === "open" ? "#E85D26" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: filterTab === "open" ? "#0C0D0E" : "#A0A5AD",
                }}
              >
                Open Slots
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setFilterTab("full")}
              accessibilityRole="button"
              accessibilityLabel="Show full roster fixtures"
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                backgroundColor:
                  filterTab === "full" ? "#E85D26" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: filterTab === "full" ? "#0C0D0E" : "#A0A5AD",
                }}
              >
                Roster Full
              </Text>
            </Pressable>
          </View>

          {/* FIXTURE CARDS, LOADING, ERROR OR EMPTY STATE */}
          {isLoadingFixtures ? (
            <View
              style={{
                backgroundColor: "rgba(20,21,24,.24)",
                borderRadius: 20,
                padding: 32,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="small" color="#E85D26" />
              <Text
                style={{
                  color: "#A0A5AD",
                  fontSize: 11,
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginTop: 12,
                }}
              >
                Syncing Captain Fixtures...
              </Text>
            </View>
          ) : fixturesError ? (
            <View
              style={{
                backgroundColor: "rgba(20,21,24,.24)",
                borderRadius: 20,
                padding: 24,
                borderWidth: 1,
                borderColor: "rgba(244,162,97,0.3)",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "rgba(244,162,97,0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(244,162,97,0.3)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name="cloud-offline-outline"
                  size={24}
                  color="#F4A261"
                />
              </View>

              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "900",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  textAlign: "center",
                }}
              >
                Failed to Load Fixtures
              </Text>

              <Text
                style={{
                  color: "#A0A5AD",
                  fontSize: 12,
                  fontWeight: "500",
                  textAlign: "center",
                  marginTop: 6,
                  lineHeight: 18,
                  maxWidth: 260,
                }}
              >
                {fixturesError}
              </Text>

              <View style={{ width: "100%", marginTop: 18 }}>
                <Pressable
                  onPress={loadCaptainFixtures}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading captain fixtures"
                  style={{
                    width: "100%",
                    backgroundColor: "#E85D26",
                    borderRadius: 12,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#0C0D0E",
                      fontSize: 12,
                      fontWeight: "900",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Retry
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : displayedFixtures.length === 0 ? (
            <View
              style={{
                backgroundColor: "rgba(20,21,24,.24)",
                borderRadius: 20,
                padding: 28,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "#1B1D22",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="calendar-outline" size={24} color="#A0A5AD" />
              </View>

              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "900",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  textAlign: "center",
                }}
              >
                No Fixtures on Your Board
              </Text>

              <Text
                style={{
                  color: "#A0A5AD",
                  fontSize: 12,
                  fontWeight: "500",
                  textAlign: "center",
                  marginTop: 6,
                  lineHeight: 18,
                  maxWidth: 260,
                }}
              >
                Create a match to open player slots in your local circuit.
              </Text>

              <View style={{ width: "100%", marginTop: 20 }}>
                <Pressable
                  onPress={() => router.push("/captain/create-match")}
                  accessibilityRole="button"
                  accessibilityLabel="Create Match"
                  style={{
                    width: "100%",
                    backgroundColor: "#E85D26",
                    borderRadius: 12,
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#0C0D0E",
                      fontSize: 12,
                      fontWeight: "900",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Create Match
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            displayedFixtures.map((fixture) => {
              const slotPresentation = getSlotPresentation(fixture.slotsOpen);
              const confirmedCount = fixture.totalSlots - fixture.slotsOpen;
              const fillRatio = Math.min(
                1,
                Math.max(0, confirmedCount / Math.max(1, fixture.totalSlots)),
              );

              return (
                <View
                  key={fixture.id}
                  style={{
                    backgroundColor: "rgba(20,21,24,.24)",
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <Pressable
                    onPress={() => router.push(`/match/${fixture.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Manage fixture ${fixture.title}, ${fixture.slotsOpen} open slots, at ${fixture.groundName}`}
                  >
                    {/* Top Bar: Sport and Slot Status Badge */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <ArenaBadge
                          label={fixture.sportLabel.toUpperCase()}
                          variant={
                            fixture.sport === "cricket" ? "rust" : "brand"
                          }
                          size="sm"
                        />
                        <Text
                          style={{
                            color: "#A0A5AD",
                            fontSize: 11,
                            fontFamily: "monospace",
                            marginLeft: 8,
                          }}
                        >
                          {fixture.date} · {fixture.time}
                        </Text>
                      </View>

                      <ArenaBadge
                        label={slotPresentation.label}
                        variant={slotPresentation.badgeVariant}
                        size="sm"
                      />
                    </View>

                    {/* Fixture Title */}
                    <Text
                      numberOfLines={1}
                      style={{
                        color: "#FFFFFF",
                        fontSize: 15,
                        fontWeight: "900",
                        textTransform: "uppercase",
                        letterSpacing: -0.3,
                        marginBottom: 8,
                      }}
                    >
                      {fixture.title}
                    </Text>

                    {/* Venue and Area */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 14,
                      }}
                    >
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color="#A0A5AD"
                      />
                      <Text
                        numberOfLines={1}
                        style={{
                          color: "#A0A5AD",
                          fontSize: 12,
                          fontWeight: "500",
                          marginLeft: 4,
                          flex: 1,
                        }}
                      >
                        {fixture.groundName} · {fixture.area}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Capacity Bar & Operational Status */}
                  <View
                    style={{
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: "rgba(255,255,255,0.06)",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 16 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {confirmedCount}/{fixture.totalSlots} Players
                        </Text>
                        <Text
                          style={{
                            color: slotPresentation.textColor,
                            fontSize: 10,
                            fontFamily: "monospace",
                            fontWeight: "700",
                          }}
                        >
                          {fixture.slotsOpen > 0
                            ? `${fixture.slotsOpen} OPEN`
                            : "FULL"}
                        </Text>
                      </View>

                      {/* Mini Capacity Track */}
                      <View
                        style={{
                          height: 4,
                          width: "100%",
                          backgroundColor: "#1B1D22",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            width: `${fillRatio * 100}%`,
                            backgroundColor:
                              fixture.slotsOpen === 0 ? "#5C616A" : "#E85D26",
                            borderRadius: 2,
                          }}
                        />
                      </View>
                    </View>

                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {/* Recruitment Quick Adjust Button */}
                      <Pressable
                        onPress={() => handleOpenRecruitmentModal(fixture)}
                        accessibilityRole="button"
                        accessibilityLabel={`Adjust open recruitment slots for ${fixture.title}`}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "rgba(232,93,38,0.12)",
                          paddingHorizontal: 10,
                          minHeight: 44,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: "rgba(232,93,38,0.3)",
                          marginRight: 8,
                        }}
                      >
                        <Ionicons
                          name="people-outline"
                          size={13}
                          color="#E85D26"
                        />
                        <Text
                          style={{
                            color: "#E85D26",
                            fontSize: 11,
                            fontWeight: "800",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginLeft: 4,
                          }}
                        >
                          Slots
                        </Text>
                      </Pressable>

                      {/* Manage Link Button (44px min touch target) */}
                      <Pressable
                        onPress={() => router.push(`/match/${fixture.id}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`Manage fixture ${fixture.title}`}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "#1B1D22",
                          paddingHorizontal: 12,
                          minHeight: 44,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.08)",
                        }}
                      >
                        <Text
                          style={{
                            color: "#E85D26",
                            fontSize: 11,
                            fontWeight: "800",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginRight: 4,
                          }}
                        >
                          Manage
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={13}
                          color="#E85D26"
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ThemedScroll>

      {/* RECRUITMENT CONTROL MODAL */}
      <Modal visible={!!recruitingFixture} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.8)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: "rgba(20,21,24,.24)",
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "900",
                  textTransform: "uppercase",
                }}
              >
                Open Slot Recruitment
              </Text>
              <Pressable onPress={() => setRecruitingFixture(null)}>
                <Ionicons name="close" size={20} color="#A0A5AD" />
              </Pressable>
            </View>

            {recruitingFixture && (
              <>
                <Text style={{ color: "#A0A5AD", fontSize: 12, marginTop: 4 }}>
                  {recruitingFixture.title} • {recruitingFixture.groundName}
                </Text>

                {/* Stepper Container */}
                <View
                  style={{
                    marginTop: 20,
                    alignItems: "center",
                    backgroundColor: "#1B1D22",
                    borderRadius: 16,
                    padding: 18,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <Text
                    style={{
                      color: "#5C616A",
                      fontSize: 10,
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                      fontWeight: "700",
                    }}
                  >
                    Available Public Slots
                  </Text>
                  <Text
                    style={{
                      color: recruitingSlots === 0 ? "#5C616A" : "#E85D26",
                      fontSize: 36,
                      fontWeight: "900",
                      marginVertical: 8,
                    }}
                  >
                    {recruitingSlots}
                  </Text>
                  <Text
                    style={{
                      color: recruitingSlots === 0 ? "#EF4444" : "#10B981",
                      fontSize: 11,
                      fontWeight: "700",
                      textTransform: "uppercase",
                    }}
                  >
                    {recruitingSlots === 0
                      ? "Recruitment Closed (Full)"
                      : "Active Recruitment"}
                  </Text>

                  {/* Increment/Decrement Buttons */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 16,
                      marginTop: 16,
                    }}
                  >
                    <Pressable
                      onPress={() =>
                        setRecruitingSlots((s) => Math.max(0, s - 1))
                      }
                      disabled={recruitingSlots <= 0}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: "rgba(20,21,24,.24)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.12)",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: recruitingSlots <= 0 ? 0.4 : 1,
                      }}
                    >
                      <Ionicons name="remove" size={22} color="#FFFFFF" />
                    </Pressable>

                    <Pressable
                      onPress={() => setRecruitingSlots(0)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: "rgba(239,68,68,0.1)",
                        borderWidth: 1,
                        borderColor: "rgba(239,68,68,0.3)",
                      }}
                    >
                      <Text
                        style={{
                          color: "#EF4444",
                          fontSize: 10,
                          fontWeight: "800",
                          textTransform: "uppercase",
                        }}
                      >
                        Close Roster
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        const maxAllowed = recruitingFixture.totalSlots;
                        setRecruitingSlots((s) => Math.min(maxAllowed, s + 1));
                      }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: "#E85D26",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="add" size={22} color="#0C0D0E" />
                    </Pressable>
                  </View>
                </View>

                {/* Save and Cancel buttons */}
                <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                  <Pressable
                    onPress={() => setRecruitingFixture(null)}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      borderRadius: 12,
                      backgroundColor: "#1B1D22",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.08)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#A0A5AD",
                        fontSize: 12,
                        fontWeight: "700",
                        textTransform: "uppercase",
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSaveRecruitment}
                    disabled={isUpdatingRecruitment}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      borderRadius: 12,
                      backgroundColor: "#E85D26",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isUpdatingRecruitment ? (
                      <ActivityIndicator size="small" color="#0C0D0E" />
                    ) : (
                      <Text
                        style={{
                          color: "#0C0D0E",
                          fontSize: 12,
                          fontWeight: "900",
                          textTransform: "uppercase",
                        }}
                      >
                        Save Slots
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}
