import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { IMAGES } from '../../constants/images';
import { Sport, CourtStatus, HubCourt } from '../../types';
import { hubCourtService } from '../../services/hubCourtService';
import { profileService } from '../../services/profileService';

const ALL_SUPPORTED_SPORTS: Sport[] = ['football', 'cricket', 'padel', 'badminton'];

const SPORT_META: Record<
  Sport,
  { label: string; icon: 'soccer' | 'cricket' | 'tennis' | 'badminton' }
> = {
  football: { label: 'Football', icon: 'soccer' },
  cricket: { label: 'Cricket', icon: 'cricket' },
  padel: { label: 'Padel', icon: 'tennis' },
  badminton: { label: 'Badminton', icon: 'badminton' },
};

const STATUS_CONFIG: Record<
  CourtStatus,
  { label: string; badgeVariant: 'olive' | 'rust' | 'stone'; hint: string }
> = {
  AVAILABLE: {
    label: 'AVAILABLE',
    badgeVariant: 'olive',
    hint: 'Playing space active and open for recreational fixtures',
  },
  LIMITED: {
    label: 'LIMITED',
    badgeVariant: 'rust',
    hint: 'Restricted hours or scheduled maintenance in progress',
  },
  UNAVAILABLE: {
    label: 'UNAVAILABLE',
    badgeVariant: 'stone',
    hint: 'Court temporarily offline or reserved for repairs',
  },
};

