import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { MatchSlotItem } from '../../constants/matches';
import { matchService } from '../../services/matchService';
import {
  joinRequestService,
  CaptainJoinRequest,
} from '../../services/joinRequestService';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { IMAGES } from '../../constants/images';
import { Sport, SkillLevel } from '../../types';

// Skill tier badges
const SKILL_METAS: Record<
  SkillLevel,
  { label: string; badge: string; variant: 'stone' | 'olive' | 'rust' }
> = {
  beginner: { label: 'Beginner', badge: 'Tier 3', variant: 'stone' },
  intermediate: { label: 'Intermediate', badge: 'Tier 2', variant: 'olive' },
  advanced: { label: 'Advanced', badge: 'Tier 1', variant: 'rust' },
};

const SPORT_ICONS: Record<Sport, 'soccer' | 'cricket' | 'tennis' | 'badminton'> = {
  football: 'soccer',
  cricket: 'cricket',
  padel: 'tennis',
  badminton: 'badminton',
};

export default function JoinRequestsScreen() {
  const { matchId: routeMatchId } = useLocalSearchParams<{ matchId?: string }>();
  const { currentUser, selectedRole, captainProfile } = useAuthStore();

  // Role resolution
  const effectiveRole = currentUser?.role || selectedRole || 'PLAYER';
  const isCaptain = effectiveRole === 'TEAM_CAPTAIN';

  // Filter tab state
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('pending');

  // Real backend join requests and owned fixtures
  const [requests, setRequests] = useState<CaptainJoinRequest[]>([]);
  const [ownedFixtures, setOwnedFixtures] = useState<MatchSlotItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Per-request action processing state
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'accept' | 'decline';
    request: CaptainJoinRequest;
    match?: MatchSlotItem;
  } | null>(null);

  const isMountedRef = React.useRef(true);

  // Load real captain fixtures and their requests
  const loadData = useCallback(async () => {
    try {
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
        setActionError(null);
      }

      const fixtures = await matchService.getCaptainMatches();
      if (isMountedRef.current) {
        setOwnedFixtures(fixtures);
      }

      if (fixtures.length === 0) {
        if (isMountedRef.current) {
          setRequests([]);
        }
        return;
      }

      if (routeMatchId) {
        const matchRequests = await joinRequestService.getMatchJoinRequests(routeMatchId);
        if (isMountedRef.current) {
          setRequests(matchRequests);
        }
      } else {
        const allRequestsPromises = fixtures.map((f) =>
          joinRequestService.getMatchJoinRequests(f.id).catch(() => [])
        );
        const results = await Promise.all(allRequestsPromises);
        if (isMountedRef.current) {
          setRequests(results.flat());
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn('[JoinRequestsScreen] Error loading captain requests:', err);
        setError('Unable to load join requests from server. Please check your connection.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [routeMatchId]);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      loadData();
      return () => {
        isMountedRef.current = false;
      };
    }, [loadData])
  );

  // =========================================================================
  // 1. ROLE GUARD: NON-CAPTAIN USER ACCESS
  // =========================================================================
  if (!isCaptain) {
    return (
      <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top']}>
        <ArenaHeader
          title="Join Requests"
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
            Captain Access Required
          </Text>

          <Text className="text-[#A0A5AD] text-sm text-center mt-2 max-w-[310px] leading-5">
            Player join request management is restricted to Team Captain accounts.
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
  // 2. MISSING CAPTAIN PROFILE: ONBOARDING REQUIRED
  // =========================================================================
  if (!captainProfile) {
    return (
      <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top']}>
        <ArenaHeader
          title="Join Requests"
          subtitle="Setup Required"
          showBack
          onBack={() => router.replace('/captain/dashboard')}
        />
        <View className="flex-1 items-center justify-center p-6 bg-[#171A1D]">
          <View className="w-16 h-16 rounded-full bg-[#272C31] border border-white/10 items-center justify-center mb-5">
            <Ionicons name="clipboard-outline" size={30} color="#A0A5AD" />
          </View>

          <ArenaBadge label="PROFILE REQUIRED" variant="stone" size="md" />

          <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight text-center mt-3">
            Captain Profile Not Set
          </Text>

          <Text className="text-[#A0A5AD] text-sm text-center mt-2 max-w-[310px] leading-5">
            Please complete your captain setup before reviewing player join requests.
          </Text>

          <View className="w-full mt-6 space-y-3">
            <PrimaryButton
              title="COMPLETE CAPTAIN SETUP"
              variant="primary"
              onPress={() => router.push('/onboarding/captain-setup')}
            />
            <PrimaryButton
              title="RETURN TO CAPTAIN DESK"
              variant="outline"
              onPress={() => router.replace('/captain/dashboard')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Fixture lookup map
  const fixturesMap = useMemo(() => {
    const map = new Map<string, MatchSlotItem>();
    for (const f of ownedFixtures) {
      map.set(f.id, f);
    }
    return map;
  }, [ownedFixtures]);

  // Derive counts for Summary Strip
  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'PENDING').length,
    [requests]
  );
  const acceptedCount = useMemo(
    () => requests.filter((r) => r.status === 'ACCEPTED').length,
    [requests]
  );
  const declinedCount = useMemo(
    () => requests.filter((r) => r.status === 'REJECTED').length,
    [requests]
  );

  // Filtered list based on active filter tab
  const displayedRequests = useMemo(() => {
    switch (activeFilter) {
      case 'pending':
        return requests.filter((r) => r.status === 'PENDING');
      case 'accepted':
        return requests.filter((r) => r.status === 'ACCEPTED');
      case 'declined':
        return requests.filter((r) => r.status === 'REJECTED');
      case 'all':
      default:
        return requests;
    }
  }, [requests, activeFilter]);

  // =========================================================================
  // ACTION HANDLERS
  // =========================================================================
  const handleOpenConfirm = (type: 'accept' | 'decline', request: CaptainJoinRequest) => {
    const match = fixturesMap.get(request.matchId);
    setConfirmModal({ type, request, match });
  };

  const handleConfirmDecision = async () => {
    if (!confirmModal) return;
    const { type, request } = confirmModal;
    setConfirmModal(null);

    const action = type === 'accept' ? 'ACCEPT' : 'REJECT';

    try {
      setProcessingRequestId(request.id);
      setActionError(null);

      await joinRequestService.updateJoinRequest(request.id, action);
      await loadData();
    } catch (err: any) {
      console.warn('[JoinRequestsScreen] Update request error:', err);
      setActionError(
        err?.message ||
          (action === 'ACCEPT'
            ? 'This fixture no longer has an open slot.'
            : 'Failed to decline request. Please try again.')
      );
      loadData();
    } finally {
      setProcessingRequestId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top']}>
      {/* Modern Athletic Header */}
      <ArenaHeader
        title="Join Requests"
        subtitle="Match Lineup Applications"
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        {/* Banner */}
        <View className="px-4 pt-3">
          <View className="h-16 w-full rounded-2xl overflow-hidden border border-white/10 relative bg-[#1F2327]">
            <Image
              source={IMAGES.arenaTeam}
              className="w-full h-full opacity-30"
              resizeMode="cover"
            />
            <View className="absolute inset-0 px-4 py-2.5 flex-row items-center justify-between bg-gradient-to-r from-[#171A1D]/80 to-transparent">
              <View>
                <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-widest font-bold">
                  Team Lineup
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-[#F4F6F7] text-sm font-black uppercase tracking-tight"
                >
                  {captainProfile.teamName?.trim() || 'Team Captain'}
                </Text>
              </View>
              <ArenaBadge
                label={`${ownedFixtures.length} FIXTURE${ownedFixtures.length > 1 ? 'S' : ''}`}
                variant="olive"
                size="sm"
              />
            </View>
          </View>
        </View>

        {/* Page Title & Context */}
        <View className="px-4 pt-3 pb-1">
          <Text className="text-[#F4F6F7] text-xl font-black uppercase tracking-tight">
            Join Requests
          </Text>
          <Text className="text-[#A0A5AD] text-xs leading-4 mt-0.5">
            Review applicant player profiles and approve open slot call-ups for your squad fixtures.
          </Text>
        </View>

        {/* Action Error Message Banner */}
        {actionError && (
          <View className="mx-4 mt-3 p-3 bg-[#F4A261]/10 border border-[#F4A261]/30 rounded-xl flex-row items-center">
            <Ionicons name="alert-circle" size={16} color="#F4A261" />
            <Text className="text-[#F4A261] text-xs font-bold ml-2 flex-1">
              {actionError}
            </Text>
          </View>
        )}

        {/* SUMMARY STRIP */}
        <View className="px-4 mt-3">
          <View className="flex-row gap-2">
            {/* PENDING */}
            <Pressable
              onPress={() => setActiveFilter('pending')}
              className={`flex-1 rounded-2xl p-3.5 border ${
                activeFilter === 'pending'
                  ? 'bg-[#F4A261]/15 border-[#F4A261]'
                  : 'bg-[#1F2327] border-white/10'
              }`}
            >
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-wider font-bold">
                PENDING
              </Text>
              <Text className="text-[#F4A261] text-2xl font-black tracking-tight mt-0.5">
                {pendingCount}
              </Text>
              <Text className="text-[#A0A5AD] text-[10px] font-medium mt-0.5">Awaiting</Text>
            </Pressable>

            {/* ACCEPTED */}
            <Pressable
              onPress={() => setActiveFilter('accepted')}
              className={`flex-1 rounded-2xl p-3.5 border ${
                activeFilter === 'accepted'
                  ? 'bg-[#E85D26]/15 border-[#E85D26]'
                  : 'bg-[#1F2327] border-white/10'
              }`}
            >
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-wider font-bold">
                ACCEPTED
              </Text>
              <Text className="text-[#E85D26] text-2xl font-black tracking-tight mt-0.5">
                {acceptedCount}
              </Text>
              <Text className="text-[#A0A5AD] text-[10px] font-medium mt-0.5">Cleared</Text>
            </Pressable>

            {/* DECLINED */}
            <Pressable
              onPress={() => setActiveFilter('declined')}
              className={`flex-1 rounded-2xl p-3.5 border ${
                activeFilter === 'declined'
                  ? 'bg-[#272C31] border-white/30'
                  : 'bg-[#1F2327] border-white/10'
              }`}
            >
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-wider font-bold">
                DECLINED
              </Text>
              <Text className="text-[#A0A5AD] text-2xl font-black tracking-tight mt-0.5">
                {declinedCount}
              </Text>
              <Text className="text-[#7F8993] text-[10px] font-medium mt-0.5">Closed</Text>
            </Pressable>
          </View>
        </View>

        {/* REQUESTS LIST SECTION */}
        <View className="px-4 mt-5">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold">
              Candidate Applications
            </Text>
            <Text className="text-[#7F8993] text-[10px] font-mono">
              {displayedRequests.length} of {requests.length} Shown
            </Text>
          </View>

          {/* ASYNC STATES: LOADING / ERROR / EMPTY / LIST */}
          {isLoading ? (
            <View className="bg-[#1F2327] rounded-2xl p-8 border border-white/10 items-center justify-center">
              <ActivityIndicator size="small" color="#E85D26" />
              <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider mt-3">
                Syncing Join Requests...
              </Text>
            </View>
          ) : error ? (
            <View className="bg-[#1F2327] rounded-2xl p-6 border border-[#F4A261]/30 items-center">
              <View className="w-12 h-12 rounded-full bg-[#F4A261]/10 border border-[#F4A261]/30 items-center justify-center mb-3">
                <Ionicons name="cloud-offline-outline" size={24} color="#F4A261" />
              </View>
              <Text className="text-[#F4F6F7] text-sm font-black uppercase tracking-tight text-center">
                Failed to Load Requests
              </Text>
              <Text className="text-[#A0A5AD] text-xs font-medium text-center mt-1.5 leading-5 max-w-[260px]">
                {error}
              </Text>
              <View className="w-full mt-5">
                <Pressable
                  onPress={loadData}
                  accessibilityRole="button"
                  accessibilityLabel="Retry Loading Requests"
                  className="w-full bg-[#E85D26] rounded-xl py-3 items-center justify-center active:opacity-90"
                >
                  <Text className="text-[#171A1D] text-xs font-black uppercase tracking-wider">
                    Retry
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : displayedRequests.length === 0 ? (
            <View className="bg-[#1F2327] rounded-2xl p-8 border border-white/10 items-center">
              <View className="w-12 h-12 rounded-full bg-[#272C31] border border-white/10 items-center justify-center mb-3">
                <Ionicons name="people-outline" size={24} color="#A0A5AD" />
              </View>
              <Text className="text-[#F4F6F7] text-sm font-black uppercase tracking-tight text-center">
                No Pending Requests
              </Text>
              <Text className="text-[#A0A5AD] text-xs font-medium text-center mt-1.5 leading-5 max-w-[260px]">
                {activeFilter === 'pending'
                  ? 'There are no awaiting player applications for your match fixtures right now.'
                  : 'No request records match the selected status filter.'}
              </Text>
            </View>
          ) : (
            displayedRequests.map((req) => {
              const match = fixturesMap.get(req.matchId);
              const sport = (req.preferredSports?.[0] || match?.sport || 'cricket') as Sport;
              const sportIcon = SPORT_ICONS[sport] || 'soccer';
              const skillMeta = SKILL_METAS[req.skillLevel] || SKILL_METAS.beginner;
              const isMatchFull = match ? match.slotsOpen <= 0 : false;
              const isProcessing = processingRequestId === req.id;

              return (
                <View
                  key={req.id}
                  className="bg-[#1F2327] rounded-2xl border border-white/10 p-4 mb-3 shadow-sm"
                >
                  {/* Top Bar: Player Name & Status Badge */}
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center">
                        <Text
                          className="text-[#F4F6F7] text-base font-black uppercase tracking-tight"
                          numberOfLines={1}
                        >
                          {req.playerName}
                        </Text>
                        <View className="ml-2 bg-[#272C31] px-2 py-0.5 rounded-lg border border-white/10">
                          <Text className="text-[#E85D26] text-[10px] font-mono uppercase font-bold">
                            PLAYER
                          </Text>
                        </View>
                      </View>

                      {/* Locality & Time */}
                      <View className="flex-row items-center mt-1 flex-wrap">
                        {req.primaryLocation ? (
                          <View className="flex-row items-center mr-2">
                            <Ionicons name="location-outline" size={12} color="#A0A5AD" />
                            <Text className="text-[#A0A5AD] text-xs ml-0.5 font-medium">
                              {req.primaryLocation}
                            </Text>
                          </View>
                        ) : null}

                        <Text className="text-[#7F8993] text-xs font-mono">
                          • {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    {req.status === 'PENDING' ? (
                      <ArenaBadge label="PENDING" variant="rust" size="sm" />
                    ) : req.status === 'ACCEPTED' ? (
                      <ArenaBadge label="ACCEPTED" variant="olive" size="sm" />
                    ) : (
                      <ArenaBadge label="DECLINED" variant="stone" size="sm" />
                    )}
                  </View>

                  {/* Sport & Skill Strip */}
                  <View className="flex-row items-center space-x-2 mt-2.5 pt-2.5 border-t border-white/5">
                    <View className="flex-row items-center bg-[#272C31] px-2.5 py-1 rounded-lg border border-white/10 mr-2">
                      <MaterialCommunityIcons name={sportIcon} size={12} color="#E85D26" />
                      <Text className="text-[#F4F6F7] text-[10px] font-bold uppercase ml-1">
                        {sport.toUpperCase()}
                      </Text>
                    </View>

                    <ArenaBadge
                      label={`${skillMeta.badge} • ${skillMeta.label.toUpperCase()}`}
                      variant={skillMeta.variant}
                      size="sm"
                    />
                  </View>

                  {/* Player Message if provided */}
                  {req.message ? (
                    <View className="mt-2.5 p-2.5 bg-[#272C31] rounded-xl border border-white/5">
                      <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold mb-0.5">
                        Player Note
                      </Text>
                      <Text className="text-[#F4F6F7] text-xs italic">
                        "{req.message}"
                      </Text>
                    </View>
                  ) : null}

                  {/* Fixture Context Box */}
                  {match ? (
                    <View className="mt-3 bg-[#272C31] rounded-xl p-3 border border-white/10">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-[#7F8993] text-[9px] font-mono uppercase font-bold">
                          Target Fixture
                        </Text>
                        <Text className="text-[#E85D26] text-[10px] font-mono font-bold">
                          {match.slotsOpen} / {match.totalSlots} Slots Open
                        </Text>
                      </View>

                      <Text
                        className="text-[#F4F6F7] text-xs font-black uppercase tracking-tight"
                        numberOfLines={1}
                      >
                        {match.title}
                      </Text>

                      <View className="flex-row items-center justify-between mt-1 pt-1 border-t border-white/5">
                        <Text className="text-[#A0A5AD] text-[10px] font-mono" numberOfLines={1}>
                          {match.date} • {match.startTime || match.time}
                        </Text>
                        <Text className="text-[#A0A5AD] text-[10px] font-mono" numberOfLines={1}>
                          {match.groundName}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Action Buttons for PENDING */}
                  <View className="mt-3 pt-2.5 border-t border-white/5">
                    {req.status === 'PENDING' ? (
                      <View>
                        {isMatchFull ? (
                          <View className="mb-2 p-2 bg-[#F4A261]/10 border border-[#F4A261]/30 rounded-xl flex-row items-center">
                            <Ionicons name="alert-circle-outline" size={14} color="#F4A261" />
                            <Text className="text-[#F4A261] text-[10px] font-mono font-bold uppercase ml-1.5 flex-1">
                              No Open Slot • Roster Capacity Reached
                            </Text>
                          </View>
                        ) : null}

                        <View className="flex-row gap-2">
                          {/* DECLINE BUTTON */}
                          <Pressable
                            onPress={() => handleOpenConfirm('decline', req)}
                            disabled={isProcessing}
                            accessibilityRole="button"
                            accessibilityLabel={`Decline request from ${req.playerName}`}
                            className="flex-1 py-3 rounded-xl bg-[#272C31] border border-white/10 items-center justify-center active:bg-white/5"
                          >
                            <Text className="text-[#F4F6F7] text-xs font-bold uppercase tracking-wide">
                              Decline
                            </Text>
                          </Pressable>

                          {/* ACCEPT BUTTON */}
                          <Pressable
                            onPress={() => handleOpenConfirm('accept', req)}
                            disabled={isMatchFull || isProcessing}
                            accessibilityRole="button"
                            accessibilityLabel={`Accept ${req.playerName} for match`}
                            className={`flex-1 py-3 rounded-xl items-center justify-center ${
                              isMatchFull || isProcessing
                                ? 'bg-[#272C31] border border-white/10 opacity-50'
                                : 'bg-[#E85D26] border border-[#E85D26] active:opacity-90'
                            }`}
                          >
                            {isProcessing ? (
                              <ActivityIndicator size="small" color="#171A1D" />
                            ) : (
                              <Text
                                className={`text-xs font-black uppercase tracking-wider ${
                                  isMatchFull ? 'text-[#7F8993]' : 'text-[#171A1D]'
                                }`}
                              >
                                Accept
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    ) : req.status === 'ACCEPTED' ? (
                      <View className="p-3 bg-[#E85D26]/10 rounded-xl border border-[#E85D26]/30 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="checkmark-circle" size={18} color="#E85D26" />
                          <View className="ml-2">
                            <Text className="text-[#E85D26] text-xs font-black uppercase tracking-tight">
                              Spot Approved
                            </Text>
                            <Text className="text-[#A0A5AD] text-[10px] font-mono">
                              Player confirmed in match roster
                            </Text>
                          </View>
                        </View>
                        <ArenaBadge label="APPROVED" variant="olive" size="sm" />
                      </View>
                    ) : (
                      <View className="p-3 bg-[#272C31] rounded-xl border border-white/10 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="close-circle-outline" size={18} color="#A0A5AD" />
                          <View className="ml-2">
                            <Text className="text-[#F4F6F7] text-xs font-bold uppercase tracking-tight">
                              Request Declined
                            </Text>
                            <Text className="text-[#7F8993] text-[10px] font-mono">
                              Slot remains vacant
                            </Text>
                          </View>
                        </View>
                        <ArenaBadge label="DECLINED" variant="stone" size="sm" />
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={!!confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <View className="flex-1 bg-[#171A1D]/85 items-center justify-center p-5">
          <View className="w-full max-w-sm bg-[#1F2327] rounded-2xl p-6 border border-white/10 shadow-2xl">
            {confirmModal ? (
              <>
                <View
                  className={`w-12 h-12 rounded-xl items-center justify-center mb-3 ${
                    confirmModal.type === 'accept'
                      ? 'bg-[#E85D26]'
                      : 'bg-[#272C31] border border-white/10'
                  }`}
                >
                  <Ionicons
                    name={confirmModal.type === 'accept' ? 'checkmark-sharp' : 'close-sharp'}
                    size={24}
                    color={confirmModal.type === 'accept' ? '#171A1D' : '#F4F6F7'}
                  />
                </View>

                <ArenaBadge
                  label={
                    confirmModal.type === 'accept'
                      ? 'CONFIRM SQUAD CALL-UP'
                      : 'DECLINE APPLICATION'
                  }
                  variant={confirmModal.type === 'accept' ? 'olive' : 'stone'}
                  size="sm"
                />

                <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight mt-2">
                  {confirmModal.type === 'accept'
                    ? `Accept ${confirmModal.request.playerName}?`
                    : `Decline Request?`}
                </Text>

                <Text className="text-[#A0A5AD] text-xs leading-4 mt-1">
                  {confirmModal.type === 'accept'
                    ? `This will atomically decrement an open slot and confirm ${confirmModal.request.playerName} on the fixture lineup.`
                    : `This will mark ${confirmModal.request.playerName}'s application as rejected.`}
                </Text>

                {confirmModal.match && (
                  <View className="my-3 p-3 bg-[#272C31] rounded-xl border border-white/10">
                    <Text className="text-[#F4F6F7] text-xs font-black uppercase" numberOfLines={1}>
                      {confirmModal.match.title}
                    </Text>
                    <Text className="text-[#A0A5AD] text-[10px] font-mono mt-0.5">
                      {confirmModal.match.date} • {confirmModal.match.startTime || confirmModal.match.time}
                    </Text>
                  </View>
                )}

                <View className="space-y-2 mt-2">
                  <PrimaryButton
                    title={
                      confirmModal.type === 'accept' ? 'CONFIRM ACCEPT' : 'CONFIRM DECLINE'
                    }
                    variant={confirmModal.type === 'accept' ? 'primary' : 'rust'}
                    onPress={handleConfirmDecision}
                  />

                  <Pressable
                    onPress={() => setConfirmModal(null)}
                    className="py-3 items-center mt-1"
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
