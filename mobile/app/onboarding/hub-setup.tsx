import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { Sport } from '../../types';
import { profileService } from '../../services/profileService';
import { SportCard } from '../../components/ui/SportCard';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { FormInput } from '../../components/ui/FormInput';
import { IMAGES } from '../../constants/images';

interface SportConfig {
  sport: Sport;
  label: string;
  iconName: 'cricket' | 'badminton' | 'tennis' | 'soccer';
}

const ALL_SPORTS: SportConfig[] = [
  { sport: 'cricket', label: 'Cricket', iconName: 'cricket' },
  { sport: 'badminton', label: 'Badminton', iconName: 'badminton' },
  { sport: 'padel', label: 'Padel', iconName: 'tennis' },
  { sport: 'football', label: 'Football', iconName: 'soccer' },
];

const PRESET_AREAS = [
  'Gulberg, Lahore',
  'DHA Phase 5, Lahore',
  'Model Town, Lahore',
  'Johar Town, Lahore',
  'Cantt, Lahore',
];

export default function HubSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = mode === 'edit';

  const {
    currentUser,
    selectedRole,
    hubOwnerProfile,
    setHubOwnerProfile,
    setOnboardingCompleted,
  } = useAuthStore();

  const currentRole = currentUser?.role || selectedRole || 'HUB_OWNER';
  useEffect(() => {
    if (currentRole !== 'HUB_OWNER') {
      router.replace('/(auth)/role-selection');
    }
  }, [currentRole]);

  // Approved Form Fields (Preloaded from existing profile in edit mode)
  const [hubName, setHubName] = useState(hubOwnerProfile?.hubName || '');
  const [contact, setContact] = useState(hubOwnerProfile?.contactNumber || '');
  const [selectedSports, setSelectedSports] = useState<Sport[]>(
    hubOwnerProfile?.sports?.length ? hubOwnerProfile.sports : ['football', 'cricket']
  );
  const [area, setArea] = useState(hubOwnerProfile?.location || 'Gulberg, Lahore');
  const [courtsCount, setCourtsCount] = useState(hubOwnerProfile?.courtsCount ?? 2);

  // Sync state if hubOwnerProfile updates in edit mode
  useEffect(() => {
    if (isEditMode && hubOwnerProfile) {
      if (hubOwnerProfile.hubName) setHubName(hubOwnerProfile.hubName);
      if (hubOwnerProfile.contactNumber) setContact(hubOwnerProfile.contactNumber);
      if (hubOwnerProfile.sports?.length) setSelectedSports(hubOwnerProfile.sports);
      if (hubOwnerProfile.location) setArea(hubOwnerProfile.location);
      if (typeof hubOwnerProfile.courtsCount === 'number') {
        setCourtsCount(hubOwnerProfile.courtsCount);
      }
    }
  }, [isEditMode, hubOwnerProfile]);

  // UI State
  const [isAreaModalVisible, setIsAreaModalVisible] = useState(false);
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
      setCourtsCount((prev) => prev - 1);
    }
  };

  const handleIncrementCourts = () => {
    if (courtsCount < 50) {
      setCourtsCount((prev) => prev + 1);
    }
  };

  const validate = (): boolean => {
    let isValid = true;
    const trimmedName = hubName.trim();
    const trimmedContact = contact.trim();

    // Hub Name validation
    if (!trimmedName) {
      setHubNameError('Hub name is required');
      isValid = false;
    } else if (trimmedName.length < 2) {
      setHubNameError('Hub name must be at least 2 characters');
      isValid = false;
    } else {
      setHubNameError(undefined);
    }

    // Contact validation
    if (!trimmedContact) {
      setContactError('Contact phone number is required');
      isValid = false;
    } else if (trimmedContact.length < 7) {
      setContactError('Please enter a valid contact phone number');
      isValid = false;
    } else {
      setContactError(undefined);
    }

    // Sports validation (Multi-select, min 1)
    if (selectedSports.length === 0) {
      setSportsError('Please select at least one supported sport');
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
        courtsCount,
        contactNumber: contact.trim(),
        sports: selectedSports,
      });

      setHubOwnerProfile(result.profile);

      if (isEditMode) {
        // Return back to Hub Profile after edit
        router.replace('/hub/profile');
      } else {
        // First-time onboarding complete
        setOnboardingCompleted(true);
        router.replace('/(tabs)/discover');
      }
    } catch (err: any) {
      setGeneralError(err?.message || 'Failed to save hub setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPress = () => {
    setEditNotice('Venue details and court schedules can be managed anytime from your Hub Profile.');
    setTimeout(() => setEditNotice(null), 3500);
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
      {/* Concrete Arena Match-Day Header */}
      <ArenaHeader
        title={isEditMode ? 'EDIT HUB PROFILE' : 'MAIDAAN'}
        subtitle={isEditMode ? 'VENUE CONFIGURATION // EDIT MODE' : 'VENUE ONBOARDING // STEP 01 OF 01'}
        showBack
        onBack={() => (isEditMode ? router.replace('/hub/profile') : router.back())}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          className="flex-1"
        >
          {/* Floodlit Sports Ground Photography Hero Section */}
          <View className="relative w-full h-44 bg-graphite overflow-hidden border-b border-stone">
            <Image
              source={IMAGES.arenaGround}
              className="w-full h-full"
              resizeMode="cover"
            />
            {/* Gritty Vignette & Atmospheric Stadium Lighting Overlay */}
            <View className="absolute inset-0 bg-graphite/60" />
            <View className="absolute inset-0 bg-gradient-to-t from-graphite via-graphite/40 to-transparent" />

            {/* Hero Content Overlay */}
            <View className="absolute bottom-3 left-5 right-5 z-10">
              <View className="flex-row items-center mb-1">
                <Text className="text-rust text-[10px] font-black uppercase tracking-widest">
                  {isEditMode ? 'FACILITY MANAGEMENT' : 'CIRCUIT ONBOARDING'}
                </Text>
                <Text className="text-stone-muted text-[10px] font-bold mx-1.5">
                  //
                </Text>
                <Text className="text-stone text-[10px] font-black uppercase tracking-wider">
                  {isEditMode ? 'EDIT DETAILS' : 'HUB ACCESS'}
                </Text>
              </View>
              <Text className="text-warm-white text-xl font-black uppercase tracking-tight">
                {isEditMode ? 'Update Venue Details' : 'Register Your Sports Hub'}
              </Text>
              <Text className="text-stone text-[11px] font-medium mt-0.5 tracking-tight">
                {isEditMode
                  ? 'Update your facility location, contact coordinator desk, and active sports.'
                  : 'Enter your venue details and available playing areas to register on the circuit.'}
              </Text>
            </View>
          </View>

          {/* Main Content Form */}
          <View className="px-5 py-4">
            {/* Notice Toast if triggered */}
            {editNotice && (
              <View className="mb-4 p-3 rounded-xl bg-stone-light border border-olive flex-row items-center shadow-xs">
                <Ionicons name="information-circle-sharp" size={18} color="#3D4438" />
                <Text className="text-olive text-xs font-bold ml-2 flex-1">
                  {editNotice}
                </Text>
              </View>
            )}

            {/* Section 1: Hub Credential Card */}
            <View className="bg-warm-white border border-stone border-b-[3px] border-b-stone-muted/70 rounded-xl p-3.5 mb-5 shadow-xs">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-3">
                  {/* 3D Venue Stadium Well */}
                  <View className="w-12 h-12 rounded-lg bg-stone-light border border-stone border-b-[2px] border-b-stone-muted items-center justify-center mr-3 relative">
                    <MaterialCommunityIcons name="domain" size={24} color="#3D4438" />
                    <View className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-stone-muted rounded-sm">
                      <Text className="text-warm-white text-[8px] font-black tracking-tighter">
                        HUB
                      </Text>
                    </View>
                  </View>

                  {/* Hub Identity Metadata */}
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-graphite text-sm font-black uppercase tracking-tight"
                    >
                      {hubName.trim() || 'Sports Hub Venue'}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-olive text-[11px] font-extrabold uppercase tracking-wide">
                        HUB OWNER
                      </Text>
                      <Text className="text-stone-muted text-[10px] font-bold mx-1.5">
                        ·
                      </Text>
                      <Text className="text-stone-muted text-[10px] font-medium tracking-tight">
                        {isEditMode ? 'Venue Configuration' : 'Venue Registration'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Edit / Info Action Button */}
                <Pressable
                  onPress={handleEditPress}
                  accessibilityRole="button"
                  accessibilityLabel="Edit hub credential"
                  className="py-1.5 px-3 rounded-lg bg-stone-light border border-stone border-b-[2px] border-b-stone-muted active:scale-95"
                >
                  <Text className="text-graphite text-[10px] font-black tracking-wider uppercase">
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
                  <Text className="text-graphite text-xs font-black tracking-wider uppercase">
                    SUPPORTED SPORTS
                  </Text>
                  <Text className="text-stone-muted text-[11px] font-bold ml-2">
                    ({selectedSports.length}/4 ACTIVE)
                  </Text>
                </View>
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wide">
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

              {/* Sports Validation Error in Rust */}
              {sportsError && (
                <View className="mt-2.5 p-2 rounded-lg bg-rust/10 border border-rust/30 flex-row items-center">
                  <Ionicons name="alert-circle-outline" size={15} color="#875646" />
                  <Text className="text-rust text-xs font-bold ml-1.5 flex-1">
                    {sportsError}
                  </Text>
                </View>
              )}
            </View>

            {/* Section 5: Location / Home Circuit */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-graphite text-xs font-black tracking-wider uppercase">
                  VENUE LOCATION // ZONE
                </Text>
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wide">
                  LAHORE CIRCUIT
                </Text>
              </View>

              <View className="bg-warm-white border border-stone border-b-[3px] border-b-stone-muted/70 rounded-xl p-3.5 flex-row items-center justify-between shadow-xs">
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-10 h-10 rounded-lg bg-olive/10 border border-olive/30 border-b-[2px] border-b-olive/50 items-center justify-center mr-3">
                    <Ionicons name="location-sharp" size={20} color="#3D4438" />
                  </View>

                  <View className="flex-1">
                    <Text className="text-graphite text-sm font-black uppercase tracking-tight">
                      {area}
                    </Text>
                    <Text className="text-stone-muted text-[11px] font-medium mt-0.5">
                      Neighborhood ground location for matchmaking
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => setIsAreaModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Change venue area"
                  className="py-1.5 px-3 rounded-lg bg-stone-light border border-stone border-b-[2px] border-b-stone-muted active:scale-95"
                >
                  <Text className="text-graphite text-[10px] font-black tracking-wider uppercase">
                    CHANGE
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Section 6: Number of Courts / Playing Areas (Tactile Stepper) */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-graphite text-xs font-black tracking-wider uppercase">
                  COURTS & PLAYING AREAS
                </Text>
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wide">
                  CAPACITY
                </Text>
              </View>
              <Text className="text-stone-muted text-[11px] font-medium mb-2.5">
                Total number of pitches, courts, or nets available at your facility.
              </Text>

              <View className="bg-warm-white border border-stone border-b-[3px] border-b-stone-muted/70 rounded-xl p-3.5 flex-row items-center justify-between shadow-xs">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-lg bg-stone/20 border border-stone/50 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="stadium-variant" size={20} color="#3D4438" />
                  </View>
                  <View>
                    <Text className="text-graphite text-base font-black uppercase tracking-tight">
                      {courtsCount} {courtsCount === 1 ? 'COURT / PITCH' : 'COURTS / PITCHES'}
                    </Text>
                    <Text className="text-stone-muted text-[10px] font-medium">
                      Configurable in Hub Courts
                    </Text>
                  </View>
                </View>

                {/* Tactile Numeric Stepper Controls */}
                <View className="flex-row items-center space-x-2">
                  <Pressable
                    onPress={handleDecrementCourts}
                    disabled={courtsCount <= 1}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease court count"
                    className={`w-10 h-10 rounded-xl items-center justify-center border border-b-[3px] active:scale-95 ${
                      courtsCount <= 1
                        ? 'bg-stone/10 border-stone/30 opacity-40'
                        : 'bg-warm-white border-stone border-b-stone-muted/80'
                    }`}
                  >
                    <Ionicons name="remove" size={18} color="#242522" />
                  </Pressable>

                  <View className="w-10 h-10 items-center justify-center bg-stone-light rounded-xl border border-stone">
                    <Text className="text-graphite text-base font-black">
                      {courtsCount}
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleIncrementCourts}
                    disabled={courtsCount >= 50}
                    accessibilityRole="button"
                    accessibilityLabel="Increase court count"
                    className={`w-10 h-10 rounded-xl items-center justify-center border border-b-[3px] active:scale-95 ${
                      courtsCount >= 50
                        ? 'bg-stone/10 border-stone/30 opacity-40'
                        : 'bg-warm-white border-stone border-b-stone-muted/80'
                    }`}
                  >
                    <Ionicons name="add" size={18} color="#242522" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Section 7: Admin Verification Notice (Preserves actual verified state) */}
            <View className="mb-6 p-4 rounded-xl bg-graphite border border-surface-border-dark">
              <View className="flex-row items-center mb-1.5">
                <Ionicons
                  name={hubOwnerProfile?.isVerified ? 'shield-checkmark' : 'shield-outline'}
                  size={15}
                  color={hubOwnerProfile?.isVerified ? '#3D4438' : '#875646'}
                />
                <Text
                  className={`text-[10px] font-black uppercase tracking-widest ml-1.5 ${
                    hubOwnerProfile?.isVerified ? 'text-olive' : 'text-rust'
                  }`}
                >
                  ADMIN VERIFICATION
                </Text>
              </View>

              <Text className="text-warm-white text-xs font-black uppercase tracking-tight">
                {hubOwnerProfile?.isVerified
                  ? 'Official Verified Facility'
                  : 'Pending Review After Registration'}
              </Text>
              <Text className="text-stone text-[11px] font-medium mt-1 leading-relaxed">
                {hubOwnerProfile?.isVerified
                  ? 'Your sports hub is verified by platform administrators. Facility specifications meet standard circuit specifications.'
                  : 'Your sports hub will be reviewed by platform administrators before receiving verified status. You can manage court inventory immediately.'}
              </Text>

              <View className="mt-2.5 pt-2 border-t border-stone/20 flex-row items-center justify-between">
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider">
                  {hubOwnerProfile?.isVerified
                    ? 'STATUS: VERIFIED'
                    : 'STATUS: UNVERIFIED (PENDING)'}
                </Text>
                <Text className="text-stone text-[10px] font-medium">
                  {hubOwnerProfile?.isVerified ? 'Circuit Approved' : 'Screen 21 Review'}
                </Text>
              </View>
            </View>

            {/* General Error in Rust */}
            {generalError && (
              <View className="mb-4 p-2.5 rounded-lg bg-rust/10 border border-rust/30 flex-row items-center">
                <Ionicons name="alert-circle-outline" size={16} color="#875646" />
                <Text className="text-rust text-xs font-bold ml-2 flex-1">
                  {generalError}
                </Text>
              </View>
            )}

            {/* Primary CTA */}
            <View className="pt-1 pb-6">
              <PrimaryButton
                title={isEditMode ? 'SAVE PROFILE CHANGES' : 'FINISH HUB SETUP & ENTER ARENA'}
                onPress={handleFinishSetup}
                loading={isSubmitting}
                variant="primary"
                testID="finish-hub-setup-btn"
              />

              <View className="flex-row items-center justify-center mt-3">
                <Ionicons name="shield-checkmark-sharp" size={13} color="#3D4438" />
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider ml-1.5">
                  Verified venue listing · Administrative governance
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Area Selector Modal (Reused pattern from Screen 04 & 25) */}
      <Modal
        visible={isAreaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAreaModalVisible(false)}
      >
        <Pressable
          onPress={() => setIsAreaModalVisible(false)}
          className="flex-1 bg-graphite/75 justify-center items-center px-5"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-warm-white border border-stone border-b-[4px] border-b-stone-muted p-5 shadow-2xl"
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-stone">
              <View>
                <Text className="text-rust text-[10px] font-black uppercase tracking-widest">
                  LOCATION SELECTOR
                </Text>
                <Text className="text-graphite text-base font-black uppercase tracking-tight mt-0.5">
                  Select Venue Circuit Location
                </Text>
              </View>
              <Pressable
                onPress={() => setIsAreaModalVisible(false)}
                className="w-8 h-8 rounded-lg bg-stone-light items-center justify-center border border-stone active:scale-95"
                accessibilityLabel="Close area modal"
              >
                <Ionicons name="close" size={18} color="#242522" />
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
                    className={`w-full p-3 rounded-xl border flex-row items-center justify-between my-1 transition-all active:scale-[0.99] ${
                      isSelected
                        ? 'bg-stone-light border-2 border-olive border-b-[3px] border-b-olive-dark'
                        : 'bg-warm-white border border-stone border-b-[2px] border-b-stone-muted/60'
                    }`}
                  >
                    <View className="flex-row items-center flex-1">
                      <Ionicons
                        name="location-sharp"
                        size={16}
                        color={isSelected ? '#3D4438' : '#75796F'}
                      />
                      <Text
                        className={`text-xs font-black uppercase tracking-tight ml-2.5 ${
                          isSelected ? 'text-olive' : 'text-graphite'
                        }`}
                      >
                        {item}
                      </Text>
                    </View>
                    {isSelected && (
                      <View className="w-5 h-5 rounded-full bg-olive items-center justify-center">
                        <Ionicons name="checkmark" size={13} color="#F4F1EA" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