export default function HubCourtsScreen() {
  const { currentUser, selectedRole, hubOwnerProfile, setHubOwnerProfile } = useAuthStore();

  // Role resolution
  const effectiveRole = currentUser?.role || selectedRole || 'PLAYER';
  const isHubOwner = effectiveRole === 'HUB_OWNER';

  // Primary API Data State
  const [courts, setCourts] = useState<HubCourt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Sport filter state
  const [selectedSportFilter, setSelectedSportFilter] = useState<'all' | Sport>('all');

  // Modals state
  const [editModalCourt, setEditModalCourt] = useState<HubCourt | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [newCourtName, setNewCourtName] = useState<string>('');
  const [newCourtSport, setNewCourtSport] = useState<Sport>('cricket');
  const [newCourtStatus, setNewCourtStatus] = useState<CourtStatus>('AVAILABLE');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteConfirmCourt, setDeleteConfirmCourt] = useState<HubCourt | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const isMountedRef = React.useRef(true);

  // Fetch real courts from backend
  const loadCourts = async () => {
    try {
      if (isMountedRef.current) {
        setLoading(true);
        setFetchError(null);
      }
      const data = await hubCourtService.getCourts();
      if (isMountedRef.current) {
        setCourts(data);
      }

      try {
        const myProfile = await profileService.getMyProfile();
        if (isMountedRef.current && myProfile?.hubOwnerProfile) {
          setHubOwnerProfile(myProfile.hubOwnerProfile);
        }
      } catch {
        // Safe ignore
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn('[HubCourts] Failed to load courts:', err);
        setFetchError(err?.message || 'Failed to load playing spaces. Please check your connection.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      if (isHubOwner && hubOwnerProfile) {
        loadCourts();
      }
      return () => {
        isMountedRef.current = false;
      };
    }, [isHubOwner, Boolean(hubOwnerProfile)])
  );

  // Handle Create Court
  const handleCreateCourt = async () => {
    const trimmed = newCourtName.trim();
    if (!trimmed) {
      setCreateError('Court name is required.');
      return;
    }
    if (trimmed.length > 80) {
      setCreateError('Court name must not exceed 80 characters.');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);

      await hubCourtService.createCourt({
        name: trimmed,
        sport: newCourtSport,
        status: newCourtStatus,
      });

      setNewCourtName('');
      setIsAddModalVisible(false);
      await loadCourts();
    } catch (err: any) {
      console.warn('[HubCourts] Create court failed:', err);
      if (err?.status === 409 || err?.message?.includes('already exists')) {
        setCreateError(`A court with the name "${trimmed}" already exists.`);
      } else {
        setCreateError(err?.message || 'Failed to register court. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Update Status
  const handleUpdateStatus = async (newStatus: CourtStatus) => {
    if (!editModalCourt || isUpdatingStatus) return;

    try {
      setIsUpdatingStatus(true);
      setUpdateError(null);

      const updated = await hubCourtService.updateCourt(editModalCourt.id, {
        status: newStatus,
      });

      setCourts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditModalCourt(null);
    } catch (err: any) {
      console.warn('[HubCourts] Update status failed:', err);
      setUpdateError(err?.message || 'Failed to update court status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Delete Court
  const handleDeleteCourt = async () => {
    if (!deleteConfirmCourt || isDeleting) return;

    try {
      setIsDeleting(true);
      await hubCourtService.deleteCourt(deleteConfirmCourt.id);

      setCourts((prev) => prev.filter((c) => c.id !== deleteConfirmCourt.id));
      setDeleteConfirmCourt(null);
      setEditModalCourt(null);

      try {
        const myProfile = await profileService.getMyProfile();
        if (myProfile?.hubOwnerProfile) {
          setHubOwnerProfile(myProfile.hubOwnerProfile);
        }
      } catch {
        // Safe ignore
      }
    } catch (err: any) {
      console.warn('[HubCourts] Delete court failed:', err);
      alert(err?.message || 'Failed to delete court. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // =========================================================================
  // 1. ROLE GUARD: NON-HUB_OWNER USER ACCESS
  // =========================================================================
  if (!isHubOwner) {
    return (
      <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top']}>
        <ArenaHeader
          title="Hub Courts"
          subtitle="Role Restriction"
          showBack
          onBack={() => router.replace('/(tabs)/discover')}
        />
        <View className="flex-1 items-center justify-center p-6 bg-[#171A1D]">
          <View className="w-16 h-16 rounded-full bg-[#F4A261]/10 items-center justify-center border border-[#F4A261]/30 mb-5">
            <Ionicons name="lock-closed" size={28} color="#F4A261" />
          </View>

          <ArenaBadge label="HUB OWNER REQUIRED" variant="rust" size="md" />

          <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight text-center mt-3">
            Hub Owner Access Required
          </Text>

          <Text className="text-[#A0A5AD] text-sm text-center mt-2 max-w-[310px] leading-5">
            Playing space management and court allocation sheets are restricted to Hub Owner accounts.
          </Text>

          <View className="w-full mt-6 space-y-3">
            <PrimaryButton
              title="RETURN TO DISCOVER"
              variant="primary"
              onPress={() => router.replace('/(tabs)/discover')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // 2. MISSING HUB PROFILE: ONBOARDING REQUIRED
  // =========================================================================
  if (!hubOwnerProfile) {
    return (
      <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top']}>
        <ArenaHeader
          title="Hub Courts"
          subtitle="Setup Required"
          showBack
          onBack={() => router.replace('/(tabs)/discover')}
        />
        <View className="flex-1 items-center justify-center p-6 bg-[#171A1D]">
          <View className="w-16 h-16 rounded-full bg-[#272C31] border border-white/10 items-center justify-center mb-5">
            <Ionicons name="business-outline" size={30} color="#A0A5AD" />
          </View>

          <ArenaBadge label="HUB PROFILE REQUIRED" variant="stone" size="md" />

          <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight text-center mt-3">
            Hub Profile Not Set
          </Text>

          <Text className="text-[#A0A5AD] text-xs font-medium text-center mt-2.5 leading-5 max-w-[280px]">
            Complete your Hub setup before managing playing spaces and court allocation sheets.
          </Text>

          <View className="w-full mt-6 space-y-3">
            <PrimaryButton
              title="COMPLETE HUB SETUP"
              variant="primary"
              onPress={() => router.push('/onboarding/hub-setup')}
            />
            <PrimaryButton
              title="RETURN TO DISCOVER"
              variant="outline"
              onPress={() => router.replace('/(tabs)/discover')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // 3. HUB DATA DERIVATIONS
  // =========================================================================
  const hubName = hubOwnerProfile.hubName?.trim() || 'Sports Hub';
  const hubLocation = hubOwnerProfile.location?.trim() || 'Location Not Set';
  const isVerified = Boolean(hubOwnerProfile.isVerified);
  const declaredCourtsCount = hubOwnerProfile.courtsCount ?? courts.length;
  const configuredSports = hubOwnerProfile.sports ?? [];

  const availableCount = courts.filter((c) => c.status === 'AVAILABLE').length;
  const limitedCount = courts.filter((c) => c.status === 'LIMITED').length;

  const displayedCourts = useMemo(() => {
    if (selectedSportFilter === 'all') {
      return courts;
    }
    return courts.filter((c) => c.sport === selectedSportFilter);
  }, [courts, selectedSportFilter]);

  const availableFilterSports = useMemo(() => {
    const set = new Set<Sport>();
    configuredSports.forEach((s) => set.add(s));
    courts.forEach((c) => set.add(c.sport));
    return Array.from(set);
  }, [configuredSports, courts]);

  return (
    <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top']}>
      {/* Modern Athletic Header */}
      <ArenaHeader
        title="Hub Courts"
        subtitle="Playing Spaces & Allocation"
        showBack
        fallbackRoute="/hub/profile"
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/hub/profile');
          }
        }}
        rightAction={
          <Pressable
            onPress={() => {
              setCreateError(null);
              setIsAddModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Add court"
            className="px-3 py-1.5 rounded-xl bg-[#E85D26] active:opacity-90 flex-row items-center"
          >
            <Ionicons name="add" size={16} color="#171A1D" />
            <Text className="text-[#171A1D] text-xs font-bold uppercase ml-1">
              Add Court
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        {/* Athletic Facility Photography Banner */}
        <View className="px-4 pt-3">
          <View className="h-18 w-full rounded-2xl overflow-hidden border border-white/10 relative bg-[#1F2327]">
            <Image
              source={IMAGES.arenaGround}
              className="w-full h-full opacity-35"
              resizeMode="cover"
            />
            <View className="absolute inset-0 px-4 py-3 flex-row items-center justify-between bg-gradient-to-r from-[#171A1D]/80 to-transparent">
              <View className="flex-1 pr-2">
                <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-widest font-bold">
                  Facility Allocation
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-[#F4F6F7] text-base font-black uppercase tracking-tight"
                >
                  {hubName}
                </Text>
              </View>
              <ArenaBadge
                label={isVerified ? 'VERIFIED HUB' : 'VERIFICATION PENDING'}
                variant={isVerified ? 'olive' : 'stone'}
                size="sm"
              />
            </View>
          </View>
        </View>

        {/* Hub Context Strip */}
        <View className="px-4 mt-3">
          <View className="bg-[#1F2327] rounded-2xl p-4 border border-white/10 shadow-sm">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold tracking-wider">
                  Registered Hub Location
                </Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="location-sharp" size={14} color="#A0A5AD" />
                  <Text
                    numberOfLines={1}
                    className="text-[#F4F6F7] text-xs font-bold ml-1 flex-1"
                  >
                    {hubLocation}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => router.push('/hub/profile')}
                accessibilityRole="button"
                accessibilityLabel="View Hub Profile"
                className="bg-[#272C31] px-3 py-1.5 rounded-xl border border-white/10 active:bg-white/5 flex-row items-center"
              >
                <Text className="text-[#F4F6F7] text-xs font-bold mr-1">
                  Hub Profile
                </Text>
                <Ionicons name="chevron-forward" size={12} color="#A0A5AD" />
              </Pressable>
            </View>

            {/* Supported Sports Strip */}
            <View className="mt-3 pt-3 border-t border-white/5 flex-row items-center justify-between">
              <View className="flex-row items-center flex-wrap gap-1.5 flex-1 pr-2">
                {configuredSports.map((s) => (
                  <View
                    key={s}
                    className="flex-row items-center bg-[#272C31] px-2.5 py-1 rounded-lg border border-white/10"
                  >
                    <MaterialCommunityIcons
                      name={SPORT_META[s].icon}
                      size={12}
                      color="#E85D26"
                    />
                    <Text className="text-[#F4F6F7] text-[10px] font-bold ml-1">
                      {SPORT_META[s].label}
                    </Text>
                  </View>
                ))}
              </View>
              <Text className="text-[#7F8993] text-[10px] font-mono">
                {declaredCourtsCount} Declared
              </Text>
            </View>
          </View>
        </View>

        {/* Summary Strip */}
        <View className="px-4 mt-4">
          <Text
            accessibilityRole="header"
            className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider mb-2 font-bold"
          >
            Playing Spaces Overview
          </Text>

          <View className="flex-row gap-2">
            {/* Stat 1: Total Persisted Courts */}
            <View className="flex-1 bg-[#1F2327] rounded-2xl p-3.5 border border-white/10">
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-wider font-bold">
                COURTS
              </Text>
              <Text className="text-[#F4F6F7] text-2xl font-black tracking-tight mt-0.5">
                {courts.length}
              </Text>
              <Text className="text-[#A0A5AD] text-[10px] font-medium mt-0.5">
                Configured
              </Text>
            </View>

            {/* Stat 2: Available */}
            <View className="flex-1 bg-[#1F2327] rounded-2xl p-3.5 border border-white/10">
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-wider font-bold">
                AVAILABLE
              </Text>
              <Text className="text-[#E85D26] text-2xl font-black tracking-tight mt-0.5">
                {availableCount}
              </Text>
              <Text className="text-[#A0A5AD] text-[10px] font-medium mt-0.5">
                Active spaces
              </Text>
            </View>

            {/* Stat 3: Limited */}
            <View className="flex-1 bg-[#1F2327] rounded-2xl p-3.5 border border-white/10">
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-wider font-bold">
                LIMITED
              </Text>
              <Text className="text-[#F4A261] text-2xl font-black tracking-tight mt-0.5">
                {limitedCount}
              </Text>
              <Text className="text-[#A0A5AD] text-[10px] font-medium mt-0.5">
                Restricted
              </Text>
            </View>
          </View>
        </View>

        {/* Sport Filter Chips */}
        {availableFilterSports.length > 1 ? (
          <View className="px-4 mt-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              <Pressable
                onPress={() => setSelectedSportFilter('all')}
                accessibilityRole="button"
                accessibilityLabel="Filter All Courts"
                className={`mr-2 px-3.5 py-1.5 rounded-xl border ${
                  selectedSportFilter === 'all'
                    ? 'bg-[#E85D26] border-[#E85D26]'
                    : 'bg-[#1F2327] border-white/10'
                }`}
              >
                <Text
                  className={`text-xs uppercase font-bold ${
                    selectedSportFilter === 'all' ? 'text-[#171A1D]' : 'text-[#A0A5AD]'
                  }`}
                >
                  All ({courts.length})
                </Text>
              </Pressable>

              {availableFilterSports.map((s) => {
                const isSelected = selectedSportFilter === s;
                const count = courts.filter((c) => c.sport === s).length;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSelectedSportFilter(s)}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter ${SPORT_META[s].label} Courts`}
                    className={`mr-2 px-3.5 py-1.5 rounded-xl border flex-row items-center ${
                      isSelected
                        ? 'bg-[#E85D26] border-[#E85D26]'
                        : 'bg-[#1F2327] border-white/10'
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={SPORT_META[s].icon}
                      size={12}
                      color={isSelected ? '#171A1D' : '#A0A5AD'}
                    />
                    <Text
                      className={`text-xs uppercase font-bold ml-1.5 ${
                        isSelected ? 'text-[#171A1D]' : 'text-[#A0A5AD]'
                      }`}
                    >
                      {SPORT_META[s].label} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* COURT LISTING SECTION */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text
              accessibilityRole="header"
              className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold"
            >
              Courts & Allocation
            </Text>
            <Text className="text-[#7F8993] text-[10px] font-mono">
              {displayedCourts.length} of {courts.length} Listed
            </Text>
          </View>

          {/* ASYNC STATES */}
          {loading ? (
            <View className="bg-[#1F2327] rounded-2xl p-8 border border-white/10 items-center my-2">
              <ActivityIndicator size="small" color="#E85D26" />
              <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider mt-3">
                Loading Registered Courts...
              </Text>
            </View>
          ) : fetchError ? (
            <View className="bg-[#1F2327] rounded-2xl p-6 border border-[#F4A261]/30 items-center my-2">
              <View className="w-12 h-12 rounded-full bg-[#F4A261]/10 border border-[#F4A261]/30 items-center justify-center mb-3">
                <Ionicons name="alert-circle-outline" size={24} color="#F4A261" />
              </View>
              <Text className="text-[#F4F6F7] text-sm font-black uppercase tracking-tight text-center">
                Unable to Load Courts
              </Text>
              <Text className="text-[#A0A5AD] text-xs text-center mt-1 leading-4 max-w-xs">
                {fetchError}
              </Text>
              <Pressable
                onPress={loadCourts}
                accessibilityRole="button"
                accessibilityLabel="Retry loading courts"
                className="mt-4 px-5 py-2.5 rounded-xl bg-[#E85D26] active:opacity-90"
              >
                <Text className="text-[#171A1D] text-xs font-black uppercase">
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : courts.length === 0 ? (
            <View className="bg-[#1F2327] rounded-2xl p-6 border border-white/10 items-center my-2">
              <View className="w-12 h-12 rounded-full bg-[#272C31] border border-white/10 items-center justify-center mb-3">
                <Ionicons name="tennisball-outline" size={24} color="#A0A5AD" />
              </View>

              <Text className="text-[#F4F6F7] text-sm font-black uppercase tracking-tight text-center">
                No Courts Registered
              </Text>

              <Text className="text-[#A0A5AD] text-xs text-center mt-1 max-w-[260px] leading-4">
                Register the playing spaces and pitches available at your facility.
              </Text>

              <View className="mt-4 w-full max-w-[220px]">
                <PrimaryButton
                  title="ADD FIRST COURT"
                  variant="primary"
                  onPress={() => {
                    setCreateError(null);
                    setIsAddModalVisible(true);
                  }}
                />
              </View>
            </View>
          ) : displayedCourts.length === 0 ? (
            <View className="bg-[#1F2327] rounded-2xl p-5 border border-white/10 items-center my-2">
              <Text className="text-[#F4F6F7] text-xs font-bold uppercase tracking-wider">
                No Courts For Selected Sport
              </Text>
              <Text className="text-[#A0A5AD] text-xs mt-1 text-center">
                Try selecting &quot;ALL&quot; or choose another supported sport.
              </Text>
            </View>
          ) : (
            displayedCourts.map((court) => {
              const statusMeta = STATUS_CONFIG[court.status] || STATUS_CONFIG.AVAILABLE;
              const sportMeta = SPORT_META[court.sport];

              return (
                <View
                  key={court.id}
                  className="bg-[#1F2327] rounded-2xl border border-white/10 p-4 mb-3 shadow-sm"
                >
                  {/* Top Bar: Court Name, Sport & Status */}
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center">
                        <Text
                          className="text-[#F4F6F7] text-base font-black uppercase tracking-tight"
                          numberOfLines={1}
                        >
                          {court.name}
                        </Text>
                      </View>

                      {/* Sport tag */}
                      <View className="flex-row items-center mt-1 flex-wrap">
                        <View className="flex-row items-center mr-2">
                          <MaterialCommunityIcons
                            name={sportMeta?.icon || 'tennis'}
                            size={12}
                            color="#E85D26"
                          />
                          <Text className="text-[#A0A5AD] text-xs font-medium ml-1">
                            {sportMeta?.label || court.sport}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <ArenaBadge
                      label={statusMeta.label}
                      variant={statusMeta.badgeVariant}
                      size="sm"
                    />
                  </View>

                  {/* Allocation & Status Action Bar */}
                  <View className="mt-3 pt-3 border-t border-white/5 flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold">
                        Availability Status
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="text-[#A0A5AD] text-xs font-medium mt-0.5"
                      >
                        {statusMeta.hint}
                      </Text>
                    </View>

                    <View className="flex-row items-center space-x-2">
                      {/* Delete Button */}
                      <Pressable
                        onPress={() => setDeleteConfirmCourt(court)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${court.name}`}
                        className="bg-[#F4A261]/10 p-2.5 rounded-xl border border-[#F4A261]/30 active:bg-[#F4A261]/20 mr-1.5"
                      >
                        <Ionicons name="trash-outline" size={14} color="#F4A261" />
                      </Pressable>

                      {/* Status Toggle Button */}
                      <Pressable
                        onPress={() => {
                          setUpdateError(null);
                          setEditModalCourt(court);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Change status for ${court.name}. Currently ${statusMeta.label}`}
                        className="bg-[#272C31] px-3.5 py-2 rounded-xl border border-white/10 active:bg-white/5 flex-row items-center"
                      >
                        <Ionicons name="create-outline" size={14} color="#F4F6F7" />
                        <Text className="text-[#F4F6F7] text-xs font-bold uppercase ml-1">
                          Edit Status
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ===================================================================== */}
      {/* ADD COURT MODAL */}
      {/* ===================================================================== */}
      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View className="flex-1 bg-[#171A1D]/85 items-center justify-center p-5">
          <View className="w-full max-w-sm bg-[#1F2327] rounded-2xl p-6 border border-white/10 shadow-2xl">
            <View className="w-12 h-12 rounded-xl items-center justify-center border border-white/10 bg-[#272C31] mb-3">
              <Ionicons name="add-circle-outline" size={24} color="#E85D26" />
            </View>

            <ArenaBadge label="FACILITY REGISTRATION" variant="olive" size="sm" />

            <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight mt-2">
              Add Playing Space
            </Text>

            <Text className="text-[#A0A5AD] text-xs leading-4 mt-1">
              Register a court, turf pitch, or net area to your facility inventory.
            </Text>

            {createError ? (
              <View className="mt-3 p-3 rounded-xl bg-[#F4A261]/10 border border-[#F4A261]/30 flex-row items-center">
                <Ionicons name="alert-circle" size={16} color="#F4A261" />
                <Text className="text-[#F4A261] text-xs font-semibold ml-2 flex-1">
                  {createError}
                </Text>
              </View>
            ) : null}

            {/* Court Name Input */}
            <View className="mt-3">
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold mb-1.5">
                Court Name (Max 80 chars)
              </Text>
              <TextInput
                value={newCourtName}
                onChangeText={(t) => {
                  setNewCourtName(t);
                  if (createError) setCreateError(null);
                }}
                placeholder="e.g. Center Pitch A, Net 1"
                placeholderTextColor="#7F8993"
                maxLength={80}
                className="bg-[#272C31] border border-white/10 p-3 rounded-xl text-[#F4F6F7] text-xs font-bold"
              />
            </View>

            {/* Sport Selector */}
            <View className="mt-3">
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold mb-2">
                Supported Sport
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {ALL_SUPPORTED_SPORTS.map((s) => {
                  const isSel = newCourtSport === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setNewCourtSport(s)}
                      className={`px-3 py-2 rounded-xl border flex-row items-center ${
                        isSel
                          ? 'bg-[#E85D26] border-[#E85D26]'
                          : 'bg-[#272C31] border-white/10'
                      }`}
                    >
                      <MaterialCommunityIcons
                        name={SPORT_META[s].icon}
                        size={12}
                        color={isSel ? '#171A1D' : '#A0A5AD'}
                      />
                      <Text
                        className={`text-xs font-bold ml-1.5 ${
                          isSel ? 'text-[#171A1D]' : 'text-[#A0A5AD]'
                        }`}
                      >
                        {SPORT_META[s].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Initial Status Selector */}
            <View className="mt-3">
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold mb-2">
                Initial Operational Status
              </Text>
              <View className="flex-row gap-2">
                {(['AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as CourtStatus[]).map((st) => {
                  const isSel = newCourtStatus === st;
                  const meta = STATUS_CONFIG[st];
                  return (
                    <Pressable
                      key={st}
                      onPress={() => setNewCourtStatus(st)}
                      className={`flex-1 py-2 rounded-xl border items-center ${
                        isSel
                          ? 'bg-[#E85D26] border-[#E85D26]'
                          : 'bg-[#272C31] border-white/10'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold uppercase ${
                          isSel ? 'text-[#171A1D]' : 'text-[#A0A5AD]'
                        }`}
                      >
                        {meta.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Action Buttons */}
            <View className="mt-5 space-y-2">
              <PrimaryButton
                title={isCreating ? 'REGISTERING...' : 'REGISTER COURT'}
                variant="primary"
                loading={isCreating}
                onPress={handleCreateCourt}
              />
              <Pressable
                onPress={() => setIsAddModalVisible(false)}
                disabled={isCreating}
                className="py-3 items-center mt-2 bg-[#272C31] rounded-xl border border-white/10"
              >
                <Text className="text-[#A0A5AD] text-xs font-bold uppercase tracking-wider">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================================== */}
      {/* STATUS EDIT MODAL */}
      {/* ===================================================================== */}
      <Modal
        visible={!!editModalCourt}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalCourt(null)}
      >
        <View className="flex-1 bg-[#171A1D]/85 items-center justify-center p-5">
          <View className="w-full max-w-sm bg-[#1F2327] rounded-2xl p-6 border border-white/10 shadow-2xl">
            {editModalCourt ? (
              <>
                <View className="w-12 h-12 rounded-xl items-center justify-center border border-white/10 bg-[#272C31] mb-3">
                  <Ionicons name="clipboard-outline" size={24} color="#E85D26" />
                </View>

                <ArenaBadge label="COURT STATUS" variant="stone" size="sm" />

                <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight mt-2">
                  {editModalCourt.name}
                </Text>

                <Text className="text-[#A0A5AD] text-xs leading-4 mt-1">
                  Update operational status on the central server for this playing space.
                </Text>

                {updateError ? (
                  <View className="mt-3 p-3 rounded-xl bg-[#F4A261]/10 border border-[#F4A261]/30 flex-row items-center">
                    <Ionicons name="alert-circle" size={16} color="#F4A261" />
                    <Text className="text-[#F4A261] text-xs font-medium ml-2 flex-1">
                      {updateError}
                    </Text>
                  </View>
                ) : null}

                {/* Status Options */}
                <View className="space-y-2 mt-4">
                  {(['AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as CourtStatus[]).map((st) => {
                    const isCurrent = editModalCourt.status === st;
                    const meta = STATUS_CONFIG[st];

                    return (
                      <Pressable
                        key={st}
                        disabled={isUpdatingStatus}
                        onPress={() => handleUpdateStatus(st)}
                        accessibilityRole="button"
                        accessibilityLabel={`Set status to ${meta.label}`}
                        className={`p-3.5 rounded-xl border flex-row items-center justify-between ${
                          isCurrent
                            ? 'bg-[#272C31] border-[#E85D26]'
                            : 'bg-[#1F2327] border-white/10 active:bg-[#272C31]'
                        }`}
                      >
                        <View className="flex-1 pr-2">
                          <View className="flex-row items-center">
                            <Text
                              className={`text-xs font-black uppercase ${
                                isCurrent ? 'text-[#E85D26]' : 'text-[#F4F6F7]'
                              }`}
                            >
                              {meta.label}
                            </Text>
                            {isCurrent ? (
                              <View className="ml-2 bg-[#E85D26]/20 px-1.5 py-0.5 rounded-md">
                                <Text className="text-[#E85D26] text-[9px] font-mono">
                                  CURRENT
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text className="text-[#7F8993] text-[10px] mt-0.5 leading-3">
                            {meta.hint}
                          </Text>
                        </View>

                        <ArenaBadge
                          label={meta.label}
                          variant={meta.badgeVariant}
                          size="sm"
                        />
                      </Pressable>
                    );
                  })}
                </View>

                {/* Cancel button */}
                <Pressable
                  onPress={() => setEditModalCourt(null)}
                  disabled={isUpdatingStatus}
                  className="py-3 items-center mt-3 bg-[#272C31] rounded-xl border border-white/10"
                >
                  <Text className="text-[#A0A5AD] text-xs font-bold uppercase tracking-wider">
                    Close
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ===================================================================== */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ===================================================================== */}
      <Modal
        visible={!!deleteConfirmCourt}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmCourt(null)}
      >
        <View className="flex-1 bg-[#171A1D]/85 items-center justify-center p-5">
          <View className="w-full max-w-sm bg-[#1F2327] rounded-2xl p-6 border border-white/10 shadow-2xl">
            {deleteConfirmCourt ? (
              <>
                <View className="w-12 h-12 rounded-xl items-center justify-center border border-[#F4A261]/30 bg-[#F4A261]/10 mb-3">
                  <Ionicons name="trash-outline" size={24} color="#F4A261" />
                </View>

                <ArenaBadge label="DELETE CONFIRMATION" variant="rust" size="sm" />

                <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight mt-2">
                  Delete {deleteConfirmCourt.name}?
                </Text>

                <Text className="text-[#A0A5AD] text-xs leading-4 mt-1">
                  Are you sure you want to permanently remove this playing space from your registered inventory?
                </Text>

                <View className="mt-5 space-y-2">
                  <Pressable
                    onPress={handleDeleteCourt}
                    disabled={isDeleting}
                    className="py-3 items-center bg-[#F4A261] rounded-xl active:opacity-90"
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#171A1D" />
                    ) : (
                      <Text className="text-[#171A1D] text-xs font-mono uppercase font-black">
                        Confirm Delete
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => setDeleteConfirmCourt(null)}
                    disabled={isDeleting}
                    className="py-3 items-center mt-2 bg-[#272C31] rounded-xl border border-white/10"
                  >
                    <Text className="text-[#A0A5AD] text-xs font-bold uppercase tracking-wider">
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
