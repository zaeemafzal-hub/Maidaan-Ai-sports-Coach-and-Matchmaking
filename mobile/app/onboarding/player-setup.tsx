import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { Sport, SkillLevel } from '../../types';
import { profileService } from '../../services/profileService';
import { SportCard } from '../../components/ui/SportCard';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { AmbientGlowOverlay } from '../../components/ui';

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
    badge: 'TIER 1',
  },
  {
    key: 'intermediate',
    label: 'Intermediate',
    tagline: 'Club regular & structured matches',
    badge: 'TIER 2',
  },
  {
    key: 'advanced',
    label: 'Advanced',
    tagline: 'Premier tournament & league pace',
    badge: 'TIER 3',
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
  const insets = useSafeAreaInsets();
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

  if (!isInitialized || isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0C0D0E] items-center justify-center">
        <ActivityIndicator size="large" color="#E85D26" />
        <Text style={{ color: '#A0A5AD' }} className="text-[#A0A5AD] text-xs font-medium tracking-wider mt-3">
          Restoring Session...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0C0D0E]" edges={['top', 'bottom']}>
      {/* Restrained Atmospheric Hero Backdrop (135px height) */}
      <View
        pointerEvents="none"
        style={styles.heroBackdrop}
      >
        <Image
          source={require('../../assets/images/arena_player.jpg')}
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
        fallbackRoute="/(auth)/role-selection"
        transparent
      />

      <ScrollView
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
                style={{ color: '#FFFFFF' }}
                className="text-white text-xs font-bold uppercase tracking-wider"
              >
                Preferred Sports
              </Text>
              <Text
                style={{ color: '#E85D26' }}
                className="text-[#E85D26] text-xs font-bold"
              >
                {selectedSports.length}/4 Active
              </Text>
            </View>
            <Text
              style={{ color: '#A0A5AD' }}
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
                  style={{ color: '#EF4444' }}
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
                style={{ color: '#FFFFFF' }}
                className="text-white text-xs font-bold uppercase tracking-wider"
              >
                Skill Level
              </Text>
              <Text
                style={{ color: '#5C616A' }}
                className="text-[#5C616A] text-xs font-bold"
              >
                Select tier
              </Text>
            </View>
            <Text
              style={{ color: '#A0A5AD' }}
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
                    className={`w-full p-4 rounded-2xl border flex-row items-center justify-between transition-all active:scale-[0.99] ${
                      isSelected
                        ? 'bg-[#1B1D22] border-2 border-[#E85D26] shadow-sm shadow-[#E85D26]/20'
                        : 'bg-[#141518] border border-white/[0.08]'
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      {/* Division Badge */}
                      <View
                        className={`w-11 h-11 rounded-xl items-center justify-center mr-3.5 border ${
                          isSelected
                            ? 'bg-[#E85D26]/15 border-[#E85D26]/30'
                            : 'bg-[#101214] border border-white/[0.06]'
                        }`}
                      >
                        <Text
                          style={{ color: isSelected ? '#E85D26' : '#A0A5AD' }}
                          className={`text-xs font-black uppercase ${
                            isSelected ? 'text-[#E85D26]' : 'text-[#A0A5AD]'
                          }`}
                        >
                          {tier.badge}
                        </Text>
                      </View>

                      {/* Tier Label and Tagline */}
                      <View className="flex-1">
                        <Text
                          style={{ color: '#FFFFFF' }}
                          className="text-white text-sm font-bold tracking-tight"
                        >
                          {tier.label}
                        </Text>
                        <Text
                          style={{ color: '#A0A5AD' }}
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
                          ? 'border-2 border-[#E85D26] bg-[#E85D26]'
                          : 'border border-white/20 bg-[#101214]'
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

          {/* Section 3: Home Ground Area */}
          <View style={{ marginBottom: 30 }}>
            <View className="flex-row items-center justify-between mb-1.5">
              <Text
                style={{ color: '#FFFFFF' }}
                className="text-white text-xs font-bold uppercase tracking-wider"
              >
                Home Ground Area
              </Text>
              <Text
                style={{ color: '#5C616A' }}
                className="text-[#5C616A] text-xs font-bold"
              >
                Location
              </Text>
            </View>
            <Text
              style={{ color: '#A0A5AD' }}
              className="text-[#A0A5AD] text-xs font-normal mb-3.5"
            >
              Used to discover nearby matches and arenas.
            </Text>

            <View className="bg-[#141518] border border-white/[0.08] rounded-2xl p-4 flex-row items-center justify-between shadow-sm">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-11 h-11 rounded-xl bg-[#E85D26]/15 border border-[#E85D26]/30 items-center justify-center mr-3.5">
                  <Ionicons name="location" size={20} color="#E85D26" />
                </View>

                <View className="flex-1">
                  <Text
                    style={{ color: '#FFFFFF' }}
                    className="text-white text-sm font-bold tracking-tight"
                  >
                    {area}
                  </Text>
                  <Text
                    style={{ color: '#A0A5AD' }}
                    className="text-[#A0A5AD] text-xs font-normal mt-0.5"
                  >
                    Lahore metropolitan area
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setIsAreaModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Change primary area"
                className="py-2 px-3.5 rounded-xl bg-[#1B1D22] border border-white/[0.12] active:bg-[#20232A] active:scale-95"
              >
                <Text
                  style={{ color: '#FFFFFF' }}
                  className="text-white text-xs font-bold"
                >
                  Change
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Finish Setup CTA & Trust Guarantee */}
          <View style={{ marginTop: 2 }}>
            <PrimaryButton
              title="Finish Setup & Enter Maidaan"
              onPress={handleFinishSetup}
              loading={isSubmitting}
              variant="primary"
              size="lg"
              testID="finish-player-setup-btn"
            />

            <View className="flex-row items-center justify-center mt-3.5">
              <Ionicons name="shield-checkmark" size={14} color="#E85D26" />
              <Text
                style={{ color: '#A0A5AD' }}
                className="text-[#A0A5AD] text-xs font-medium ml-1.5"
              >
                Instant match discovery • Real-time matchmaking • Free to play
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
          className="flex-1 bg-black/80 justify-center items-center px-5"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#141518] border border-white/[0.08] p-5 shadow-2xl"
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
              <View>
                <Text
                  style={{ color: '#E85D26' }}
                  className="text-[#E85D26] text-[11px] font-bold uppercase tracking-wider"
                >
                  Location Selector
                </Text>
                <Text
                  style={{ color: '#FFFFFF' }}
                  className="text-white text-base font-bold tracking-tight mt-0.5"
                >
                  Select Home Ground Area
                </Text>
              </View>
              <Pressable
                onPress={() => setIsAreaModalVisible(false)}
                className="w-8 h-8 rounded-lg bg-[#1B1D22] items-center justify-center border border-white/[0.08] active:bg-[#20232A] active:scale-95"
                accessibilityLabel="Close area modal"
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* List of preset areas */}
            <View style={{ gap: 8 }}>
              {PRESET_AREAS.map((item) => {
                const isSelected = area === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setArea(item);
                      setIsAreaModalVisible(false);
                    }}
                    className={`w-full p-3.5 rounded-xl border flex-row items-center justify-between transition-all active:scale-[0.99] ${
                      isSelected
                        ? 'bg-[#1B1D22] border-[#E85D26]'
                        : 'bg-[#141518] border-white/[0.08]'
                    }`}
                  >
                    <View className="flex-row items-center flex-1">
                      <Ionicons
                        name="location"
                        size={16}
                        color={isSelected ? '#E85D26' : '#A0A5AD'}
                      />
                      <Text
                        style={{ color: isSelected ? '#E85D26' : '#FFFFFF' }}
                        className={`text-sm font-semibold ml-2.5 ${
                          isSelected ? 'text-[#E85D26]' : 'text-white'
                        }`}
                      >
                        {item}
                      </Text>
                    </View>
                    {isSelected && (
                      <View className="w-5 h-5 rounded-full bg-[#E85D26] items-center justify-center">
                        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
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

const styles = StyleSheet.create({
  heroBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 135,
    overflow: 'hidden',
    zIndex: 0,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },
  vignetteTop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(12, 13, 14, 0.35)',
  },
  vignetteMid: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12, 13, 14, 0.75)',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 35,
    backgroundColor: '#0C0D0E',
  },
});
