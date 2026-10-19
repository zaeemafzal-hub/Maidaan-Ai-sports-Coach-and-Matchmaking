import { ThemedScreen } from "../../components/ui/ThemedScreen";
import { ArtworkScrollView } from "../../components/ui/Artwork";
import { ARTWORK } from "../../constants/artwork";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/useAuthStore";
import { Sport } from "../../types";
import { profileService } from "../../services/profileService";
import { SportCard } from "../../components/ui/SportCard";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { FormInput } from "../../components/ui/FormInput";

import { LocationFields } from "../../components/locations/LocationFields";

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

export default function HubSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = mode === "edit";

  const {
    currentUser,
    hubOwnerProfile,
    setHubOwnerProfile,
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

  // Approved Form Fields (Preloaded from existing profile in edit mode)
  const [hubName, setHubName] = useState(hubOwnerProfile?.hubName || "");
  const [contact, setContact] = useState(hubOwnerProfile?.contactNumber || "");
  const [selectedSports, setSelectedSports] = useState<Sport[]>(
    hubOwnerProfile?.sports?.length
      ? hubOwnerProfile.sports
      : ["football", "cricket"],
  );
  const [area, setArea] = useState(
    hubOwnerProfile?.location || "Gulberg, Lahore",
  );
  const [cityId, setCityId] = useState(hubOwnerProfile?.cityId || "lahore");
  const [areaId, setAreaId] = useState(hubOwnerProfile?.areaId || "");
  const [courtsCount, setCourtsCount] = useState(
    hubOwnerProfile?.courtsCount ?? 2,
  );

  // Sync state if hubOwnerProfile updates in edit mode
  useEffect(() => {
    if (isEditMode && hubOwnerProfile) {
      if (hubOwnerProfile.hubName) setHubName(hubOwnerProfile.hubName);
      if (hubOwnerProfile.contactNumber)
        setContact(hubOwnerProfile.contactNumber);
      if (hubOwnerProfile.sports?.length)
        setSelectedSports(hubOwnerProfile.sports);
      if (hubOwnerProfile.location) setArea(hubOwnerProfile.location);
      if (hubOwnerProfile.cityId) setCityId(hubOwnerProfile.cityId);
      if (hubOwnerProfile.areaId) setAreaId(hubOwnerProfile.areaId);
      if (typeof hubOwnerProfile.courtsCount === "number") {
        setCourtsCount(hubOwnerProfile.courtsCount);
      }
    }
  }, [isEditMode, hubOwnerProfile]);

  // UI State
  const [editNotice, setEditNotice] = useState<string | null>(null);
  const [hubNameError, setHubNameError] = useState<string | undefined>();
  const [contactError, setContactError] = useState<string | undefined>();
  const [sportsError, setSportsError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleSport = (sport: Sport) => {
    setSportsError(null);
    setGeneralError(null);
    setSelectedSports((prev) => {
      if (prev.includes(sport)) {
        return prev.filter((s) => s !== sport);
      } else {
        return [...prev, sport];
      }
    });
  };

  const handleDecrementCourts = () => {
    if (courtsCount > 1) {
      setCourtsCount((prev: number) => prev - 1);
    }
  };

  const handleIncrementCourts = () => {
    if (courtsCount < 50) {
      setCourtsCount((prev: number) => prev + 1);
    }
  };

  const validate = (): boolean => {
    if (!areaId) {
      setGeneralError("Select a city and venue area.");
      return false;
    }
    let isValid = true;
    const trimmedName = hubName.trim();
    const trimmedContact = contact.trim();

    // Hub Name validation
    if (!trimmedName) {
      setHubNameError("Hub name is required");
      isValid = false;
    } else if (trimmedName.length < 2) {
      setHubNameError("Hub name must be at least 2 characters");
      isValid = false;
    } else {
      setHubNameError(undefined);
    }

    // Contact validation
    if (!trimmedContact) {
      setContactError("Contact phone number is required");
      isValid = false;
    } else if (trimmedContact.length < 7) {
      setContactError("Please enter a valid contact phone number");
      isValid = false;
    } else {
      setContactError(undefined);
    }

    // Sports validation (Multi-select, min 1)
    if (selectedSports.length === 0) {
      setSportsError("Please select at least one supported sport");
      isValid = false;
    } else {
      setSportsError(null);
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
      const result = await profileService.saveHubOwnerProfile({
        hubName: hubName.trim(),
        location: area,
        cityId,
        areaId,
        courtsCount,
        contactNumber: contact.trim(),
        sports: selectedSports,
      });

      setHubOwnerProfile(result.profile);
      setOnboardingCompleted(true);
      await loadProfile();
      await setActiveMode("HUB_OWNER");

      router.replace("/hub/dashboard");
    } catch (err: any) {
      setGeneralError(
        err?.message || "Failed to save hub setup. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPress = () => {
    setEditNotice(
      "Venue details and court schedules can be managed anytime from your Hub Dashboard.",
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
        title={isEditMode ? "Edit Venue" : "Hub Setup"}
        subtitle={
          isEditMode
            ? "Update facility configuration"
            : "Register your sports venue"
        }
        showBack
        fallbackRoute="/hub/dashboard"
        onBack={() => {
          if (isEditMode) {
            router.replace("/hub/dashboard");
          } else if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/hub/dashboard");
          }
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ArtworkScrollView
          kind="form"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          className="flex-1"
        >
          {/* Sports Ground Photography Hero Section */}
          <View className="relative w-full h-44 bg-[#141518]/25 overflow-hidden border-b border-white/[0.08]">
            <Image
              source={ARTWORK.form}
              className="w-full h-full"
              resizeMode="cover"
            />
            {/* Dark Atmospheric Gradient Overlay */}
            <View className="absolute inset-0 bg-[#0C0D0E]/65" />
            <View className="absolute inset-0 bg-gradient-to-t from-[#0C0D0E] via-[#0C0D0E]/40 to-transparent" />

            {/* Hero Content Overlay */}
            <View className="absolute bottom-3 left-5 right-5 z-10">
              <View className="flex-row items-center mb-1">
                <Text className="text-[#E85D26] text-[10px] font-black uppercase tracking-widest">
                  {isEditMode ? "FACILITY MANAGEMENT" : "HUB ONBOARDING"}
                </Text>
                <Text className="text-[#5C616A] text-[10px] font-bold mx-1.5">
                  ·
                </Text>
                <Text className="text-[#A0A5AD] text-[10px] font-bold uppercase tracking-wider">
                  {isEditMode ? "EDIT DETAILS" : "VENUE REGISTRATION"}
                </Text>
              </View>
              <Text className="text-[#FFFFFF] text-xl font-black uppercase tracking-tight">
                {isEditMode
                  ? "Update Venue Details"
                  : "Register Your Sports Hub"}
              </Text>
              <Text className="text-[#A0A5AD] text-[11px] font-medium mt-0.5 tracking-tight">
                {isEditMode
                  ? "Update your facility location, contact coordinator desk, and active sports."
                  : "Enter your venue details and available playing areas to register on the platform."}
              </Text>
            </View>
          </View>

          {/* Main Content Form */}
          <View className="px-5 py-4">
            {/* Notice Toast if triggered */}
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

            {/* Section 1: Hub Credential Card */}
            <View className="bg-[#141518]/25 border border-white/[0.08] rounded-2xl p-3.5 mb-5 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-3">
                  {/* Venue Icon Well */}
                  <View className="w-12 h-12 rounded-xl bg-[#1B1D22] border border-white/[0.08] items-center justify-center mr-3 relative">
                    <MaterialCommunityIcons
                      name="domain"
                      size={24}
                      color="#E85D26"
                    />
                    <View className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-[#E85D26] rounded-xs">
                      <Text className="text-[#0C0D0E] text-[8px] font-black tracking-tighter">
                        HUB
                      </Text>
                    </View>
                  </View>

                  {/* Hub Identity Metadata */}
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[#FFFFFF] text-sm font-bold uppercase tracking-tight"
                    >
                      {hubName.trim() || "Sports Hub Venue"}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-[#E85D26] text-[11px] font-bold uppercase tracking-wide">
                        HUB OWNER
                      </Text>
                      <Text className="text-[#5C616A] text-[10px] font-bold mx-1.5">
                        ·
                      </Text>
                      <Text className="text-[#A0A5AD] text-[10px] font-medium tracking-tight">
                        {isEditMode
                          ? "Venue Configuration"
                          : "Venue Registration"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Edit / Info Action Button */}
                <Pressable
                  onPress={handleEditPress}
                  accessibilityRole="button"
                  accessibilityLabel="Edit hub credential"
                  className="py-1.5 px-3 rounded-lg bg-[#1B1D22] border border-white/[0.08] active:scale-95"
                >
                  <Text className="text-[#A0A5AD] text-[10px] font-bold tracking-wider uppercase">
                    INFO
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Section 2: Hub Name Input */}
            <View className="mb-4">
              <FormInput
                label="HUB NAME"
                value={hubName}
                onChangeText={(text) => {
                  setHubName(text);
                  if (hubNameError) setHubNameError(undefined);
                }}
                placeholder="e.g. Model Town Sports Complex"
                autoCapitalize="words"
                error={hubNameError}
                testID="hub-setup-name-input"
                accessibilityLabel="Enter sports hub or venue name"
              />
            </View>

            {/* Section 3: Contact Phone Number */}
            <View className="mb-5">
              <FormInput
                label="CONTACT PHONE NUMBER"
                value={contact}
                onChangeText={(text) => {
                  setContact(text);
                  if (contactError) setContactError(undefined);
                }}
                placeholder="e.g. +92 300 1234567"
                keyboardType="phone-pad"
                error={contactError}
                testID="hub-setup-contact-input"
                accessibilityLabel="Enter venue contact phone number"
              />
            </View>

            {/* Section 4: Supported Sports (Multi-Select) */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Text className="text-[#FFFFFF] text-xs font-bold tracking-wider uppercase">
                    SUPPORTED SPORTS
                  </Text>
                  <Text className="text-[#E85D26] text-[11px] font-bold ml-2">
                    ({selectedSports.length}/4 ACTIVE)
                  </Text>
                </View>
                <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wide">
                  MULTI-SELECT
                </Text>
              </View>

              {/* 4 Sport Cards Grid Row */}
              <View className="flex-row space-x-2">
                {ALL_SPORTS.map((item) => {
                  const isSelected = selectedSports.includes(item.sport);
                  return (
                    <SportCard
                      key={item.sport}
                      sport={item.sport}
                      label={item.label}
                      iconName={item.iconName}
                      selected={isSelected}
                      onToggle={() => handleToggleSport(item.sport)}
                      testID={`hub-sport-${item.sport}`}
                    />
                  );
                })}
              </View>

              {/* Sports Validation Error */}
              {sportsError && (
                <View className="mt-2.5 p-2 rounded-xl bg-[#F4A261]/10 border border-[#F4A261]/30 flex-row items-center">
                  <Ionicons
                    name="alert-circle-outline"
                    size={15}
                    color="#F4A261"
                  />
                  <Text className="text-[#F4A261] text-xs font-semibold ml-1.5 flex-1">
                    {sportsError}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ gap: 12, marginBottom: 20 }}>
              <LocationFields
                cityId={cityId}
                areaId={areaId}
                onChange={(city, selected) => {
                  setCityId(city);
                  setAreaId(selected);
                }}
              />
              <FormInput
                label="Venue street address"
                value={area}
                onChangeText={setArea}
              />
            </View>

            {/* Section 6: Number of Courts / Playing Areas */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-[#FFFFFF] text-xs font-bold tracking-wider uppercase">
                  COURTS & PLAYING SPACES
                </Text>
                <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wide">
                  CAPACITY
                </Text>
              </View>
              <Text className="text-[#A0A5AD] text-[11px] font-medium mb-2.5">
                Total number of pitches, courts, or nets available at your
                facility.
              </Text>

              <View className="bg-[#141518]/25 border border-white/[0.08] rounded-xl p-3.5 flex-row items-center justify-between shadow-xs">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-lg bg-[#1B1D22] border border-white/[0.08] items-center justify-center mr-3">
                    <MaterialCommunityIcons
                      name="stadium-variant"
                      size={20}
                      color="#E85D26"
                    />
                  </View>
                  <View>
                    <Text className="text-[#FFFFFF] text-base font-bold uppercase tracking-tight">
                      {courtsCount}{" "}
                      {courtsCount === 1 ? "COURT / PITCH" : "COURTS / PITCHES"}
                    </Text>
                    <Text className="text-[#A0A5AD] text-[10px] font-medium">
                      Manageable anytime in Hub Courts
                    </Text>
                  </View>
                </View>

                {/* Numeric Stepper Controls */}
                <View className="flex-row items-center space-x-2">
                  <Pressable
                    onPress={handleDecrementCourts}
                    disabled={courtsCount <= 1}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease court count"
                    className={`w-10 h-10 rounded-xl items-center justify-center border border-white/[0.08] active:scale-95 ${
                      courtsCount <= 1
                        ? "bg-[#1B1D22]/40 opacity-40"
                        : "bg-[#1B1D22]"
                    }`}
                  >
                    <Ionicons name="remove" size={18} color="#FFFFFF" />
                  </Pressable>

                  <View className="w-10 h-10 items-center justify-center bg-[#1B1D22] rounded-xl border border-white/[0.08]">
                    <Text className="text-[#FFFFFF] text-base font-bold">
                      {courtsCount}
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleIncrementCourts}
                    disabled={courtsCount >= 50}
                    accessibilityRole="button"
                    accessibilityLabel="Increase court count"
                    className={`w-10 h-10 rounded-xl items-center justify-center border border-white/[0.08] active:scale-95 ${
                      courtsCount >= 50
                        ? "bg-[#1B1D22]/40 opacity-40"
                        : "bg-[#1B1D22]"
                    }`}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Section 7: Admin Verification Notice */}
            <View className="mb-6 p-4 rounded-xl bg-[#141518]/25 border border-white/[0.08]">
              <View className="flex-row items-center mb-1.5">
                <Ionicons
                  name={
                    hubOwnerProfile?.isVerified
                      ? "shield-checkmark"
                      : "shield-outline"
                  }
                  size={15}
                  color={hubOwnerProfile?.isVerified ? "#E85D26" : "#F4A261"}
                />
                <Text
                  className={`text-[10px] font-black uppercase tracking-widest ml-1.5 ${
                    hubOwnerProfile?.isVerified
                      ? "text-[#E85D26]"
                      : "text-[#F4A261]"
                  }`}
                >
                  ADMIN VERIFICATION
                </Text>
              </View>

              <Text className="text-[#FFFFFF] text-xs font-bold uppercase tracking-tight">
                {hubOwnerProfile?.isVerified
                  ? "Official Verified Facility"
                  : "Pending Review After Registration"}
              </Text>
              <Text className="text-[#A0A5AD] text-[11px] font-medium mt-1 leading-relaxed">
                {hubOwnerProfile?.isVerified
                  ? "Your sports hub is verified by platform administrators. Facility specifications meet standard requirements."
                  : "Your sports hub will be reviewed by platform administrators before receiving verified status. You can manage court inventory immediately."}
              </Text>

              <View className="mt-2.5 pt-2 border-t border-white/[0.08] flex-row items-center justify-between">
                <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider">
                  {hubOwnerProfile?.isVerified
                    ? "STATUS: VERIFIED"
                    : "STATUS: UNVERIFIED (PENDING)"}
                </Text>
                <Text className="text-[#A0A5AD] text-[10px] font-medium">
                  {hubOwnerProfile?.isVerified ? "Approved" : "Under Review"}
                </Text>
              </View>
            </View>

            {/* General Error */}
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
                title={
                  isEditMode ? "SAVE PROFILE CHANGES" : "COMPLETE HUB SETUP"
                }
                onPress={handleFinishSetup}
                loading={isSubmitting}
                variant="primary"
                testID="finish-hub-setup-btn"
              />

              <View className="flex-row items-center justify-center mt-3">
                <Ionicons
                  name="shield-checkmark-sharp"
                  size={13}
                  color="#E85D26"
                />
                <Text className="text-[#5C616A] text-[10px] font-semibold tracking-wider ml-1.5">
                  Verified venue listing · Administrative governance
                </Text>
              </View>
            </View>
          </View>
        </ArtworkScrollView>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}
