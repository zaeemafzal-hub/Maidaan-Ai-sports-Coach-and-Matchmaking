import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "../../components/theme/Primitives";

import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "../../components/theme/Icons";
import { useAuthStore } from "../../store/useAuthStore";
import { Sport, SkillLevel } from "../../types";
import { profileService } from "../../services/profileService";
import { SportCard } from "../../components/ui/SportCard";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { FormInput } from "../../components/ui/FormInput";
import { IMAGES } from "../../constants/images";

interface SportConfig {
  sport: Sport;
  label: string;
  iconName: "cricket" | "badminton" | "tennis" | "soccer";
}

const ALL_SPORTS: SportConfig[] = [
  { sport: "cricket", label: "Cricket", iconName: "cricket" },
  { sport: "badminton", label: "Badminton", iconName: "badminton" },
  { sport: "padel", label: "Padel", iconName: "tennis" },
  { sport: "football", label: "Football", iconName: "soccer" },
];

interface SkillTierConfig {
  key: SkillLevel;
  label: string;
  tagline: string;
  badge: string;
}

const SKILL_TIERS: SkillTierConfig[] = [
  {
    key: "beginner",
    label: "Beginner",
    tagline: "Grassroots & friendly casual fixtures",
    badge: "TIER 1",
  },
  {
    key: "intermediate",
    label: "Intermediate",
    tagline: "Club regular & structured competitive play",
    badge: "TIER 2",
  },
  {
    key: "advanced",
    label: "Advanced",
    tagline: "Premier tournament & league pace",
    badge: "TIER 3",
  },
];

const PRESET_AREAS = [
  "Gulberg, Lahore",
  "DHA Phase 5, Lahore",
  "Model Town, Lahore",
  "Johar Town, Lahore",
  "Cantt, Lahore",
];

