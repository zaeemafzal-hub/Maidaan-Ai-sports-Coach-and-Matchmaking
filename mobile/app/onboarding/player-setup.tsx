import { ThemedScreen } from "../../components/ui/ThemedScreen";
import { ArtworkScrollView } from "../../components/ui/Artwork";
import { ARTWORK } from "../../constants/artwork";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "../../components/theme/Primitives";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "../../components/theme/Icons";
import { useAuthStore } from "../../store/useAuthStore";
import { Sport, SkillLevel } from "../../types";
import { profileService } from "../../services/profileService";
import { SportCard } from "../../components/ui/SportCard";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { AmbientGlowOverlay } from "../../components/ui";
import { FormInput } from "../../components/ui/FormInput";
import { LocationFields } from "../../components/locations/LocationFields";
import { ProfilePhoto } from "../../components/locations/ProfilePhoto";

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
    tagline: "Grassroots & friendly casual play",
    badge: "TIER 1",
  },
  {
    key: "intermediate",
    label: "Intermediate",
    tagline: "Club regular & structured matches",
    badge: "TIER 2",
  },
  {
    key: "advanced",
    label: "Advanced",
    tagline: "Premier tournament & league pace",
    badge: "TIER 3",
  },
];

export default function PlayerSetupScreen() {
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    setPlayerProfile,
    setOnboardingCompleted,
    isInitialized,
    isLoading,
    loadProfile,
    playerProfile,
  } = useAuthStore();

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    if (!currentUser) {
      router.replace("/(auth)/login");
      return;
    }
  }, [isInitialized, isLoading, currentUser]);

  const [selectedSports, setSelectedSports] = useState<Sport[]>(
    playerProfile?.preferredSports || ["cricket"],
  );
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(
    playerProfile?.skillLevel || "intermediate",
  );
  const [area, setArea] = useState(playerProfile?.primaryLocation || "");
  const [cityId, setCityId] = useState(playerProfile?.cityId || "lahore");
  const [areaId, setAreaId] = useState(playerProfile?.areaId || "");
  const [phone, setPhone] = useState(playerProfile?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(playerProfile?.avatarUrl || "");
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleSport = (sport: Sport) => {
    setValidationError(null);
    setSelectedSports((prev) => {
      if (prev.includes(sport)) {
        return prev.filter((s) => s !== sport);
      } else {
        return [...prev, sport];
      }
    });
  };

  const handleFinishSetup = async () => {
    if (
      !phone.trim() ||
      area.trim().length < 2 ||
      !currentUser?.name ||
      !currentUser.email
    ) {
      setValidationError(
        "Name, email, phone number and a home address are required.",
      );
      return;
    }
    if (selectedSports.length === 0) {
      setValidationError("Please select at least one preferred sport.");
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const result = await profileService.savePlayerProfile({
        preferredSports: selectedSports,
        skillLevel,
        primaryLocation: area,
        phone,
        cityId,
        areaId,
        avatarUrl,
      });

      setPlayerProfile(result.profile);
      setOnboardingCompleted(true);
      await loadProfile();

      router.replace("/(tabs)/discover");
    } catch (err: any) {
      setValidationError(
        err?.message || "Failed to complete player setup. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized || isLoading) {
    return (
      <ThemedScreen className="flex-1 bg-[#0C0D0E] items-center justify-center">
        <ActivityIndicator size="large" color="#E85D26" />
        <Text
          style={{ color: "#A0A5AD" }}
          className="text-[#A0A5AD] text-xs font-medium tracking-wider mt-3"
        >
          Restoring Session...
        </Text>
      </ThemedScreen>
    );
  }

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      {/* Restrained Atmospheric Hero Backdrop (135px height) */}
      <View pointerEvents="none" style={styles.heroBackdrop}>
        <Image
          source={ARTWORK.profile}
          style={styles.heroImage}
          resizeMode="cover"
        />
        {/* Multi-stop dark gradient vignette transitioning into #0C0D0E */}
        <View style={styles.vignetteTop} />
        <View style={styles.vignetteMid} />
        <View style={styles.vignetteBottom} />
      </View>

      {/* Subtle Warm Solar Ambient Glow */}
      <AmbientGlowOverlay top={-50} right={-30} size={280} opacity={0.12} />

      {/* Modern Athletic Header */}
      <ArenaHeader
        title="Player Setup"
        subtitle="Step 1 of 1"
        showBack
        fallbackRoute="/(tabs)/profile"
        transparent
      />

      <ArtworkScrollView
        kind="profile"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Math.max(insets.bottom, 16) + 36,
        }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="px-5 pt-5">
          {/* Section 1: Preferred Sports */}
          <View style={{ marginBottom: 30 }}>
            <View className="flex-row items-center justify-between mb-1.5">
              <Text
                style={{ color: "#FFFFFF" }}
                className="text-white text-xs font-bold uppercase tracking-wider"
              >
                Preferred Sports
              </Text>
              <Text
                style={{ color: "#E85D26" }}
                className="text-[#E85D26] text-xs font-bold"
              >
                {selectedSports.length}/4 Active
              </Text>
            </View>
            <Text
              style={{ color: "#A0A5AD" }}
              className="text-[#A0A5AD] text-xs font-normal mb-3.5"
            >
              Select 1 or more disciplines to calibrate matchmaking.
            </Text>

            {/* 4 Sport Cards Row */}
            <View className="flex-row" style={{ gap: 8 }}>
              {ALL_SPORTS.map((item) => (
                <SportCard
                  key={item.sport}
                  sport={item.sport}
                  label={item.label}
                  iconName={item.iconName}
                  selected={selectedSports.includes(item.sport)}
                  onToggle={() => handleToggleSport(item.sport)}
                  testID={`sport-card-${item.sport}`}
                />
              ))}
            </View>

            {/* Validation Message */}
            {validationError && (
              <View className="mt-3 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex-row items-center">
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text
                  style={{ color: "#EF4444" }}
                  className="text-[#EF4444] text-xs font-medium ml-2 flex-1"
                >
                  {validationError}
                </Text>
              </View>
            )}
          </View>

          {/* Section 2: Skill Level */}
          <View style={{ marginBottom: 30 }}>
            <View className="flex-row items-center justify-between mb-1.5">
              <Text
                style={{ color: "#FFFFFF" }}
                className="text-white text-xs font-bold uppercase tracking-wider"
              >
                Skill Level
              </Text>
              <Text
                style={{ color: "#5C616A" }}
                className="text-[#5C616A] text-xs font-bold"
              >
                Select tier
              </Text>
            </View>
            <Text
              style={{ color: "#A0A5AD" }}
              className="text-[#A0A5AD] text-xs font-normal mb-3.5"
            >
              Helps balance match matchmaking and fixture difficulty.
            </Text>

            {/* Division Cards */}
            <View style={{ gap: 11 }}>
              {SKILL_TIERS.map((tier) => {
                const isSelected = skillLevel === tier.key;
                return (
                  <Pressable
                    key={tier.key}
                    testID={`skill-level-${tier.key}`}
                    onPress={() => setSkillLevel(tier.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${tier.label} skill level`}
                    className={`w-full p-4 rounded-2xl border flex-row items-center justify-between active:scale-[0.99] ${
                      isSelected
                        ? "bg-[#1B1D22] border-2 border-[#E85D26] shadow-sm shadow-[#E85D26]/20"
                        : "bg-[#141518]/25 border border-white/[0.08]"
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      {/* Division Badge */}
                      <View
                        className={`w-11 h-11 rounded-xl items-center justify-center mr-3.5 border ${
                          isSelected
                            ? "bg-[#E85D26]/15 border-[#E85D26]/30"
                            : "bg-[#101214] border border-white/[0.06]"
                        }`}
                      >
                        <Text
                          style={{ color: isSelected ? "#E85D26" : "#A0A5AD" }}
                          className={`text-xs font-black uppercase ${
                            isSelected ? "text-[#E85D26]" : "text-[#A0A5AD]"
                          }`}
                        >
                          {tier.badge}
                        </Text>
                      </View>

                      {/* Tier Label and Tagline */}
                      <View className="flex-1">
                        <Text
                          style={{ color: "#FFFFFF" }}
                          className="text-white text-sm font-bold tracking-tight"
                        >
                          {tier.label}
                        </Text>
                        <Text
                          style={{ color: "#A0A5AD" }}
                          className="text-[#A0A5AD] text-xs font-normal mt-0.5"
                        >
                          {tier.tagline}
                        </Text>
                      </View>
                    </View>

                    {/* Radio Indicator */}
                    <View
                      className={`w-5 h-5 rounded-full border items-center justify-center ${
                        isSelected
                          ? "border-2 border-[#E85D26] bg-[#E85D26]"
                          : "border border-white/20 bg-[#101214]"
                      }`}
                    >
                      {isSelected && (
                        <View className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 16, marginBottom: 30 }}>
            <FormInput
              label="Full name"
              value={currentUser?.name || ""}
              editable={false}
            />
            <FormInput
              label="Email"
              value={currentUser?.email || ""}
              editable={false}
            />
            <FormInput
              label="Phone number (required)"
              placeholder="03xxxxxxxxx or +923xxxxxxxxx"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <LocationFields
              allowCustom
              address={area}
              cityId={cityId}
              areaId={areaId}
              onChange={(city, selected, label) => {
                setCityId(city);
                setAreaId(selected);
                setArea(label);
              }}
            />
            <ProfilePhoto
              url={avatarUrl}
              onChange={setAvatarUrl}
              onBusyChange={setUploading}
            />
          </View>

          {/* Finish Setup CTA & Trust Guarantee */}
          <View style={{ marginTop: 2 }}>
            <PrimaryButton
              title="Finish Setup & Enter Maidaan"
              onPress={handleFinishSetup}
              loading={isSubmitting}
              disabled={uploading}
              variant="primary"
              size="lg"
              testID="finish-player-setup-btn"
            />

            <View className="flex-row items-center justify-center mt-3.5">
              <Ionicons name="shield-checkmark" size={14} color="#E85D26" />
              <Text
                style={{ color: "#A0A5AD" }}
                className="text-[#A0A5AD] text-xs font-medium ml-1.5"
              >
                Instant match discovery • Real-time matchmaking • Free to play
              </Text>
            </View>
          </View>
        </View>
      </ArtworkScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  heroBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 135,
    overflow: "hidden",
    zIndex: 0,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    opacity: 0.55,
  },
  vignetteTop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(12, 13, 14, 0.35)",
  },
  vignetteMid: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(12, 13, 14, 0.75)",
  },
  vignetteBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 35,
    backgroundColor: "transparent",
  },
});
