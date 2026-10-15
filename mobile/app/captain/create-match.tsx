import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { MatchSlotItem } from '../../constants/matches';
import { matchService } from '../../services/matchService';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Sport, SkillLevel } from '../../types';
import { weatherService, WeatherOutlook } from '../../services/weatherService';
import { WeatherOutlookCard } from '../../components/ui/WeatherOutlookCard';

// Sport display metadata
interface SportMeta {
  label: string;
  icon: 'cricket' | 'badminton' | 'tennis' | 'soccer';
  defaultFormat: string;
  defaultTotalSlots: number;
  defaultOpenSlots: number;
  defaultFee: string;
  formats: string[];
}

const SPORTS_CONFIG: Record<Sport, SportMeta> = {
  football: {
    label: 'Football',
    icon: 'soccer',
    defaultFormat: '7v7 Friendly',
    defaultTotalSlots: 14,
    defaultOpenSlots: 3,
    defaultFee: 'Rs. 450',
    formats: [
      '5v5 Friendly',
      '7v7 Friendly',
      '11v11 Friendly',
    ],
  },
  cricket: {
    label: 'Cricket',
    icon: 'cricket',
    defaultFormat: 'Tape Ball Friendly',
    defaultTotalSlots: 16,
    defaultOpenSlots: 4,
    defaultFee: 'Rs. 300',
    formats: [
      'Tape Ball Friendly',
      'Box Cricket',
      'Hard Ball Friendly',
    ],
  },
  padel: {
    label: 'Padel',
    icon: 'tennis',
    defaultFormat: 'Friendly Doubles',
    defaultTotalSlots: 4,
    defaultOpenSlots: 1,
    defaultFee: 'Rs. 850',
    formats: [
      'Friendly Doubles',
      'Casual Singles',
    ],
  },
  badminton: {
    label: 'Badminton',
    icon: 'badminton',
    defaultFormat: 'Friendly Doubles',
    defaultTotalSlots: 4,
    defaultOpenSlots: 2,
    defaultFee: 'Rs. 350',
    formats: [
      'Friendly Doubles',
      'Casual Singles',
    ],
  },
};

// Skill tier metadata
const SKILL_METAS: Record<
  SkillLevel,
  { label: string; badge: string; subtitle: string; variant: 'stone' | 'olive' | 'rust' }
> = {
  beginner: {
    label: 'Beginner',
    badge: 'Tier 3',
    subtitle: 'Grassroots Casual',
    variant: 'stone',
  },
  intermediate: {
    label: 'Intermediate',
    badge: 'Tier 2',
    subtitle: 'Club Regular',
    variant: 'olive',
  },
  advanced: {
    label: 'Advanced',
    badge: 'Tier 1',
    subtitle: 'Premier Circuit',
    variant: 'rust',
  },
};

const VENUE_PRESETS: {
  name: string;
  area: string;
  sport: Sport;
  mapPosition: { x: number; y: number };
}[] = [
  {
    name: 'Model Town Football Turf, Pitch 1',
    area: 'Model Town, Lahore',
    sport: 'football',
    mapPosition: { x: 34, y: 56 },
  },
  {
    name: 'Legends Arena, Court 2',
    area: 'Gulberg III, Lahore',
    sport: 'football',
    mapPosition: { x: 50, y: 38 },
  },
  {
    name: 'Smash Padel Club, Court 1',
    area: 'DHA Phase 5, Lahore',
    sport: 'padel',
    mapPosition: { x: 73, y: 48 },
  },
  {
    name: 'Padelo Arena, Indoor Glass Court',
    area: 'Gulberg II, Lahore',
    sport: 'padel',
    mapPosition: { x: 54, y: 35 },
  },
  {
    name: 'Garrison Sports Complex, Court 1',
    area: 'Cantt, Lahore',
    sport: 'badminton',
    mapPosition: { x: 65, y: 22 },
  },
  {
    name: 'Lahore Gymkhana Badminton Arena',
    area: 'Mall Road, Lahore',
    sport: 'badminton',
    mapPosition: { x: 42, y: 30 },
  },
  {
    name: 'Mughalpura Cricket Ground, Pitch 2',
    area: 'Mughalpura, Lahore',
    sport: 'cricket',
    mapPosition: { x: 68, y: 18 },
  },
  {
    name: 'Johar Town Arena Turf',
    area: 'Johar Town, Lahore',
    sport: 'football',
    mapPosition: { x: 22, y: 72 },
  },
];

// Quick date chips
const DATE_PRESETS = ['Tonight', 'Tomorrow', 'Wednesday', 'Friday', 'Saturday', 'Sunday'];

