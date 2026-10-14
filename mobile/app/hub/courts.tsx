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

// =============================================================================
// DOMAIN CONSTANTS & META
// =============================================================================

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

/**
 * Status presentation mapping using Concrete Arena color tokens only.
 * Strictly: AVAILABLE | LIMITED | UNAVAILABLE.
 */
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

      // Re-fetch profile to keep synchronized court_count fresh
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

      // Reset form
      setNewCourtName('');
      setIsAddModalVisible(false);

      // Refresh real courts list
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

      // Sync court count in auth store
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
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
        <ArenaHeader
          title="MAIDAAN"
          subtitle="FACILITY DESK // ROLE RESTRICTION"
          showBack
          onBack={() => router.replace('/(tabs)/discover')}
        />
        <View className="flex-1 items-center justify-center p-6 bg-warm-white">
          <View className="w-16 h-16 rounded-full bg-rust/10 items-center justify-center border border-rust/30 mb-5">
            <Ionicons name="lock-closed" size={28} color="#875646" />
          </View>

          <ArenaBadge label="HUB OWNER ACCESS REQUIRED" variant="rust" size="md" />

          <Text className="text-graphite text-lg font-black uppercase tracking-tight text-center mt-3">
            HUB OWNER ACCESS REQUIRED
          </Text>

          <Text className="text-stone-muted text-sm text-center mt-2 max-w-[310px] leading-5">
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
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
        <ArenaHeader
          title="MAIDAAN"
          subtitle="FACILITY DESK // SETUP REQUIRED"
          showBack
          onBack={() => router.replace('/(tabs)/discover')}
        />
        <View className="flex-1 items-center justify-center p-6 bg-warm-white">
          <View className="w-16 h-16 rounded-full bg-stone/20 border border-stone items-center justify-center mb-5">
            <Ionicons name="business-outline" size={30} color="#666B60" />
          </View>

          <ArenaBadge label="HUB PROFILE NOT SET" variant="stone" size="md" />

          <Text className="text-graphite text-lg font-black uppercase tracking-tight text-center mt-3">
            HUB PROFILE NOT SET
          </Text>

          <Text className="text-stone-muted text-xs font-medium text-center mt-2.5 leading-5 max-w-[280px]">
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
  const hubName = hubOwnerProfile.hubName?.trim() || 'SPORTS HUB';
  const hubLocation = hubOwnerProfile.location?.trim() || 'LOCATION NOT SET';
  const isVerified = Boolean(hubOwnerProfile.isVerified);
  const declaredCourtsCount = hubOwnerProfile.courtsCount ?? courts.length;
  const configuredSports = hubOwnerProfile.sports ?? [];

  // Summary counts derived strictly from real API court records
  const availableCount = courts.filter((c) => c.status === 'AVAILABLE').length;
  const limitedCount = courts.filter((c) => c.status === 'LIMITED').length;

  // Filtered court list
  const displayedCourts = useMemo(() => {
    if (selectedSportFilter === 'all') {
      return courts;
    }
    return courts.filter((c) => c.sport === selectedSportFilter);
  }, [courts, selectedSportFilter]);

  // Unique sports represented in courts for filter chips
  const availableFilterSports = useMemo(() => {
    const set = new Set<Sport>();
    configuredSports.forEach((s) => set.add(s));
    courts.forEach((c) => set.add(c.sport));
    return Array.from(set);
  }, [configuredSports, courts]);

  // =========================================================================
  // 4. MAIN RENDER
  // =========================================================================
  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
      {/* Header */}
      <ArenaHeader
        title="MAIDAAN"
        subtitle="FACILITY DESK // PLAYING SPACES"
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
            className="px-2.5 py-1.5 rounded-sm bg-olive border border-olive-dark active:scale-95 flex-row items-center"
          >
            <Ionicons name="add" size={14} color="#F4F1EA" />
            <Text className="text-warm-white text-[10px] font-mono uppercase font-black ml-1">
              ADD COURT
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        {/* RESTRAINED FACILITY PHOTOGRAPHY BANNER */}
        <View className="px-4 pt-3">
          <View className="h-16 w-full rounded-sm overflow-hidden border border-stone relative bg-graphite">
            <Image
              source={IMAGES.arenaGround}
              className="w-full h-full opacity-35"
              resizeMode="cover"
            />
            <View className="absolute inset-0 px-3.5 py-2 flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-widest font-bold">
                  FACILITY ALLOCATION BOARD
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-warm-white text-sm font-black uppercase tracking-tight"
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

        {/* HUB CONTEXT STRIP */}
        <View className="px-4 mt-3">
          <View className="bg-white rounded-sm p-3.5 border border-stone shadow-2xs">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold tracking-wider">
                  REGISTERED HUB LOCATION
                </Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="location-sharp" size={13} color="#666B60" />
                  <Text
                    numberOfLines={1}
                    className="text-graphite text-xs font-bold ml-1 flex-1"
                  >
                    {hubLocation}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => router.push('/hub/profile')}
                accessibilityRole="button"
                accessibilityLabel="View Hub Profile"
                className="bg-stone/20 px-2.5 py-1 rounded-xs border border-stone active:bg-stone/30 flex-row items-center"
              >
                <Text className="text-graphite text-[10px] font-mono uppercase font-bold mr-1">
                  HUB PROFILE
                </Text>
                <Ionicons name="chevron-forward" size={10} color="#242522" />
              </Pressable>
            </View>

            {/* Supported Sports Strip */}
            <View className="mt-2.5 pt-2 border-t border-stone/30 flex-row items-center justify-between">
              <View className="flex-row items-center flex-wrap gap-1.5 flex-1 pr-2">
                {configuredSports.map((s) => (
                  <View
                    key={s}
                    className="flex-row items-center bg-stone/20 px-2 py-0.5 rounded-xs border border-stone/50"
                  >
                    <MaterialCommunityIcons
                      name={SPORT_META[s].icon}
                      size={11}
                      color="#242522"
                    />
                    <Text className="text-graphite text-[9px] font-mono uppercase font-bold ml-1">
                      {SPORT_META[s].label}
                    </Text>
                  </View>
                ))}
              </View>
              <Text className="text-stone-muted text-[10px] font-mono">
                {declaredCourtsCount} DECLARED
              </Text>
            </View>
          </View>
        </View>

        {/* DOMINANT ELEMENT: SUMMARY STRIP */}
        <View className="px-4 mt-4">
          <Text
            accessibilityRole="header"
            className="text-graphite text-[11px] font-mono uppercase tracking-widest mb-2 font-bold"
          >
            PLAYING SPACES OVERVIEW
          </Text>

          <View className="flex-row gap-2">
            {/* Stat 1: Total Persisted Courts */}
            <View className="flex-1 bg-stone/20 rounded-sm p-3 border border-stone">
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider font-bold">
                COURTS
              </Text>
              <Text className="text-graphite text-2xl font-black tracking-tight mt-0.5">
                {courts.length}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium mt-0.5">
                Persisted
              </Text>
            </View>

            {/* Stat 2: Available */}
            <View className="flex-1 bg-stone/20 rounded-sm p-3 border border-stone">
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider font-bold">
                AVAILABLE
              </Text>
              <Text className="text-arena-olive text-2xl font-black tracking-tight mt-0.5">
                {availableCount}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium mt-0.5">
                Active spaces
              </Text>
            </View>

            {/* Stat 3: Limited */}
            <View className="flex-1 bg-stone/20 rounded-sm p-3 border border-stone">
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider font-bold">
                LIMITED
              </Text>
              <Text className="text-rust text-2xl font-black tracking-tight mt-0.5">
                {limitedCount}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium mt-0.5">
                Restricted
              </Text>
            </View>
          </View>
        </View>

        {/* SPORT FILTER PILL BAR */}
        {availableFilterSports.length > 1 ? (
          <View className="px-4 mt-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              <Pressable
                onPress={() => setSelectedSportFilter('all')}
                accessibilityRole="button"
                accessibilityLabel="Filter All Courts"
                className={`mr-2 px-3 py-1.5 rounded-xs border ${
                  selectedSportFilter === 'all'
                    ? 'bg-graphite border-graphite shadow-2xs'
                    : 'bg-white border-stone active:bg-stone/20'
                }`}
              >
                <Text
                  className={`text-[10px] font-mono uppercase tracking-wider ${
                    selectedSportFilter === 'all' ? 'text-warm-white font-black' : 'text-graphite font-bold'
                  }`}
                >
                  ALL ({courts.length})
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
                    className={`mr-2 px-3 py-1.5 rounded-xs border flex-row items-center ${
                      isSelected
                        ? 'bg-graphite border-graphite shadow-2xs'
                        : 'bg-white border-stone active:bg-stone/20'
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={SPORT_META[s].icon}
                      size={12}
                      color={isSelected ? '#F4F1EA' : '#242522'}
                    />
                    <Text
                      className={`text-[10px] font-mono uppercase tracking-wider ml-1 ${
                        isSelected ? 'text-warm-white font-black' : 'text-graphite font-bold'
                      }`}
                    >
                      {SPORT_META[s].label.toUpperCase()} ({count})
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
              className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold"
            >
              COURTS & ALLOCATION
            </Text>
            <Text className="text-stone-muted text-[10px] font-mono">
              {displayedCourts.length} of {courts.length} LISTED
            </Text>
          </View>

          {/* ASYNC STATES: LOADING, ERROR, EMPTY, SUCCESS */}
          {loading ? (
            <View className="bg-white rounded-sm p-8 border border-stone items-center my-2 shadow-2xs">
              <ActivityIndicator size="small" color="#3D4438" />
              <Text className="text-graphite text-xs font-mono uppercase font-black tracking-wider mt-3">
                LOADING REGISTERED COURTS...
              </Text>
            </View>
          ) : fetchError ? (
            <View className="bg-white rounded-sm p-6 border border-rust/40 items-center my-2 shadow-2xs">
              <View className="w-12 h-12 rounded-full bg-rust/10 border border-rust/30 items-center justify-center mb-3">
                <Ionicons name="alert-circle-outline" size={24} color="#875646" />
              </View>
              <Text className="text-graphite text-sm font-black uppercase tracking-tight text-center">
                UNABLE TO LOAD COURTS
              </Text>
              <Text className="text-stone-muted text-xs text-center mt-1 leading-4 max-w-xs">
                {fetchError}
              </Text>
              <Pressable
                onPress={loadCourts}
                accessibilityRole="button"
                accessibilityLabel="Retry loading courts"
                className="mt-4 px-5 py-2.5 rounded-sm bg-olive active:opacity-90"
              >
                <Text className="text-warm-white text-xs font-mono uppercase font-black">
                  RETRY
                </Text>
              </Pressable>
            </View>
          ) : courts.length === 0 ? (
            <View className="bg-white rounded-sm p-6 border border-stone items-center my-2 shadow-2xs">
              <View className="w-12 h-12 rounded-full bg-stone/20 border border-stone items-center justify-center mb-3">
                <Ionicons name="tennisball-outline" size={24} color="#666B60" />
              </View>

              <Text className="text-graphite text-sm font-black uppercase tracking-tight text-center">
                NO COURTS REGISTERED
              </Text>

              <Text className="text-stone-muted text-xs text-center mt-1 max-w-[260px] leading-4">
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
            <View className="bg-white rounded-sm p-5 border border-stone items-center my-2">
              <Text className="text-graphite text-xs font-bold uppercase tracking-wider">
                NO COURTS FOR SELECTED SPORT
              </Text>
              <Text className="text-stone-muted text-xs mt-1 text-center">
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
                  className="bg-white rounded-sm border border-stone p-4 mb-3 shadow-2xs"
                >
                  {/* Top Bar: Court Name, Sport & Status */}
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center">
                        <Text
                          className="text-graphite text-base font-black uppercase tracking-tight"
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
                            color="#3D4438"
                          />
                          <Text className="text-graphite text-[10px] font-mono uppercase font-bold ml-1">
                            {sportMeta?.label || court.sport}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <ArenaBadge
                      label={statusMeta.label}
                      variant={statusMeta.badgeVariant}
                      size="sm"
                    />
                  </View>

                  {/* Allocation & Status Action Bar */}
                  <View className="mt-3 pt-2.5 border-t border-stone/30 flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                        AVAILABILITY STATUS
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="text-graphite text-[10px] font-medium mt-0.5"
                      >
                        {statusMeta.hint}
                      </Text>
                    </View>

                    <View className="flex-row items-center space-x-1.5">
                      {/* Delete Button */}
                      <Pressable
                        onPress={() => setDeleteConfirmCourt(court)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${court.name}`}
                        className="bg-rust/10 p-2 rounded-xs border border-rust/30 active:bg-rust/20 mr-1.5"
                      >
                        <Ionicons name="trash-outline" size={13} color="#875646" />
                      </Pressable>

                      {/* Status Toggle Button */}
                      <Pressable
                        onPress={() => {
                          setUpdateError(null);
                          setEditModalCourt(court);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Change status for ${court.name}. Currently ${statusMeta.label}`}
                        className="bg-stone/20 px-3 py-2 rounded-xs border border-stone active:bg-stone/40 flex-row items-center"
                      >
                        <Ionicons name="create-outline" size={13} color="#242522" />
                        <Text className="text-graphite text-[10px] font-mono uppercase font-bold ml-1">
                          EDIT STATUS
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
        <View className="flex-1 bg-graphite/80 items-center justify-center p-5">
          <View className="w-full max-w-sm bg-warm-white rounded-sm p-5 border border-stone shadow-xl">
            <View className="w-12 h-12 rounded-sm items-center justify-center border border-stone bg-stone/20 mb-3">
              <Ionicons name="add-circle-outline" size={24} color="#3D4438" />
            </View>

            <ArenaBadge label="FACILITY REGISTRATION" variant="olive" size="sm" />

            <Text className="text-graphite text-lg font-black uppercase tracking-tight mt-2">
              ADD NEW PLAYING SPACE
            </Text>

            <Text className="text-stone-muted text-xs leading-4 mt-1">
              Register a court, turf pitch, or net area to your facility inventory.
            </Text>

            {createError ? (
              <View className="mt-3 p-2.5 rounded-xs bg-rust/10 border border-rust/30 flex-row items-center">
                <Ionicons name="alert-circle" size={14} color="#875646" />
                <Text className="text-rust text-xs font-semibold ml-1.5 flex-1">
                  {createError}
                </Text>
              </View>
            ) : null}

            {/* Court Name Input */}
            <View className="mt-3">
              <Text className="text-graphite text-[10px] font-mono uppercase font-bold mb-1">
                COURT NAME (MAX 80 CHARS)
              </Text>
              <TextInput
                value={newCourtName}
                onChangeText={(t) => {
                  setNewCourtName(t);
                  if (createError) setCreateError(null);
                }}
                placeholder="e.g. Center Pitch A, Net 1"
                placeholderTextColor="#75796F"
                maxLength={80}
                className="bg-white border border-stone p-2.5 rounded-xs text-graphite text-xs font-bold"
              />
            </View>

            {/* Sport Selector */}
            <View className="mt-3">
              <Text className="text-graphite text-[10px] font-mono uppercase font-bold mb-1.5">
                SUPPORTED SPORT
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {ALL_SUPPORTED_SPORTS.map((s) => {
                  const isSel = newCourtSport === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setNewCourtSport(s)}
                      className={`px-2.5 py-1.5 rounded-xs border flex-row items-center ${
                        isSel
                          ? 'bg-graphite border-graphite'
                          : 'bg-white border-stone active:bg-stone/20'
                      }`}
                    >
                      <MaterialCommunityIcons
                        name={SPORT_META[s].icon}
                        size={12}
                        color={isSel ? '#F4F1EA' : '#242522'}
                      />
                      <Text
                        className={`text-[10px] font-mono uppercase font-bold ml-1 ${
                          isSel ? 'text-warm-white' : 'text-graphite'
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
              <Text className="text-graphite text-[10px] font-mono uppercase font-bold mb-1.5">
                INITIAL OPERATIONAL STATUS
              </Text>
              <View className="flex-row gap-1.5">
                {(['AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as CourtStatus[]).map((st) => {
                  const isSel = newCourtStatus === st;
                  const meta = STATUS_CONFIG[st];
                  return (
                    <Pressable
                      key={st}
                      onPress={() => setNewCourtStatus(st)}
                      className={`flex-1 py-1.5 rounded-xs border items-center ${
                        isSel
                          ? 'bg-olive border-olive-dark'
                          : 'bg-white border-stone active:bg-stone/20'
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-mono uppercase font-black ${
                          isSel ? 'text-warm-white' : 'text-graphite'
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
                className="py-2.5 items-center mt-2 bg-stone/20 rounded-xs border border-stone active:bg-stone/40"
              >
                <Text className="text-graphite text-xs font-bold uppercase tracking-wider">
                  CANCEL
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
        <View className="flex-1 bg-graphite/80 items-center justify-center p-5">
          <View className="w-full max-w-sm bg-warm-white rounded-sm p-5 border border-stone shadow-xl">
            {editModalCourt ? (
              <>
                <View className="w-12 h-12 rounded-sm items-center justify-center border border-stone bg-stone/20 mb-3">
                  <Ionicons name="clipboard-outline" size={24} color="#242522" />
                </View>

                <ArenaBadge label="COURT STATUS ALLOCATION" variant="stone" size="sm" />

                <Text className="text-graphite text-lg font-black uppercase tracking-tight mt-2">
                  {editModalCourt.name}
                </Text>

                <Text className="text-stone-muted text-xs leading-4 mt-1">
                  Update operational status on the central server for this playing space.
                </Text>

                {updateError ? (
                  <View className="mt-3 p-2 rounded-xs bg-rust/10 border border-rust/30 flex-row items-center">
                    <Ionicons name="alert-circle" size={13} color="#875646" />
                    <Text className="text-rust text-xs font-medium ml-1.5 flex-1">
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
                        className={`p-3 rounded-xs border flex-row items-center justify-between ${
                          isCurrent
                            ? 'bg-white border-graphite shadow-2xs'
                            : 'bg-warm-white border-stone active:bg-stone/20'
                        }`}
                      >
                        <View className="flex-1 pr-2">
                          <View className="flex-row items-center">
                            <Text
                              className={`text-xs font-black uppercase ${
                                isCurrent ? 'text-graphite' : 'text-stone-muted'
                              }`}
                            >
                              {meta.label}
                            </Text>
                            {isCurrent ? (
                              <View className="ml-2 bg-graphite/10 px-1 py-0.5 rounded-xs">
                                <Text className="text-graphite text-[9px] font-mono">
                                  CURRENT
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text className="text-stone-muted text-[10px] mt-0.5 leading-3">
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
                  className="py-2.5 items-center mt-3 bg-stone/20 rounded-xs border border-stone active:bg-stone/40"
                >
                  <Text className="text-graphite text-xs font-bold uppercase tracking-wider">
                    CLOSE
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
        <View className="flex-1 bg-graphite/80 items-center justify-center p-5">
          <View className="w-full max-w-sm bg-warm-white rounded-sm p-5 border border-stone shadow-xl">
            {deleteConfirmCourt ? (
              <>
                <View className="w-12 h-12 rounded-sm items-center justify-center border border-rust/40 bg-rust/10 mb-3">
                  <Ionicons name="trash-outline" size={24} color="#875646" />
                </View>

                <ArenaBadge label="DELETE CONFIRMATION" variant="rust" size="sm" />

                <Text className="text-graphite text-lg font-black uppercase tracking-tight mt-2">
                  DELETE {deleteConfirmCourt.name}?
                </Text>

                <Text className="text-stone-muted text-xs leading-4 mt-1">
                  Are you sure you want to permanently remove this playing space from your registered inventory?
                </Text>

                <View className="mt-5 space-y-2">
                  <Pressable
                    onPress={handleDeleteCourt}
                    disabled={isDeleting}
                    className="py-3 items-center bg-rust rounded-xs border border-rust active:opacity-90"
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#F4F1EA" />
                    ) : (
                      <Text className="text-warm-white text-xs font-mono uppercase font-black">
                        CONFIRM DELETE
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => setDeleteConfirmCourt(null)}
                    disabled={isDeleting}
                    className="py-2.5 items-center mt-2 bg-stone/20 rounded-xs border border-stone active:bg-stone/40"
                  >
                    <Text className="text-graphite text-xs font-bold uppercase tracking-wider">
                      CANCEL
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
