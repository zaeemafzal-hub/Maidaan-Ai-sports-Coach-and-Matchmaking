import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { Sport, SkillLevel, PlayerProfile } from '../../types';
import { profileService } from '../../services/profileService';
import { SportCard } from '../../components/ui/SportCard';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { PrimaryButton } from '../../components/ui/PrimaryButton';

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
    tagline: 'Grassroots & friendly casual play',
    badge: 'DIV 03',
  },
  {
    key: 'intermediate',
    label: 'Intermediate',
    tagline: 'Club regular & structured matches',
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

export default function PlayerSetupScreen() {
  const {
    currentUser,
    selectedRole,
    setPlayerProfile,
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

    if (currentRole && currentRole !== 'PLAYER') {
      if (currentRole === 'TEAM_CAPTAIN') {
        router.replace('/onboarding/captain-setup');
      } else if (currentRole === 'HUB_OWNER') {
        router.replace('/onboarding/hub-setup');
      } else {
        router.replace('/(auth)/role-selection');
      }
    }
  }, [isInitialized, isLoading, currentUser, currentRole]);

  const [selectedSports, setSelectedSports] = useState<Sport[]>(['cricket']);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [area, setArea] = useState('Gulberg, Lahore');
  const [isAreaModalVisible, setIsAreaModalVisible] = useState(false);
  const [editNotice, setEditNotice] = useState<string | null>(null);
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
    if (selectedSports.length === 0) {
      setValidationError('Please select at least one preferred sport.');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const result = await profileService.savePlayerProfile({
        preferredSports: selectedSports,
        skillLevel,
        primaryLocation: area,
      });

      setPlayerProfile(result.profile);
      setOnboardingCompleted(true);

      router.replace('/(tabs)/discover');
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to complete player setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPress = () => {
    setEditNotice('Avatar and jersey details can be updated anytime from your Player Profile tab.');
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

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {/* Sports Photography Match-Day Hero Section */}
        <View className="relative w-full h-44 bg-graphite overflow-hidden border-b border-stone">
          <Image
            source={require('../../assets/images/arena_player.jpg')}
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
                LAHORE ARENA
              </Text>
            </View>
            <Text className="text-warm-white text-xl font-black uppercase tracking-tight">
              Set Up Your Athlete Profile
            </Text>
            <Text className="text-stone text-[11px] font-medium mt-0.5 tracking-tight">
              Register your primary sports and competitive tier for local matchmaking.
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

          {/* Section 1: Player Credential Card (3D Stamped Roster Card) */}
          <View className="bg-warm-white border border-stone border-b-[3px] border-b-stone-muted/70 rounded-xl p-3.5 mb-5 shadow-xs">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                {/* 3D Athlete Silhouette Well */}
                <View className="w-12 h-12 rounded-lg bg-stone-light border border-stone border-b-[2px] border-b-stone-muted items-center justify-center mr-3 relative">
                  <MaterialCommunityIcons name="shield-account" size={24} color="#3D4438" />
                  <View className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-olive rounded-sm">
                    <Text className="text-warm-white text-[8px] font-black tracking-tighter">
                      #07
                    </Text>
                  </View>
                </View>

                {/* Player Name and Metadata */}
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text
                      numberOfLines={1}
                      className="text-graphite text-sm font-black uppercase tracking-tight flex-1"
                    >
                      {currentUser?.name || 'Recreational Athlete'}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-0.5">
                    <Text className="text-olive text-[11px] font-extrabold uppercase tracking-wide">
                      PLAYER ROLE
                    </Text>
                    <Text className="text-stone-muted text-[10px] font-bold mx-1.5">
                      ·
                    </Text>
                    <Text className="text-stone-muted text-[10px] font-medium tracking-tight">
                      Ready for fixtures
                    </Text>
                  </View>
                </View>
              </View>

              {/* Edit Credential Button */}
              <Pressable
                onPress={handleEditPress}
                accessibilityRole="button"
                accessibilityLabel="Edit player profile"
                className="py-1.5 px-3 rounded-lg bg-stone-light border border-stone border-b-[2px] border-b-stone-muted active:scale-95"
              >
                <Text className="text-graphite text-[10px] font-black tracking-wider uppercase">
                  EDIT
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Section 2: Preferred Sports (Cricket, Badminton, Padel, Football) */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Text className="text-graphite text-xs font-black tracking-wider uppercase">
                  PREFERRED SPORTS
                </Text>
                <Text className="text-stone-muted text-[11px] font-bold ml-2">
                  ({selectedSports.length}/4 ACTIVE)
                </Text>
              </View>
              <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wide">
                SELECT 1 OR MORE
              </Text>
            </View>

            {/* 4 Sport Cards Grid Row */}
            <View className="flex-row space-x-2">
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

            {/* Validation Message in Rust */}
            {validationError && (
              <View className="mt-2.5 p-2 rounded-lg bg-rust/10 border border-rust/30 flex-row items-center">
                <Ionicons name="alert-circle-outline" size={15} color="#875646" />
                <Text className="text-rust text-xs font-bold ml-1.5 flex-1">
                  {validationError}
                </Text>
              </View>
            )}
          </View>

          {/* Section 3: Skill Level (Tactical Competitive Divisions) */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-graphite text-xs font-black tracking-wider uppercase">
                COMPETITIVE TIER
              </Text>
              <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wide">
                SELECT DIVISION
              </Text>
            </View>
            <Text className="text-stone-muted text-[11px] font-medium mb-2.5">
              Determines matchmaking balance and fixture difficulty.
            </Text>

            {/* Tactical Division Cards */}
            <View className="space-y-2">
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
                    className={`w-full p-3 rounded-xl border flex-row items-center justify-between my-1 transition-all active:scale-[0.99] ${
                      isSelected
                        ? 'bg-stone-light border-2 border-olive border-b-[4px] border-b-olive-dark shadow-sm'
                        : 'bg-warm-white border border-stone border-b-[2px] border-b-stone-muted/60'
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      {/* Division Badge / Radio Pill */}
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

                      {/* Tier Label and Tagline */}
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

          {/* Section 4: Your Area (Home Ground & Matchmaking Zone) */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-graphite text-xs font-black tracking-wider uppercase">
                HOME GROUND // ZONE
              </Text>
              <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wide">
                CIRCUIT LOCATION
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
                    Used to discover nearby fixtures & public grounds
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setIsAreaModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Change primary area"
                className="py-1.5 px-3 rounded-lg bg-stone-light border border-stone border-b-[2px] border-b-stone-muted active:scale-95"
              >
                <Text className="text-graphite text-[10px] font-black tracking-wider uppercase">
                  CHANGE
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Finish Setup CTA & Guarantee */}
          <View className="pt-1 pb-6">
            <PrimaryButton
              title="FINISH SETUP & ENTER ARENA"
              onPress={handleFinishSetup}
              loading={isSubmitting}
              variant="primary"
              testID="finish-player-setup-btn"
            />

            <View className="flex-row items-center justify-center mt-3">
              <Ionicons name="shield-checkmark-sharp" size={13} color="#3D4438" />
              <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider ml-1.5">
                Instant match discovery · Real-time matchmaking · Free-first
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Area Selector Modal */}
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
                  Select Home Ground Area
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

            {/* List of preset areas */}
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