// Quick time presets
const TIME_PRESETS = [
  '8:30 PM - 10:00 PM',
  '7:00 PM - 8:30 PM',
  '9:00 PM - 10:30 PM',
  '6:00 PM - 7:30 PM',
  '10:00 PM - 11:30 PM',
];

export default function CreateMatchScreen() {
  const { currentUser, selectedRole, captainProfile } = useAuthStore();

  // Determine current effective role
  const effectiveRole = currentUser?.role || selectedRole || 'PLAYER';
  const isCaptain = effectiveRole === 'TEAM_CAPTAIN';

  // Sourced captain identity strictly from auth store (no fake fallbacks)
  const captainUserId = currentUser?.id ?? captainProfile?.userId;
  const captainName = currentUser?.name?.trim();
  const captainTeamName = captainProfile?.teamName?.trim();

  // Display strings for neutral presentation when not set
  const displayCaptainName = captainName || 'Captain Name Not Set';
  const displayTeamName = captainTeamName || 'Team Name Not Set';

  // Initial prefill values from captain profile
  const initialSport: Sport =
    captainProfile?.sports && captainProfile.sports.length > 0
      ? captainProfile.sports[0]
      : 'football';

  const initialSkill: SkillLevel = captainProfile?.skillLevel || 'intermediate';
  const initialArea = captainProfile?.primaryLocation?.trim() || 'Model Town, Lahore';

  // Form State
  const [sport, setSport] = useState<Sport>(initialSport);
  const [title, setTitle] = useState<string>(
    `${captainTeamName ? captainTeamName : 'Friendly'} ${SPORTS_CONFIG[initialSport].label} Match`
  );
  const [format, setFormat] = useState<string>(SPORTS_CONFIG[initialSport].defaultFormat);
  const [date, setDate] = useState<string>('Tonight');
  const [time, setTime] = useState<string>('8:30 PM - 10:00 PM');
  const [duration, setDuration] = useState<string>('90 Mins');
  const [groundName, setGroundName] = useState<string>('Model Town Football Turf, Pitch 1');
  const [area, setArea] = useState<string>(initialArea);
  const [totalSlots, setTotalSlots] = useState<number>(
    SPORTS_CONFIG[initialSport].defaultTotalSlots
  );
  const [slotsOpen, setSlotsOpen] = useState<number>(
    SPORTS_CONFIG[initialSport].defaultOpenSlots
  );
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(initialSkill);
  const [feePerPlayer, setFeePerPlayer] = useState<string>(
    SPORTS_CONFIG[initialSport].defaultFee
  );
  const [description, setDescription] = useState<string>(
    'Evening friendly match on turf. Looking for committed players to fill out our squad. Balls and equipment provided.'
  );
  const [venueNotes, setVenueNotes] = useState<string>(
    'Please arrive 15 minutes before kick-off. Ample parking available on-site.'
  );

  // UI / Feedback State
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdFixture, setCreatedFixture] = useState<MatchSlotItem | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [weather, setWeather] = useState<WeatherOutlook | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);

  // Debounced weather outlook fetcher based on area, date, time, and sport
  React.useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        setWeatherLoading(true);
        const data = await weatherService.getWeather({
          area,
          date,
          time,
          sport,
        });
        if (!isCancelled) {
          setWeather(data);
        }
      } catch {
        // Non-critical: failure leaves weather as null / fallback
      } finally {
        if (!isCancelled) {
          setWeatherLoading(false);
        }
      }
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [area, date, time, sport]);

  // Handle Sport Change: updates defaults intelligently
  const handleSelectSport = (newSport: Sport) => {
    setSport(newSport);
    const config = SPORTS_CONFIG[newSport];
    setFormat(config.defaultFormat);
    setTotalSlots(config.defaultTotalSlots);
    setSlotsOpen(config.defaultOpenSlots);
    setFeePerPlayer(config.defaultFee);
    setTitle(`${captainTeamName ? captainTeamName : 'Friendly'} ${config.label} Session`);

    // Match ground preset if available
    const matchingVenue = VENUE_PRESETS.find((v) => v.sport === newSport);
    if (matchingVenue) {
      setGroundName(matchingVenue.name);
      setArea(matchingVenue.area);
    }
  };

  // Adjust total slots stepper
  const handleAdjustTotalSlots = (delta: number) => {
    const next = Math.max(2, Math.min(30, totalSlots + delta));
    setTotalSlots(next);
    if (slotsOpen > next) {
      setSlotsOpen(next);
    }
  };

  // Adjust open slots stepper
  const handleAdjustOpenSlots = (delta: number) => {
    const next = Math.max(1, Math.min(totalSlots, slotsOpen + delta));
    setSlotsOpen(next);
  };

  // Quick preset selector for demo venue labels
  const handleSelectVenuePreset = (venue: {
    name: string;
    area: string;
    sport: Sport;
    mapPosition: { x: number; y: number };
  }) => {
    setGroundName(venue.name);
    setArea(venue.area);
  };

  // =========================================================================
  // 1. ROLE GUARD: NON-CAPTAIN USER ACCESS
  // =========================================================================
  if (!isCaptain) {
    return (
      <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top']}>
        <ArenaHeader
          title="Create Match"
          subtitle="Role Restriction"
          showBack
          onBack={() => router.replace('/(tabs)/discover')}
        />
        <View className="flex-1 items-center justify-center p-6 bg-[#171A1D]">
          <View className="w-16 h-16 rounded-full bg-[#F4A261]/10 items-center justify-center border border-[#F4A261]/30 mb-5">
            <Ionicons name="lock-closed" size={28} color="#F4A261" />
          </View>

          <ArenaBadge label="CAPTAIN REQUIRED" variant="rust" size="md" />

          <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight text-center mt-3">
            Captain Privileges Required
          </Text>

          <Text className="text-[#A0A5AD] text-sm text-center mt-2 max-w-[310px] leading-5">
            Only Team Captain accounts can schedule matches and open player slots on the Maidaan board.
          </Text>

          <View className="w-full mt-6 space-y-3">
            <PrimaryButton
              title="RETURN TO DISCOVER"
              variant="primary"
              onPress={() => router.replace('/(tabs)/discover')}
            />
            <PrimaryButton
              title="SWITCH TO CAPTAIN PROFILE"
              variant="outline"
              onPress={() => router.replace('/(auth)/role-selection')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // 2. VALIDATION & SUBMISSION HANDLER
  // =========================================================================
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!captainUserId) {
      errors.auth = 'Captain identity unavailable. Please complete Captain Setup or sign in again.';
    }
    if (!title.trim() || title.trim().length < 4) {
      errors.title = 'Match title must be at least 4 characters long';
    }
    if (!groundName.trim()) {
      errors.groundName = 'Ground / Venue name is required';
    }
    if (!area.trim()) {
      errors.area = 'Area / Neighborhood location is required';
    }
    if (slotsOpen < 1) {
      errors.slotsOpen = 'At least 1 open slot is required for player discovery';
    }
    if (slotsOpen > totalSlots) {
      errors.slotsOpen = 'Open slots cannot exceed total squad capacity';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleResetForm = () => {
    setSport(initialSport);
    const config = SPORTS_CONFIG[initialSport];
    setTitle(
      `${captainTeamName ? captainTeamName : 'Friendly'} ${config.label} Match`
    );
    setFormat(config.defaultFormat);
    setDate('Tonight');
    setTime('8:30 PM - 10:00 PM');
    setDuration('90 Mins');
    setGroundName('Model Town Football Turf, Pitch 1');
    setArea(initialArea);
    setTotalSlots(config.defaultTotalSlots);
    setSlotsOpen(config.defaultOpenSlots);
    setSkillLevel(initialSkill);
    setFeePerPlayer(config.defaultFee);
    setDescription(
      'Evening friendly match on turf. Looking for committed players to fill out our squad. Balls and equipment provided.'
    );
    setVenueNotes(
      'Please arrive 15 minutes before kick-off. Ample parking available on-site.'
    );
    setFormErrors({});
    setCreatedFixture(null);
  };

  const handlePublishMatch = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const matchingPreset = VENUE_PRESETS.find(
        (v) => v.name.toLowerCase() === groundName.trim().toLowerCase()
      );
      const resolvedCoordinates = matchingPreset
        ? matchingPreset.mapPosition
        : { x: 50, y: 50 };

      let numericContribution: number | null = null;
      const digits = feePerPlayer.replace(/[^0-9]/g, '');
      if (digits) {
        numericContribution = parseInt(digits, 10);
      }

      const matchDate = date.trim() && date.trim().toLowerCase() !== 'tonight'
        ? date.trim()
        : new Date().toISOString().split('T')[0];

      const matchStartTime = time.includes(' - ')
        ? time.split(' - ')[0].trim()
        : (time.trim() || '20:30');

      const combinedNotes = [
        description.trim(),
        venueNotes.trim() ? `Arrival: ${venueNotes.trim()}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const newFixture = await matchService.createMatch({
        sport,
        title: title.trim(),
        format: format.trim() || SPORTS_CONFIG[sport].defaultFormat,
        date: matchDate,
        startTime: matchStartTime,
        venueName: groundName.trim(),
        area: area.trim(),
        skillLevel,
        totalCapacity: totalSlots,
        openSlots: slotsOpen,
        contributionPerPlayer: numericContribution,
        notes: combinedNotes.slice(0, 300),
        schematicMapPosition: resolvedCoordinates,
      });

      setCreatedFixture(newFixture);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('[CreateMatchScreen] Publish error:', err);
      setFormErrors({
        submit: err?.message || 'Failed to create fixture. Please check your network and input.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeSportConfig = SPORTS_CONFIG[sport];
  const activeSkillConfig = SKILL_METAS[skillLevel];
  const reservedCount = totalSlots - slotsOpen;

  return (
    <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Modern Athletic Header */}
        <ArenaHeader
          title="Schedule Match"
          subtitle="Open Player Slots"
          showBack
          fallbackRoute="/captain/dashboard"
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/captain/dashboard');
            }
          }}
        />

        <ScrollView
          className="flex-1 bg-[#171A1D]"
          contentContainerStyle={{ paddingBottom: 64 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* TOP BANNER: CAPTAIN CREDENTIAL CONTEXT */}
          <View className="px-4 py-3 bg-[#1F2327] border-b border-white/10 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-2">
              <View className="w-2.5 h-2.5 rounded-full bg-[#E85D26] mr-2" />
              <View>
                <Text className="text-[#F4F6F7] text-xs font-black uppercase tracking-tight">
                  {displayTeamName}
                </Text>
                <Text className="text-[#A0A5AD] text-[10px] font-mono">
                  Captain: {displayCaptainName}
                </Text>
              </View>
            </View>
            <ArenaBadge label="CAPTAIN" variant="olive" size="sm" />
          </View>

          {/* MISSING CAPTAIN ID ERROR BANNER */}
          {formErrors.auth ? (
            <View className="mx-4 mt-3 p-3 bg-[#F4A261]/10 border border-[#F4A261]/30 rounded-xl">
              <Text className="text-[#F4A261] text-xs font-bold uppercase tracking-wider">
                Captain Identity Unavailable
              </Text>
              <Text className="text-[#F4F6F7] text-xs mt-1">
                {formErrors.auth}
              </Text>
            </View>
          ) : null}

          {/* PAGE TITLE & INSTRUCTIONS */}
          <View className="px-4 pt-4 pb-2">
            <Text className="text-[#F4F6F7] text-xl font-black uppercase tracking-tight">
              Open Player Slots
            </Text>
            <Text className="text-[#A0A5AD] text-xs leading-4 mt-0.5">
              Configure a recreational match and list open slots for players.
            </Text>
          </View>

          {/* ================================================================= */}
          {/* STEP 1: SPORT SELECTION */}
          {/* ================================================================= */}
          <View className="px-4 mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold">
                1. Select Sport
              </Text>
              <Text className="text-[#E85D26] text-[10px] font-mono uppercase font-bold">
                {activeSportConfig.label}
              </Text>
            </View>

            <View className="flex-row space-x-2">
              {(['football', 'cricket', 'padel', 'badminton'] as Sport[]).map((s) => {
                const conf = SPORTS_CONFIG[s];
                const isSelected = sport === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => handleSelectSport(s)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${conf.label}`}
                    className={`flex-1 py-3 px-1 items-center rounded-xl border ${
                      isSelected
                        ? 'bg-[#E85D26] border-[#E85D26] shadow-sm'
                        : 'bg-[#1F2327] border-white/10 active:bg-[#272C31]'
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={conf.icon}
                      size={22}
                      color={isSelected ? '#171A1D' : '#A0A5AD'}
                    />
                    <Text
                      className={`text-[11px] font-bold uppercase tracking-wider mt-1.5 ${
                        isSelected ? 'text-[#171A1D]' : 'text-[#A0A5AD]'
                      }`}
                    >
                      {conf.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ================================================================= */}
          {/* STEP 2: FIXTURE TITLE & FORMAT */}
          {/* ================================================================= */}
          <View className="px-4 mt-6">
            <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold mb-2">
              2. Match Title & Format
            </Text>

            {/* Title Input */}
            <View className="bg-[#1F2327] p-4 rounded-2xl border border-white/10 mb-3">
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase mb-2 font-bold">
                Match Listing Title
              </Text>
              <TextInput
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (formErrors.title) {
                    setFormErrors((prev) => ({ ...prev, title: '' }));
                  }
                }}
                placeholder="e.g. Model Town 7v7 Floodlit Friendly"
                placeholderTextColor="#7F8993"
                className="text-[#F4F6F7] text-sm font-bold bg-[#272C31] p-3 rounded-xl border border-white/10"
              />
              {formErrors.title ? (
                <Text className="text-[#F4A261] text-xs font-medium mt-1">
                  {formErrors.title}
                </Text>
              ) : null}
            </View>

            {/* Format Selector */}
            <View className="bg-[#1F2327] p-4 rounded-2xl border border-white/10">
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase mb-2 font-bold">
                Sport Format Presets
              </Text>
              <View className="flex-row flex-wrap">
                {activeSportConfig.formats.map((fmt) => {
                  const isSelected = format === fmt;
                  return (
                    <Pressable
                      key={fmt}
                      onPress={() => setFormat(fmt)}
                      className={`mr-2 mb-2 px-3 py-1.5 rounded-xl border ${
                        isSelected
                          ? 'bg-[#E85D26] border-[#E85D26]'
                          : 'bg-[#272C31] border-white/10 active:bg-white/5'
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          isSelected ? 'text-[#171A1D] font-bold' : 'text-[#A0A5AD]'
                        }`}
                      >
                        {fmt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ================================================================= */}
          {/* STEP 3: SCHEDULE & TIMING */}
          {/* ================================================================= */}
          <View className="px-4 mt-6">
            <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold mb-2">
              3. Schedule & Duration
            </Text>

            <View className="bg-[#1F2327] p-4 rounded-2xl border border-white/10 space-y-3">
              {/* Date Selector */}
              <View>
                <Text className="text-[#7F8993] text-[10px] font-mono uppercase mb-2 font-bold">
                  Match Date
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {DATE_PRESETS.map((d) => {
                    const isSelected = date === d;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => setDate(d)}
                        className={`mr-2 px-3.5 py-2 rounded-xl border ${
                          isSelected
                            ? 'bg-[#E85D26] border-[#E85D26]'
                            : 'bg-[#272C31] border-white/10'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold uppercase tracking-wider ${
                            isSelected ? 'text-[#171A1D]' : 'text-[#A0A5AD]'
                          }`}
                        >
                          {d}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Time Window Selector */}
              <View className="pt-3 border-t border-white/5">
                <Text className="text-[#7F8993] text-[10px] font-mono uppercase mb-2 font-bold">
                  Time Window
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {TIME_PRESETS.map((t) => {
                    const isSelected = time === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => setTime(t)}
                        className={`mr-2 px-3.5 py-2 rounded-xl border ${
                          isSelected
                            ? 'bg-[#E85D26] border-[#E85D26]'
                            : 'bg-[#272C31] border-white/10'
                        }`}
                      >
                        <Text
                          className={`text-xs font-mono ${
                            isSelected ? 'text-[#171A1D] font-bold' : 'text-[#A0A5AD]'
                          }`}
                        >
                          {t}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Duration Selector */}
              <View className="pt-3 border-t border-white/5 flex-row items-center justify-between">
                <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold">
                  Estimated Duration
                </Text>
                <View className="flex-row space-x-1.5">
                  {['60 Mins', '90 Mins', '120 Mins'].map((dur) => {
                    const isSelected = duration === dur;
                    return (
                      <Pressable
                        key={dur}
                        onPress={() => setDuration(dur)}
                        className={`px-3 py-1.5 rounded-xl border ${
                          isSelected
                            ? 'bg-[#E85D26] border-[#E85D26]'
                            : 'bg-[#272C31] border-white/10'
                        }`}
                      >
                        <Text
                          className={`text-xs font-mono font-bold ${
                            isSelected ? 'text-[#171A1D]' : 'text-[#A0A5AD]'
                          }`}
                        >
                          {dur}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* ================================================================= */}
          {/* STEP 4: GROUND & LOCATION */}
          {/* ================================================================= */}
          <View className="px-4 mt-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold">
                4. Venue & Locality
              </Text>
              <Text className="text-[#7F8993] text-[10px] font-mono">
                Lahore Circuit
              </Text>
            </View>

            <View className="bg-[#1F2327] p-4 rounded-2xl border border-white/10 mb-2">
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase mb-2 font-bold">
                Ground / Venue Name
              </Text>
              <TextInput
                value={groundName}
                onChangeText={(text) => {
                  setGroundName(text);
                  if (formErrors.groundName) {
                    setFormErrors((prev) => ({ ...prev, groundName: '' }));
                  }
                }}
                placeholder="e.g. Model Town Football Turf, Pitch 1"
                placeholderTextColor="#7F8993"
                className="text-[#F4F6F7] text-sm font-bold bg-[#272C31] p-3 rounded-xl border border-white/10 mb-3"
              />
              {formErrors.groundName ? (
                <Text className="text-[#F4A261] text-xs font-medium mb-2">
                  {formErrors.groundName}
                </Text>
              ) : null}

              <Text className="text-[#7F8993] text-[10px] font-mono uppercase mb-2 font-bold">
                Area / Neighborhood
              </Text>
              <TextInput
                value={area}
                onChangeText={(text) => {
                  setArea(text);
                  if (formErrors.area) {
                    setFormErrors((prev) => ({ ...prev, area: '' }));
                  }
                }}
                placeholder="e.g. Model Town, Lahore"
                placeholderTextColor="#7F8993"
                className="text-[#F4F6F7] text-sm font-bold bg-[#272C31] p-3 rounded-xl border border-white/10"
              />
              {formErrors.area ? (
                <Text className="text-[#F4A261] text-xs font-medium mt-1">
                  {formErrors.area}
                </Text>
              ) : null}
            </View>

            {/* Quick Demo Venue Labels */}
            <Text className="text-[#7F8993] text-[10px] font-mono uppercase mb-2 px-0.5 font-bold">
              Venue Presets (Tap to Fill)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {VENUE_PRESETS.filter((v) => v.sport === sport).map((v) => (
                <Pressable
                  key={v.name}
                  onPress={() => handleSelectVenuePreset(v)}
                  className="mr-2 bg-[#272C31] px-3 py-2 rounded-xl border border-white/10 active:bg-white/5"
                >
                  <Text className="text-[#F4F6F7] text-xs font-bold">{v.name}</Text>
                  <Text className="text-[#7F8993] text-[10px]">{v.area}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* ================================================================= */}
          {/* STEP 5: SQUAD CAPACITY & OPEN SLOTS */}
          {/* ================================================================= */}
          <View className="px-4 mt-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold">
                5. Squad Slots & Vacancy
              </Text>
              <ArenaBadge
                label={`${slotsOpen} VACANCIES`}
                variant={slotsOpen === 1 ? 'rust' : 'olive'}
                size="sm"
              />
            </View>

            <View className="bg-[#1F2327] p-4 rounded-2xl border border-white/10">
              {/* Stepper Row: Total Slots */}
              <View className="flex-row items-center justify-between pb-3 border-b border-white/5">
                <View className="flex-1 pr-3">
                  <Text className="text-[#F4F6F7] text-xs font-black uppercase">
                    Total Squad Capacity
                  </Text>
                  <Text className="text-[#7F8993] text-[10px] mt-0.5">
                    Total players required for match fixture
                  </Text>
                </View>

                <View className="flex-row items-center space-x-2">
                  <Pressable
                    onPress={() => handleAdjustTotalSlots(-1)}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease total squad size"
                    className="w-9 h-9 rounded-xl bg-[#272C31] items-center justify-center border border-white/10 active:bg-white/5"
                  >
                    <Ionicons name="remove" size={16} color="#F4F6F7" />
                  </Pressable>

                  <View className="w-10 items-center">
                    <Text className="text-[#F4F6F7] text-base font-black font-mono">
                      {totalSlots}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleAdjustTotalSlots(1)}
                    accessibilityRole="button"
                    accessibilityLabel="Increase total squad size"
                    className="w-9 h-9 rounded-xl bg-[#272C31] items-center justify-center border border-white/10 active:bg-white/5"
                  >
                    <Ionicons name="add" size={16} color="#F4F6F7" />
                  </Pressable>
                </View>
              </View>

              {/* Stepper Row: Open Slots Wanted */}
              <View className="flex-row items-center justify-between pt-3">
                <View className="flex-1 pr-3">
                  <Text className="text-[#F4F6F7] text-xs font-black uppercase">
                    Open Player Slots Wanted
                  </Text>
                  <Text className="text-[#7F8993] text-[10px] mt-0.5">
                    Replacement players discoverable on board
                  </Text>
                </View>

                <View className="flex-row items-center space-x-2">
                  <Pressable
                    onPress={() => handleAdjustOpenSlots(-1)}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease open player slots"
                    className="w-9 h-9 rounded-xl bg-[#272C31] items-center justify-center border border-white/10 active:bg-white/5"
                  >
                    <Ionicons name="remove" size={16} color="#F4F6F7" />
                  </Pressable>

                  <View className="w-10 items-center">
                    <Text className="text-[#E85D26] text-base font-black font-mono">
                      {slotsOpen}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleAdjustOpenSlots(1)}
                    accessibilityRole="button"
                    accessibilityLabel="Increase open player slots"
                    className="w-9 h-9 rounded-xl bg-[#272C31] items-center justify-center border border-white/10 active:bg-white/5"
                  >
                    <Ionicons name="add" size={16} color="#F4F6F7" />
                  </Pressable>
                </View>
              </View>

              {formErrors.slotsOpen ? (
                <Text className="text-[#F4A261] text-xs font-medium mt-2">
                  {formErrors.slotsOpen}
                </Text>
              ) : null}

              {/* Visual Breakdown Strip */}
              <View className="mt-4 pt-3 border-t border-white/5">
                <View className="flex-row justify-between text-[11px] font-mono mb-2">
                  <Text className="text-[#A0A5AD] text-xs">
                    Roster Status ({reservedCount} filled + {slotsOpen} open)
                  </Text>
                  <Text className="text-[#E85D26] text-xs font-bold">
                    {Math.round((reservedCount / totalSlots) * 100)}% Ready
                  </Text>
                </View>

                {/* Progress Bar */}
                <View className="h-2 w-full bg-[#272C31] rounded-full overflow-hidden flex-row">
                  <View
                    style={{ width: `${(reservedCount / totalSlots) * 100}%` }}
                    className="h-full bg-[#7FD1AE]"
                  />
                  <View
                    style={{ width: `${(slotsOpen / totalSlots) * 100}%` }}
                    className="h-full bg-[#E85D26]"
                  />
                </View>

                <View className="flex-row items-center justify-between mt-2.5">
                  <View className="flex-row items-center">
                    <View className="w-2.5 h-2.5 rounded-full bg-[#7FD1AE] mr-1.5" />
                    <Text className="text-[#A0A5AD] text-xs">
                      {reservedCount} Reserved
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-2.5 h-2.5 rounded-full bg-[#E85D26] mr-1.5" />
                    <Text className="text-[#E85D26] text-xs font-bold">
                      {slotsOpen} Open for Discovery
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ================================================================= */}
          {/* STEP 6: SKILL TIER */}
          {/* ================================================================= */}
          <View className="px-4 mt-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold">
                6. Skill Tier Specification
              </Text>
              <ArenaBadge
                label={activeSkillConfig.badge}
                variant={activeSkillConfig.variant}
                size="sm"
              />
            </View>

            <View className="flex-row space-x-2">
              {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((lvl) => {
                const conf = SKILL_METAS[lvl];
                const isSelected = skillLevel === lvl;
                return (
                  <Pressable
                    key={lvl}
                    onPress={() => setSkillLevel(lvl)}
                    className={`flex-1 p-3.5 rounded-2xl border ${
                      isSelected
                        ? 'bg-[#272C31] border-[#E85D26] shadow-sm'
                        : 'bg-[#1F2327] border-white/10 active:bg-[#272C31]'
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <Text
                        className={`text-xs font-black uppercase ${
                          isSelected ? 'text-[#E85D26]' : 'text-[#F4F6F7]'
                        }`}
                      >
                        {conf.label}
                      </Text>
                    </View>
                    <Text className="text-[#7F8993] text-[10px] leading-3 mt-0.5">
                      {conf.subtitle}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ================================================================= */}
          {/* STEP 7: RECREATIONAL SPLIT & NOTES */}
          {/* ================================================================= */}
          <View className="px-4 mt-6">
            <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold mb-2">
              7. Split & Details
            </Text>

            <View className="bg-[#1F2327] p-4 rounded-2xl border border-white/10 space-y-3">
              {/* Fee per player */}
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold">
                    Pitch Fee Per Player
                  </Text>
                  <Text className="text-[#7F8993] text-[9px] font-mono">
                    On-Site Split Only
                  </Text>
                </View>
                <TextInput
                  value={feePerPlayer}
                  onChangeText={setFeePerPlayer}
                  placeholder="e.g. Rs. 450 or Free"
                  placeholderTextColor="#7F8993"
                  className="text-[#F4F6F7] text-sm font-bold bg-[#272C31] p-3 rounded-xl border border-white/10 mb-1"
                />
                <Text className="text-[#7F8993] text-[10px] leading-3.5">
                  Recreational venue cost sharing. Collected directly at ground — no in-app billing.
                </Text>
              </View>

              {/* Match Description */}
              <View className="pt-3 border-t border-white/5">
                <Text className="text-[#7F8993] text-[10px] font-mono uppercase mb-1.5 font-bold">
                  Match Description & Requirements
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={2}
                  placeholder="Notes about footwear, bibs, squad expectations..."
                  placeholderTextColor="#7F8993"
                  className="text-[#F4F6F7] text-xs leading-4 bg-[#272C31] p-3 rounded-xl border border-white/10 min-h-[50px]"
                />
              </View>

              {/* Venue / Parking Notes */}
              <View className="pt-3 border-t border-white/5">
                <Text className="text-[#7F8993] text-[10px] font-mono uppercase mb-1.5 font-bold">
                  Venue Arrival Notes
                </Text>
                <TextInput
                  value={venueNotes}
                  onChangeText={setVenueNotes}
                  placeholder="e.g. Meet by pitch 1 entrance; changing rooms on left"
                  placeholderTextColor="#7F8993"
                  className="text-[#F4F6F7] text-xs leading-4 bg-[#272C31] p-3 rounded-xl border border-white/10"
                />
              </View>
            </View>
          </View>

          {/* ================================================================= */}
          {/* WEATHER OUTLOOK ADVISORY */}
          {/* ================================================================= */}
          <View className="px-4 mt-6">
            <WeatherOutlookCard
              weather={weather}
              loading={weatherLoading}
              timeContext={`${date} • ${time}`}
              sport={sport}
            />
          </View>

          {/* ================================================================= */}
          {/* CTA BAR */}
          {/* ================================================================= */}
          <View className="px-4 mt-6">
            {formErrors.submit ? (
              <View className="mb-3 p-3 bg-[#F4A261]/10 border border-[#F4A261]/30 rounded-xl">
                <Text className="text-[#F4A261] text-xs font-bold uppercase tracking-wider mb-0.5">
                  Fixture Creation Failed
                </Text>
                <Text className="text-[#F4F6F7] text-xs leading-4">
                  {formErrors.submit}
                </Text>
                <Text className="text-[#A0A5AD] text-[10px] mt-1">
                  Your form values are preserved — review and retry.
                </Text>
              </View>
            ) : null}

            <PrimaryButton
              title={isSubmitting ? 'SCHEDULING FIXTURE...' : 'CREATE MATCH FIXTURE'}
              variant="primary"
              disabled={isSubmitting}
              loading={isSubmitting}
              onPress={handlePublishMatch}
            />

            <Text className="text-[#7F8993] text-xs text-center mt-2.5">
              Configured fixture validates squad requirements and slots according to Maidaan standards.
            </Text>
          </View>
        </ScrollView>

        {/* ================================================================= */}
        {/* SUCCESS MODAL */}
        {/* ================================================================= */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowSuccessModal(false);
            handleResetForm();
          }}
        >
          <View className="flex-1 bg-[#171A1D]/85 items-center justify-center p-5">
            <View className="w-full max-w-sm bg-[#1F2327] rounded-2xl p-6 border border-white/10 shadow-2xl">
              <View className="w-12 h-12 rounded-xl bg-[#E85D26] items-center justify-center mb-3">
                <Ionicons name="checkmark-sharp" size={26} color="#171A1D" />
              </View>

              <ArenaBadge label="MATCH SCHEDULED" variant="olive" size="sm" />

              <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight mt-2">
                Fixture Created
              </Text>

              <Text className="text-[#A0A5AD] text-xs leading-4 mt-1">
                Your match is now open for player discovery on the Maidaan board.
              </Text>

              {/* Fixture Summary Card */}
              {createdFixture ? (
                <View className="my-4 p-3.5 bg-[#272C31] rounded-xl border border-white/10">
                  <Text className="text-[#F4F6F7] text-xs font-black uppercase" numberOfLines={1}>
                    {createdFixture.title}
                  </Text>

                  <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <Text className="text-[#A0A5AD] text-xs font-mono">
                      {createdFixture.date} • {createdFixture.time}
                    </Text>
                    <ArenaBadge
                      label={`${createdFixture.slotsOpen} OPEN`}
                      variant={createdFixture.slotsOpen === 1 ? 'rust' : 'olive'}
                      size="sm"
                    />
                  </View>

                  <Text
                    className="text-[#7F8993] text-xs mt-1"
                    numberOfLines={1}
                  >
                    {createdFixture.groundName}
                  </Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View className="space-y-2 mt-2">
                <PrimaryButton
                  title="VIEW MATCH DETAILS"
                  variant="primary"
                  onPress={() => {
                    const matchId = createdFixture?.id;
                    setShowSuccessModal(false);
                    handleResetForm();
                    if (matchId) {
                      router.push(`/match/${matchId}`);
                    }
                  }}
                />

                <PrimaryButton
                  title="RETURN TO CAPTAIN DESK"
                  variant="outline"
                  onPress={() => {
                    setShowSuccessModal(false);
                    handleResetForm();
                    router.replace('/captain/dashboard');
                  }}
                />

                <Pressable
                  onPress={() => {
                    setShowSuccessModal(false);
                    handleResetForm();
                  }}
                  className="py-3 items-center bg-[#272C31] rounded-xl border border-white/10 active:bg-white/5 mt-1"
                >
                  <Text className="text-[#F4F6F7] text-xs font-bold uppercase tracking-wider">
                    Create Another
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
