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

// Skill tier metadata conforming to Concrete Arena system
const SKILL_METAS: Record<
  SkillLevel,
  { label: string; badge: string; subtitle: string; variant: 'stone' | 'olive' | 'rust' }
> = {
  beginner: {
    label: 'Beginner',
    badge: 'DIV 03',
    subtitle: 'Grassroots Casual',
    variant: 'stone',
  },
  intermediate: {
    label: 'Intermediate',
    badge: 'DIV 02',
    subtitle: 'Club Regular',
    variant: 'olive',
  },
  advanced: {
    label: 'Advanced',
    badge: 'DIV 01',
    subtitle: 'Premier Circuit',
    variant: 'rust',
  },
};

// Deterministic demo venue labels with schematic canvas positions for quick selection.
// mapPosition represents presentation-only schematic canvas placement (0-100 percentage values).
// Not latitude/longitude, not GPS, and not suitable for physical navigation.
// No booking relationship or live venue inventory is implied.
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
  const displayCaptainName = captainName || 'CAPTAIN NAME NOT SET';
  const displayTeamName = captainTeamName || 'TEAM NAME NOT SET';

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
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
        <ArenaHeader
          title="MAIDAAN"
          subtitle="MATCH CREATION // ROLE RESTRICTION"
          showBack
          onBack={() => router.replace('/(tabs)/discover')}
        />
        <View className="flex-1 items-center justify-center p-6 bg-warm-white">
          <View className="w-16 h-16 rounded-full bg-rust/10 items-center justify-center border border-rust/30 mb-5">
            <Ionicons name="lock-closed" size={28} color="#875646" />
          </View>

          <ArenaBadge label="CAPTAIN ACCOUNT REQUIRED" variant="rust" size="md" />

          <Text className="text-graphite text-lg font-black uppercase tracking-tight text-center mt-3">
            CAPTAIN PRIVILEGES REQUIRED
          </Text>

          <Text className="text-stone-muted text-sm text-center mt-2 max-w-[310px] leading-5">
            Only Team Captain accounts can schedule matches and open player slots on the Maidaan
            matchmaking board.
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
      // Resolve schematic canvas position from demo presets or neutral center.
      const matchingPreset = VENUE_PRESETS.find(
        (v) => v.name.toLowerCase() === groundName.trim().toLowerCase()
      );
      const resolvedCoordinates = matchingPreset
        ? matchingPreset.mapPosition
        : { x: 50, y: 50 };

      // Parse numerical contribution if entered
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
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Concrete Arena Header */}
        <ArenaHeader
          title="MAIDAAN"
          subtitle="CAPTAIN DESK // CREATE MATCH"
          showBack
          onBack={() => router.back()}
          rightAction={
            <ArenaBadge label="SCREEN 17" variant="stone" size="sm" />
          }
        />

        <ScrollView
          className="flex-1 bg-warm-white"
          contentContainerStyle={{ paddingBottom: 64 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* TOP BANNER: CAPTAIN CREDENTIAL CONTEXT */}
          <View className="px-4 py-3 bg-stone/20 border-b border-stone flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-2">
              <View className="w-2.5 h-2.5 rounded-full bg-arena-olive mr-2" />
              <View>
                <Text className="text-graphite text-xs font-black uppercase tracking-tight">
                  {displayTeamName}
                </Text>
                <Text className="text-stone-muted text-[10px] font-mono">
                  ORGANIZER: {displayCaptainName} {captainUserId ? `• ${captainUserId}` : ''}
                </Text>
              </View>
            </View>
            <ArenaBadge label="TEAM CAPTAIN" variant="olive" size="sm" />
          </View>

          {/* MISSING CAPTAIN ID ERROR BANNER */}
          {formErrors.auth ? (
            <View className="mx-4 mt-3 p-3 bg-rust/10 border border-rust/40 rounded-sm">
              <Text className="text-rust text-xs font-bold uppercase tracking-wider">
                CAPTAIN IDENTITY UNAVAILABLE
              </Text>
              <Text className="text-graphite text-xs mt-1">
                {formErrors.auth}
              </Text>
            </View>
          ) : null}

          {/* PAGE TITLE & INSTRUCTIONS */}
          <View className="px-4 pt-4 pb-2">
            <Text className="text-graphite text-xl font-black uppercase tracking-tight">
              OPEN PLAYER SLOTS
            </Text>
            <Text className="text-stone-muted text-xs leading-4 mt-0.5">
              Configure a recreational match and list open slots for players.
            </Text>
          </View>

          {/* ================================================================= */}
          {/* STEP 1: SPORT SELECTION */}
          {/* ================================================================= */}
          <View className="px-4 mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold">
                1. SELECT SPORT
              </Text>
              <Text className="text-stone-muted text-[10px] font-mono">
                {activeSportConfig.label.toUpperCase()} SELECTED
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
                    className={`flex-1 py-3 px-1 items-center rounded-sm border ${
                      isSelected
                        ? 'bg-graphite border-graphite shadow-2xs'
                        : 'bg-white border-stone active:bg-stone/10'
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={conf.icon}
                      size={22}
                      color={isSelected ? '#F4F1EA' : '#3D4438'}
                    />
                    <Text
                      className={`text-[11px] font-bold uppercase tracking-wider mt-1.5 ${
                        isSelected ? 'text-warm-white' : 'text-graphite'
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
            <Text className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold mb-2">
              2. MATCH TITLE & FORMAT
            </Text>

            {/* Title Input */}
            <View className="bg-white p-3.5 rounded-sm border border-stone mb-3">
              <Text className="text-stone-muted text-[10px] font-mono uppercase mb-1 font-bold">
                MATCH LISTING TITLE
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
                placeholderTextColor="#A0A59A"
                className="text-graphite text-sm font-bold p-0"
              />
              {formErrors.title ? (
                <Text className="text-rust text-[10px] font-bold mt-1">
                  {formErrors.title}
                </Text>
              ) : null}
            </View>

            {/* Format Selector */}
            <View className="bg-white p-3.5 rounded-sm border border-stone">
              <Text className="text-stone-muted text-[10px] font-mono uppercase mb-2 font-bold">
                SPORT FORMAT PRESETS
              </Text>
              <View className="flex-row flex-wrap">
                {activeSportConfig.formats.map((fmt) => {
                  const isSelected = format === fmt;
                  return (
                    <Pressable
                      key={fmt}
                      onPress={() => setFormat(fmt)}
                      className={`mr-2 mb-2 px-2.5 py-1.5 rounded-xs border ${
                        isSelected
                          ? 'bg-arena-olive border-arena-olive'
                          : 'bg-warm-white border-stone active:bg-stone/20'
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-medium ${
                          isSelected ? 'text-warm-white font-bold' : 'text-graphite'
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
            <Text className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold mb-2">
              3. SCHEDULE & DURATION
            </Text>

            <View className="bg-white p-3.5 rounded-sm border border-stone space-y-3">
              {/* Date Selector */}
              <View>
                <Text className="text-stone-muted text-[10px] font-mono uppercase mb-2 font-bold">
                  MATCH DATE
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {DATE_PRESETS.map((d) => {
                    const isSelected = date === d;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => setDate(d)}
                        className={`mr-2 px-3 py-1.5 rounded-xs border ${
                          isSelected
                            ? 'bg-graphite border-graphite'
                            : 'bg-warm-white border-stone'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold uppercase tracking-wider ${
                            isSelected ? 'text-warm-white' : 'text-graphite'
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
              <View className="pt-2 border-t border-stone/30">
                <Text className="text-stone-muted text-[10px] font-mono uppercase mb-2 font-bold">
                  TIME WINDOW
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {TIME_PRESETS.map((t) => {
                    const isSelected = time === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => setTime(t)}
                        className={`mr-2 px-3 py-1.5 rounded-xs border ${
                          isSelected
                            ? 'bg-arena-olive border-arena-olive'
                            : 'bg-warm-white border-stone'
                        }`}
                      >
                        <Text
                          className={`text-xs font-mono font-medium ${
                            isSelected ? 'text-warm-white font-bold' : 'text-graphite'
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
              <View className="pt-2 border-t border-stone/30 flex-row items-center justify-between">
                <Text className="text-stone-muted text-[10px] font-mono uppercase font-bold">
                  ESTIMATED DURATION
                </Text>
                <View className="flex-row space-x-1.5">
                  {['60 Mins', '90 Mins', '120 Mins'].map((dur) => {
                    const isSelected = duration === dur;
                    return (
                      <Pressable
                        key={dur}
                        onPress={() => setDuration(dur)}
                        className={`px-2.5 py-1 rounded-xs border ${
                          isSelected
                            ? 'bg-graphite border-graphite'
                            : 'bg-warm-white border-stone'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-mono font-bold ${
                            isSelected ? 'text-warm-white' : 'text-graphite'
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
              <Text className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold">
                4. VENUE & LOCALITY
              </Text>
              <Text className="text-stone-muted text-[10px] font-mono">
                LAHORE CIRCUIT
              </Text>
            </View>

            <View className="bg-white p-3.5 rounded-sm border border-stone mb-2">
              <Text className="text-stone-muted text-[10px] font-mono uppercase mb-1 font-bold">
                GROUND / VENUE NAME
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
                placeholderTextColor="#A0A59A"
                className="text-graphite text-sm font-bold p-0 mb-3"
              />
              {formErrors.groundName ? (
                <Text className="text-rust text-[10px] font-bold mb-2">
                  {formErrors.groundName}
                </Text>
              ) : null}

              <Text className="text-stone-muted text-[10px] font-mono uppercase mb-1 font-bold">
                AREA / NEIGHBORHOOD
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
                placeholderTextColor="#A0A59A"
                className="text-graphite text-sm font-bold p-0"
              />
              {formErrors.area ? (
                <Text className="text-rust text-[10px] font-bold mt-1">
                  {formErrors.area}
                </Text>
              ) : null}
            </View>

            {/* Quick Demo Venue Labels */}
            <Text className="text-stone-muted text-[10px] font-mono uppercase mb-1.5 px-0.5 font-bold">
              DEMO VENUE PRESETS (TAP TO FILL)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {VENUE_PRESETS.filter((v) => v.sport === sport).map((v) => (
                <Pressable
                  key={v.name}
                  onPress={() => handleSelectVenuePreset(v)}
                  className="mr-2 bg-stone/20 px-2.5 py-1.5 rounded-xs border border-stone active:bg-stone/40"
                >
                  <Text className="text-graphite text-[10px] font-bold">{v.name}</Text>
                  <Text className="text-stone-muted text-[9px]">{v.area}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* ================================================================= */}
          {/* STEP 5: SQUAD CAPACITY & OPEN SLOTS */}
          {/* ================================================================= */}
          <View className="px-4 mt-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold">
                5. SQUAD SLOTS & VACANCY
              </Text>
              <ArenaBadge
                label={`${slotsOpen} VACANCIES`}
                variant={slotsOpen === 1 ? 'rust' : 'olive'}
                size="sm"
              />
            </View>

            <View className="bg-white p-4 rounded-sm border border-stone">
              {/* Stepper Row: Total Slots */}
              <View className="flex-row items-center justify-between pb-3 border-b border-stone/30">
                <View className="flex-1 pr-3">
                  <Text className="text-graphite text-xs font-black uppercase">
                    TOTAL SQUAD CAPACITY
                  </Text>
                  <Text className="text-stone-muted text-[10px]">
                    Total players required for match fixture (both sides or full roster)
                  </Text>
                </View>

                <View className="flex-row items-center space-x-2">
                  <Pressable
                    onPress={() => handleAdjustTotalSlots(-1)}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease total squad size"
                    className="w-8 h-8 rounded-xs bg-stone/20 items-center justify-center border border-stone active:bg-stone/40"
                  >
                    <Ionicons name="remove" size={16} color="#242522" />
                  </Pressable>

                  <View className="w-10 items-center">
                    <Text className="text-graphite text-base font-black font-mono">
                      {totalSlots}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleAdjustTotalSlots(1)}
                    accessibilityRole="button"
                    accessibilityLabel="Increase total squad size"
                    className="w-8 h-8 rounded-xs bg-stone/20 items-center justify-center border border-stone active:bg-stone/40"
                  >
                    <Ionicons name="add" size={16} color="#242522" />
                  </Pressable>
                </View>
              </View>

              {/* Stepper Row: Open Slots Wanted */}
              <View className="flex-row items-center justify-between pt-3">
                <View className="flex-1 pr-3">
                  <Text className="text-graphite text-xs font-black uppercase">
                    OPEN PLAYER SLOTS WANTED
                  </Text>
                  <Text className="text-stone-muted text-[10px]">
                    Replacement players discoverable on Maidaan board
                  </Text>
                </View>

                <View className="flex-row items-center space-x-2">
                  <Pressable
                    onPress={() => handleAdjustOpenSlots(-1)}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease open player slots"
                    className="w-8 h-8 rounded-xs bg-stone/20 items-center justify-center border border-stone active:bg-stone/40"
                  >
                    <Ionicons name="remove" size={16} color="#242522" />
                  </Pressable>

                  <View className="w-10 items-center">
                    <Text className="text-rust text-base font-black font-mono">
                      {slotsOpen}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleAdjustOpenSlots(1)}
                    accessibilityRole="button"
                    accessibilityLabel="Increase open player slots"
                    className="w-8 h-8 rounded-xs bg-stone/20 items-center justify-center border border-stone active:bg-stone/40"
                  >
                    <Ionicons name="add" size={16} color="#242522" />
                  </Pressable>
                </View>
              </View>

              {formErrors.slotsOpen ? (
                <Text className="text-rust text-[10px] font-bold mt-2">
                  {formErrors.slotsOpen}
                </Text>
              ) : null}

              {/* Visual Breakdown Strip */}
              <View className="mt-4 pt-3 border-t border-stone/30">
                <View className="flex-row justify-between text-[11px] font-mono mb-1.5">
                  <Text className="text-stone-muted text-[10px]">
                    ROSTER STATUS ({reservedCount} FILLED + {slotsOpen} OPEN = {totalSlots})
                  </Text>
                  <Text className="text-arena-olive text-[10px] font-bold">
                    {Math.round((reservedCount / totalSlots) * 100)}% SQUAD READY
                  </Text>
                </View>

                {/* Progress Bar */}
                <View className="h-2 w-full bg-stone/30 rounded-xs overflow-hidden flex-row">
                  <View
                    style={{ width: `${(reservedCount / totalSlots) * 100}%` }}
                    className="h-full bg-graphite"
                  />
                  <View
                    style={{ width: `${(slotsOpen / totalSlots) * 100}%` }}
                    className="h-full bg-rust"
                  />
                </View>

                <View className="flex-row items-center justify-between mt-2">
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-xs bg-graphite mr-1" />
                    <Text className="text-stone-muted text-[10px]">
                      {reservedCount} Reserved / Existing
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-xs bg-rust mr-1" />
                    <Text className="text-rust text-[10px] font-bold">
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
              <Text className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold">
                6. SKILL TIER SPECIFICATION
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
                    className={`flex-1 p-3 rounded-sm border ${
                      isSelected
                        ? 'bg-white border-arena-olive shadow-2xs'
                        : 'bg-warm-white border-stone active:bg-stone/10'
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <Text
                        className={`text-xs font-black uppercase ${
                          isSelected ? 'text-arena-olive' : 'text-graphite'
                        }`}
                      >
                        {conf.label}
                      </Text>
                      <ArenaBadge label={conf.badge} variant={conf.variant} size="sm" />
                    </View>
                    <Text className="text-stone-muted text-[10px] leading-3">
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
            <Text className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold mb-2">
              7. RECREATIONAL SPLIT & DETAILS
            </Text>

            <View className="bg-white p-3.5 rounded-sm border border-stone space-y-3">
              {/* Fee per player */}
              <View>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-stone-muted text-[10px] font-mono uppercase font-bold">
                    PITCH FEE PER PLAYER
                  </Text>
                  <Text className="text-stone-muted text-[9px] font-mono">
                    ON-SITE SPLIT ONLY
                  </Text>
                </View>
                <TextInput
                  value={feePerPlayer}
                  onChangeText={setFeePerPlayer}
                  placeholder="e.g. Rs. 450 or Free"
                  placeholderTextColor="#A0A59A"
                  className="text-graphite text-sm font-bold p-0 mb-1"
                />
                <Text className="text-stone-muted text-[9px] leading-3">
                  Recreational venue cost sharing. Collected directly at ground — no in-app billing.
                </Text>
              </View>

              {/* Match Description */}
              <View className="pt-2 border-t border-stone/30">
                <Text className="text-stone-muted text-[10px] font-mono uppercase mb-1 font-bold">
                  MATCH DESCRIPTION & REQUIREMENTS
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={2}
                  placeholder="Notes about footwear, bibs, squad expectations..."
                  placeholderTextColor="#A0A59A"
                  className="text-graphite text-xs leading-4 p-0 min-h-[44px]"
                />
              </View>

              {/* Venue / Parking Notes */}
              <View className="pt-2 border-t border-stone/30">
                <Text className="text-stone-muted text-[10px] font-mono uppercase mb-1 font-bold">
                  VENUE ARRIVAL NOTES
                </Text>
                <TextInput
                  value={venueNotes}
                  onChangeText={setVenueNotes}
                  placeholder="e.g. Meet by pitch 1 entrance; changing rooms on left"
                  placeholderTextColor="#A0A59A"
                  className="text-graphite text-xs leading-4 p-0"
                />
              </View>
            </View>
          </View>

          {/* ================================================================= */}
          {/* CTA BAR */}
          {/* ================================================================= */}
          <View className="px-4 mt-8">
            {/* API submission error — keep form values, allow retry */}
            {formErrors.submit ? (
              <View className="mb-3 p-3 bg-rust/10 border border-rust/40 rounded-sm">
                <Text className="text-rust text-xs font-bold uppercase tracking-wider mb-0.5">
                  FIXTURE CREATION FAILED
                </Text>
                <Text className="text-graphite text-xs leading-4">
                  {formErrors.submit}
                </Text>
                <Text className="text-stone-muted text-[10px] mt-1">
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

            <Text className="text-stone-muted text-[10px] text-center mt-2.5">
              Configured fixture validates squad requirements and slots according to Maidaan standards.
            </Text>
          </View>
        </ScrollView>

        {/* ================================================================= */}
        {/* SUCCESS MODAL: FIXTURE PERSISTED VIA POST /api/matches */}
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
          <View className="flex-1 bg-graphite/80 items-center justify-center p-5">
            <View className="w-full max-w-sm bg-warm-white rounded-sm p-5 border border-stone shadow-xl">
              <View className="w-12 h-12 rounded-sm bg-arena-olive items-center justify-center border border-warm-white/20 mb-3">
                <Ionicons name="checkmark-sharp" size={26} color="#F4F1EA" />
              </View>

              <ArenaBadge label="FIXTURE CREATED" variant="olive" size="sm" />

              <Text className="text-graphite text-lg font-black uppercase tracking-tight mt-2">
                FIXTURE CREATED
              </Text>

              <Text className="text-stone-muted text-xs leading-4 mt-1">
                Your match is now available in Maidaan.
              </Text>

              {/* Fixture Summary Card */}
              {createdFixture ? (
                <View className="my-4 p-3 bg-white rounded-sm border border-stone">
                  <Text className="text-graphite text-xs font-black uppercase" numberOfLines={1}>
                    {createdFixture.title}
                  </Text>

                  <View className="flex-row items-center justify-between mt-1 pt-1 border-t border-stone/30">
                    <Text className="text-stone-muted text-[10px] font-mono">
                      {createdFixture.date} • {createdFixture.time}
                    </Text>
                    <ArenaBadge
                      label={`${createdFixture.slotsOpen} OPEN`}
                      variant={createdFixture.slotsOpen === 1 ? 'rust' : 'olive'}
                      size="sm"
                    />
                  </View>

                  <Text
                    className="text-stone-muted text-[10px] mt-1"
                    numberOfLines={1}
                  >
                    {createdFixture.groundName}
                  </Text>
                </View>
              ) : null}

              {/* Action Buttons: View Match Details, Return to Captain Board, View in Discover */}
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
                  title="RETURN TO CAPTAIN BOARD"
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
                  className="py-2.5 items-center bg-stone/20 rounded-sm border border-stone active:bg-stone/40 mt-1"
                >
                  <Text className="text-graphite text-xs font-bold uppercase tracking-wider">
                    CREATE ANOTHER
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
