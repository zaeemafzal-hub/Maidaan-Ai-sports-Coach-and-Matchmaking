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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { Sport, SkillLevel, CaptainProfile } from '../../types';
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

interface SkillTierConfig {
  key: SkillLevel;
  label: string;
  tagline: string;
  badge: string;
}

const SKILL_TIERS: SkillTierConfig[] = [
  {
    key: 'beginner',
    label: 'Beginner',
    tagline: 'Grassroots & friendly casual fixtures',
    badge: 'DIV 03',
  },
  {
    key: 'intermediate',
    label: 'Intermediate',
    tagline: 'Club regular & structured competitive play',
    badge: 'DIV 02',
  },
  {
    key: 'advanced',
    label: 'Advanced',
    tagline: 'Premier tournament & league pace',
    badge: 'DIV 01',
  },
];

const PRESET_AREAS = [
  'Gulberg, Lahore',
  'DHA Phase 5, Lahore',
  'Model Town, Lahore',
  'Johar Town, Lahore',
  'Cantt, Lahore',
];

export default function CaptainSetupScreen() {
  const {
    currentUser,
    selectedRole,
    setCaptainProfile,
    setOnboardingCompleted,
    isInitialized,
    isLoading,
  } = useAuthStore();

  const currentRole = currentUser?.role || selectedRole;

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    if (!currentUser) {
      router.replace('/(auth)/login');
      return;
    }

    if (currentRole && currentRole !== 'TEAM_CAPTAIN') {
      if (currentRole === 'PLAYER') {
        router.replace('/onboarding/player-setup');
      } else if (currentRole === 'HUB_OWNER') {
        router.replace('/onboarding/hub-setup');
      } else {
        router.replace('/(auth)/role-selection');
      }
    }
  }, [isInitialized, isLoading, currentUser, currentRole]);

  // Approved Form Fields
  const [teamName, setTeamName] = useState('');
  const [primarySport, setPrimarySport] = useState<Sport>('football');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [area, setArea] = useState('Gulberg, Lahore');

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
      setTeamNameError('Team name is required');
      isValid = false;
    } else if (trimmed.length < 2) {
      setTeamNameError('Team name must be at least 2 characters');
      isValid = false;
    } else {
      setTeamNameError(undefined);
    }

    if (!primarySport) {
      setGeneralError('Please select a primary sport');
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

      router.replace('/(tabs)/discover');
    } catch (err: any) {
      setGeneralError(err?.message || 'Failed to complete captain setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPress = () => {
    setEditNotice('Team details and home ground can be updated anytime from your Captain Dashboard.');
    setTimeout(() => setEditNotice(null), 3500);
  };

  if (!isInitialized || isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white items-center justify-center">
        <ActivityIndicator size="large" color="#3D4438" />
        <Text className="text-stone-muted text-xs font-bold uppercase tracking-widest mt-3">
          Restoring Arena Session...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
      {/* Concrete Arena Match-Day Header */}
      <ArenaHeader
        title="MAIDAAN"
        subtitle="MATCH-DAY ROSTER // STEP 01 OF 01"
        showBack
        fallbackRoute="/(auth)/role-selection"
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
          {/* Sports Photography Match-Day Hero Section */}
          <View className="relative w-full h-44 bg-graphite overflow-hidden border-b border-stone">
            <Image
              source={IMAGES.arenaTeam}
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
                  CIRCUIT ONBOARDING
                </Text>
                <Text className="text-stone-muted text-[10px] font-bold mx-1.5">
                  //
                </Text>
                <Text className="text-stone text-[10px] font-black uppercase tracking-wider">
                  CAPTAIN ACCESS
                </Text>
              </View>
              <Text className="text-warm-white text-xl font-black uppercase tracking-tight">
                Set Up Your Captain Profile
              </Text>
              <Text className="text-stone text-[11px] font-medium mt-0.5 tracking-tight">
                Establish your team identity and competitive tier to organize fixtures.
              </Text>
            </View>
          </View>

          {/* Main Content Form */}
          <View className="px-5 py-4">
            {/* Edit Notice Toast if triggered */}
            {editNotice && (
              <View className="mb-4 p-3 rounded-xl bg-stone-light border border-olive flex-row items-center shadow-xs">
                <Ionicons name="information-circle-sharp" size={18} color="#3D4438" />
                <Text className="text-olive text-xs font-bold ml-2 flex-1">
                  {editNotice}
                </Text>
              </View>
            )}

            {/* Section 1: Captain Credential Card */}
            <View className="bg-warm-white border border-stone border-b-[3px] border-b-stone-muted/70 rounded-xl p-3.5 mb-5 shadow-xs">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-3">
                  {/* 3D Armband / Captain Shield Well */}
                  <View className="w-12 h-12 rounded-lg bg-stone-light border border-stone border-b-[2px] border-b-stone-muted items-center justify-center mr-3 relative">
                    <MaterialCommunityIcons name="shield-star" size={24} color="#3D4438" />
                    <View className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-rust rounded-sm">
                      <Text className="text-warm-white text-[8px] font-black tracking-tighter">
                        CPT
                      </Text>
                    </View>
                  </View>

                  {/* Captain Identity Metadata */}
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-graphite text-sm font-black uppercase tracking-tight"
                    >
                      {teamName.trim() || currentUser?.name || 'Squad Captain'}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-olive text-[11px] font-extrabold uppercase tracking-wide">
                        TEAM CAPTAIN
                      </Text>
                      <Text className="text-stone-muted text-[10px] font-bold mx-1.5">
                        ·
                      </Text>
                      <Text className="text-stone-muted text-[10px] font-medium tracking-tight">
                        Ready to manage fixtures
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Edit Action Button */}
                <Pressable
                  onPress={handleEditPress}
                  accessibilityRole="button"
                  accessibilityLabel="Edit captain credential"
                  className="py-1.5 px-3 rounded-lg bg-stone-light border border-stone border-b-[2px] border-b-stone-muted active:scale-95"
                >
                  <Text className="text-graphite text-[10px] font-black tracking-wider uppercase">
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
                <Text className="text-graphite text-xs font-black tracking-wider uppercase">
                  PRIMARY SPORT
                </Text>
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wide">
                  SINGLE SELECT
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

            {/* Section 4: Default Skill Range (Tactical Competitive Divisions) */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-graphite text-xs font-black tracking-wider uppercase">
                  DEFAULT SKILL RANGE
                </Text>
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wide">
                  FIXTURE TIER
                </Text>
              </View>
              <Text className="text-stone-muted text-[11px] font-medium mb-2.5">
                Establishes the default matchmaking tier when you host fixtures.
              </Text>

              {/* Tactical Division Cards */}
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
                      accessibilityLabel={`${tier.label} fixture tier`}
                      className={`w-full p-3 rounded-xl border flex-row items-center justify-between my-1 transition-all active:scale-[0.99] ${
                        isSelected
                          ? 'bg-stone-light border-2 border-olive border-b-[4px] border-b-olive-dark shadow-sm'
                          : 'bg-warm-white border border-stone border-b-[2px] border-b-stone-muted/60'
                      }`}
                    >
                      <View className="flex-row items-center flex-1 mr-3">
                        {/* Division Badge */}
                        <View
                          className={`w-10 h-10 rounded-lg items-center justify-center mr-3 border ${
                            isSelected
                              ? 'bg-olive border-olive-dark'
                              : 'bg-stone/20 border-stone/50'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-black uppercase ${
                              isSelected ? 'text-warm-white' : 'text-stone-muted'
                            }`}
                          >
                            {tier.badge}
                          </Text>
                        </View>

                        {/* Tier Label and Description */}
                        <View className="flex-1">
                          <Text
                            className={`text-sm font-black uppercase tracking-tight ${
                              isSelected ? 'text-graphite' : 'text-graphite/85'
                            }`}
                          >
                            {tier.label}
                          </Text>
                          <Text className="text-stone-muted text-[11px] font-medium mt-0.5">
                            {tier.tagline}
                          </Text>
                        </View>
                      </View>

                      {/* Radio Indicator */}
                      <View
                        className={`w-5 h-5 rounded-full border items-center justify-center ${
                          isSelected
                            ? 'border-olive bg-olive'
                            : 'border-stone bg-warm-white'
                        }`}
                      >
                        {isSelected && (
                          <View className="w-2 h-2 rounded-full bg-warm-white" />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Section 5: Home Circuit / Area */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-graphite text-xs font-black tracking-wider uppercase">
                  HOME CIRCUIT // ZONE
                </Text>
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wide">
                  FIXTURE BASE
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
                      Default neighborhood for hosting fixtures
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => setIsAreaModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Change home area"
                  className="py-1.5 px-3 rounded-lg bg-stone-light border border-stone border-b-[2px] border-b-stone-muted active:scale-95"
                >
                  <Text className="text-graphite text-[10px] font-black tracking-wider uppercase">
                    CHANGE
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* General Validation Error in Rust */}
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
                title="FINISH SETUP & ENTER ARENA"
                onPress={handleFinishSetup}
                loading={isSubmitting}
                variant="primary"
                testID="finish-captain-setup-btn"
              />

              <View className="flex-row items-center justify-center mt-3">
                <Ionicons name="shield-checkmark-sharp" size={13} color="#3D4438" />
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider ml-1.5">
                  Verified fixture hosting · Real-time squad recruitment
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Area Selector Modal (Reused pattern from Screen 04) */}
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
                  Select Team Home Circuit
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