export default function CaptainSetupScreen() {
  const {
    currentUser,
    setCaptainProfile,
    setOnboardingCompleted,
    isInitialized,
    isLoading,
    loadProfile,
    setActiveMode,
  } = useAuthStore();

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    if (!currentUser) {
      router.replace("/(auth)/login");
      return;
    }
  }, [isInitialized, isLoading, currentUser]);

  // Approved Form Fields
  const [teamName, setTeamName] = useState("");
  const [primarySport, setPrimarySport] = useState<Sport>("football");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("intermediate");
  const [area, setArea] = useState("Gulberg, Lahore");

  // UI State
  const [isAreaModalVisible, setIsAreaModalVisible] = useState(false);
  const [editNotice, setEditNotice] = useState<string | null>(null);
  const [teamNameError, setTeamNameError] = useState<string | undefined>();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    let isValid = true;
    const trimmed = teamName.trim();

    if (!trimmed) {
      setTeamNameError("Team name is required");
      isValid = false;
    } else if (trimmed.length < 2) {
      setTeamNameError("Team name must be at least 2 characters");
      isValid = false;
    } else {
      setTeamNameError(undefined);
    }

    if (!primarySport) {
      setGeneralError("Please select a primary sport");
      isValid = false;
    }

    return isValid;
  };

  const handleFinishSetup = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      const result = await profileService.saveCaptainProfile({
        teamName: teamName.trim(),
        sports: [primarySport],
        skillLevel,
        primaryLocation: area,
      });

      setCaptainProfile(result.profile);
      setOnboardingCompleted(true);
      await loadProfile();
      await setActiveMode("TEAM_CAPTAIN");

      router.replace("/captain/dashboard");
    } catch (err: any) {
      setGeneralError(
        err?.message || "Failed to complete captain setup. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPress = () => {
    setEditNotice(
      "Team details and home ground can be updated anytime from your Captain Dashboard.",
    );
    setTimeout(() => setEditNotice(null), 3500);
  };

  if (!isInitialized || isLoading) {
    return (
      <ThemedScreen className="flex-1 bg-[#0C0D0E] items-center justify-center">
        <ActivityIndicator size="large" color="#E85D26" />
        <Text className="text-[#A0A5AD] text-xs font-semibold tracking-wider mt-3">
          Loading session...
        </Text>
      </ThemedScreen>
    );
  }

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      {/* Modern Header */}
      <ArenaHeader
        title="Captain Setup"
        subtitle="Establish your squad identity"
        showBack
        fallbackRoute="/(tabs)/profile"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ThemedScroll
          kind="form"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          className="flex-1"
        >
          {/* Sports Photography Hero Section */}
          <View className="relative w-full h-44 bg-[#141518]/25 overflow-hidden border-b border-white/[0.08]">
            <Image
              source={IMAGES.arenaTeam}
              className="w-full h-full"
              resizeMode="cover"
            />
            {/* Atmospheric Stadium Lighting Overlay */}
            <View className="absolute inset-0 bg-[#0C0D0E]/65" />
            <View className="absolute inset-0 bg-gradient-to-t from-[#0C0D0E] via-[#0C0D0E]/40 to-transparent" />

            {/* Hero Content Overlay */}
            <View className="absolute bottom-3 left-5 right-5 z-10">
              <View className="flex-row items-center mb-1">
                <Text className="text-[#E85D26] text-[10px] font-black uppercase tracking-widest">
                  TEAM CAPTAIN SETUP
                </Text>
                <Text className="text-[#5C616A] text-[10px] font-bold mx-1.5">
                  ·
                </Text>
                <Text className="text-[#A0A5AD] text-[10px] font-bold uppercase tracking-wider">
                  SQUAD MANAGEMENT
                </Text>
              </View>
              <Text className="text-[#FFFFFF] text-xl font-black uppercase tracking-tight">
                Set Up Your Squad
              </Text>
              <Text className="text-[#A0A5AD] text-[11px] font-medium mt-0.5 tracking-tight">
                Establish your team identity and competitive tier to organize
                matches.
              </Text>
            </View>
          </View>

          {/* Main Content Form */}
          <View className="px-5 py-4">
            {/* Edit Notice Toast if triggered */}
            {editNotice && (
              <View className="mb-4 p-3 rounded-xl bg-[#141518]/25 border border-[#E85D26]/30 flex-row items-center shadow-xs">
                <Ionicons
                  name="information-circle-sharp"
                  size={18}
                  color="#E85D26"
                />
                <Text className="text-[#E85D26] text-xs font-semibold ml-2 flex-1">
                  {editNotice}
                </Text>
              </View>
            )}

            {/* Section 1: Captain Credential Card */}
            <View className="bg-[#141518]/25 border border-white/[0.08] rounded-2xl p-3.5 mb-5 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-3">
                  {/* Captain Shield Badge */}
                  <View className="w-12 h-12 rounded-xl bg-[#1B1D22] border border-white/[0.08] items-center justify-center mr-3 relative">
                    <MaterialCommunityIcons
                      name="shield-star"
                      size={24}
                      color="#E85D26"
                    />
                    <View className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-[#E85D26] rounded-xs">
                      <Text className="text-[#0C0D0E] text-[8px] font-black tracking-tighter">
                        CPT
                      </Text>
                    </View>
                  </View>

                  {/* Captain Identity Metadata */}
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[#FFFFFF] text-sm font-bold uppercase tracking-tight"
                    >
                      {teamName.trim() || currentUser?.name || "Squad Captain"}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-[#E85D26] text-[11px] font-bold uppercase tracking-wide">
                        TEAM CAPTAIN
                      </Text>
                      <Text className="text-[#5C616A] text-[10px] font-bold mx-1.5">
                        ·
                      </Text>
                      <Text className="text-[#A0A5AD] text-[10px] font-medium tracking-tight">
                        Ready to organize matches
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Edit Action Button */}
                <Pressable
                  onPress={handleEditPress}
                  accessibilityRole="button"
                  accessibilityLabel="Edit captain credential"
                  className="py-1.5 px-3 rounded-lg bg-[#1B1D22] border border-white/[0.08] active:scale-95"
                >
                  <Text className="text-[#A0A5AD] text-[10px] font-bold tracking-wider uppercase">
                    INFO
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Section 2: Team Name Input */}
            <View className="mb-5">
              <FormInput
                label="TEAM NAME"
                value={teamName}
                onChangeText={(text) => {
                  setTeamName(text);
                  if (teamNameError) setTeamNameError(undefined);
                }}
                placeholder="e.g. Model Town Strikers"
                autoCapitalize="words"
                error={teamNameError}
                testID="captain-setup-team-name-input"
                accessibilityLabel="Enter your squad or team name"
              />
            </View>

            {/* Section 3: Primary Sport (Single Select) */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[#FFFFFF] text-xs font-bold tracking-wider uppercase">
                  PRIMARY SPORT
                </Text>
                <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wide">
                  SELECT ONE
                </Text>
              </View>

              {/* 4 Sport Cards Grid Row */}
              <View className="flex-row space-x-2">
                {ALL_SPORTS.map((item) => {
                  const isSelected = primarySport === item.sport;
                  return (
                    <SportCard
                      key={item.sport}
                      sport={item.sport}
                      label={item.label}
                      iconName={item.iconName}
                      selected={isSelected}
                      onToggle={() => {
                        setPrimarySport(item.sport);
                        setGeneralError(null);
                      }}
                      testID={`captain-sport-${item.sport}`}
                    />
                  );
                })}
              </View>
            </View>

            {/* Section 4: Default Skill Range */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[#FFFFFF] text-xs font-bold tracking-wider uppercase">
                  DEFAULT SKILL TIER
                </Text>
                <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wide">
                  COMPETITIVE LEVEL
                </Text>
              </View>
              <Text className="text-[#A0A5AD] text-[11px] font-medium mb-2.5">
                Sets default matchmaking level when hosting matches.
              </Text>

              {/* Division Cards */}
              <View className="space-y-2">
                {SKILL_TIERS.map((tier) => {
                  const isSelected = skillLevel === tier.key;
                  return (
                    <Pressable
                      key={tier.key}
                      testID={`captain-skill-${tier.key}`}
                      onPress={() => setSkillLevel(tier.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${tier.label} competitive tier`}
                      className={`w-full p-3.5 rounded-xl border flex-row items-center justify-between my-1 active:scale-[0.99] ${
                        isSelected
                          ? "bg-[#1B1D22] border-[#E85D26] shadow-sm"
                          : "bg-[#141518]/25 border-white/[0.08]"
                      }`}
                    >
                      <View className="flex-row items-center flex-1 mr-3">
                        {/* Division Badge */}
                        <View
                          className={`w-10 h-10 rounded-lg items-center justify-center mr-3 border ${
                            isSelected
                              ? "bg-[#E85D26]/15 border-[#E85D26]/40"
                              : "bg-[#1B1D22] border-white/[0.08]"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-black uppercase ${
                              isSelected ? "text-[#E85D26]" : "text-[#5C616A]"
                            }`}
                          >
                            {tier.badge}
                          </Text>
                        </View>

                        {/* Tier Label and Description */}
                        <View className="flex-1">
                          <Text
                            className={`text-sm font-bold uppercase tracking-tight ${
                              isSelected ? "text-[#FFFFFF]" : "text-[#A0A5AD]"
                            }`}
                          >
                            {tier.label}
                          </Text>
                          <Text className="text-[#5C616A] text-[11px] font-medium mt-0.5">
                            {tier.tagline}
                          </Text>
                        </View>
                      </View>

                      {/* Radio Indicator */}
                      <View
                        className={`w-5 h-5 rounded-full border items-center justify-center ${
                          isSelected
                            ? "border-[#E85D26] bg-[#E85D26]"
                            : "border-white/20 bg-[#1B1D22]"
                        }`}
                      >
                        {isSelected && (
                          <View className="w-2 h-2 rounded-full bg-[#0C0D0E]" />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Section 5: Home Ground / Area */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-[#FFFFFF] text-xs font-bold tracking-wider uppercase">
                  HOME AREA & NEIGHBORHOOD
                </Text>
                <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wide">
                  FIXTURE BASE
                </Text>
              </View>

              <View className="bg-[#141518]/25 border border-white/[0.08] rounded-xl p-3.5 flex-row items-center justify-between shadow-xs">
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-10 h-10 rounded-lg bg-[#E85D26]/10 border border-[#E85D26]/25 items-center justify-center mr-3">
                    <Ionicons name="location-sharp" size={20} color="#E85D26" />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[#FFFFFF] text-sm font-bold uppercase tracking-tight">
                      {area}
                    </Text>
                    <Text className="text-[#A0A5AD] text-[11px] font-medium mt-0.5">
                      Default neighborhood for hosting matches
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => setIsAreaModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Change home area"
                  className="py-1.5 px-3 rounded-lg bg-[#1B1D22] border border-white/[0.08] active:scale-95"
                >
                  <Text className="text-[#E85D26] text-[10px] font-bold tracking-wider uppercase">
                    CHANGE
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* General Validation Error */}
            {generalError && (
              <View className="mb-4 p-3 rounded-xl bg-[#F4A261]/10 border border-[#F4A261]/30 flex-row items-center">
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color="#F4A261"
                />
                <Text className="text-[#F4A261] text-xs font-semibold ml-2 flex-1">
                  {generalError}
                </Text>
              </View>
            )}

            {/* Primary CTA */}
            <View className="pt-1 pb-6">
              <PrimaryButton
                title="COMPLETE CAPTAIN SETUP"
                onPress={handleFinishSetup}
                loading={isSubmitting}
                variant="primary"
                testID="finish-captain-setup-btn"
              />

              <View className="flex-row items-center justify-center mt-3">
                <Ionicons
                  name="shield-checkmark-sharp"
                  size={13}
                  color="#E85D26"
                />
                <Text className="text-[#5C616A] text-[10px] font-semibold tracking-wider ml-1.5">
                  Verified match hosting · Real-time squad recruitment
                </Text>
              </View>
            </View>
          </View>
        </ThemedScroll>
      </KeyboardAvoidingView>

      {/* Area Selector Modal */}
      <Modal
        visible={isAreaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAreaModalVisible(false)}
      >
        <Pressable
          onPress={() => setIsAreaModalVisible(false)}
          className="flex-1 bg-black/75 justify-center items-center px-5"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#141518]/25 border border-white/[0.08] p-5 shadow-2xl"
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
              <View>
                <Text className="text-[#E85D26] text-[10px] font-black uppercase tracking-widest">
                  LOCATION
                </Text>
                <Text className="text-[#FFFFFF] text-base font-bold uppercase tracking-tight mt-0.5">
                  Select Team Home Area
                </Text>
              </View>
              <Pressable
                onPress={() => setIsAreaModalVisible(false)}
                className="w-8 h-8 rounded-lg bg-[#1B1D22] items-center justify-center border border-white/[0.08] active:scale-95"
                accessibilityLabel="Close area modal"
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* List of Preset Areas */}
            <View className="space-y-2">
              {PRESET_AREAS.map((item) => {
                const isSelected = area === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setArea(item);
                      setIsAreaModalVisible(false);
                    }}
                    className={`w-full p-3 rounded-xl border flex-row items-center justify-between my-1 active:scale-[0.99] ${
                      isSelected
                        ? "bg-[#1B1D22] border-[#E85D26]"
                        : "bg-[#0C0D0E] border-white/[0.08]"
                    }`}
                  >
                    <View className="flex-row items-center flex-1">
                      <Ionicons
                        name="location-sharp"
                        size={16}
                        color={isSelected ? "#E85D26" : "#5C616A"}
                      />
                      <Text
                        className={`text-xs font-bold uppercase tracking-tight ml-2.5 ${
                          isSelected ? "text-[#E85D26]" : "text-[#FFFFFF]"
                        }`}
                      >
                        {item}
                      </Text>
                    </View>
                    {isSelected && (
                      <View className="w-5 h-5 rounded-full bg-[#E85D26] items-center justify-center">
                        <Ionicons name="checkmark" size={13} color="#0C0D0E" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedScreen>
  );
}
