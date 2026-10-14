import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { IMAGES } from '../../constants/images';
import { Sport, HubVerificationRequest, HubVerificationStatus } from '../../types';
import { adminService } from '../../services/adminService';

const SPORT_META: Record<
  Sport,
  { label: string; icon: 'soccer' | 'cricket' | 'tennis' | 'badminton' }
> = {
  football: { label: 'Football', icon: 'soccer' },
  cricket: { label: 'Cricket', icon: 'cricket' },
  padel: { label: 'Padel', icon: 'tennis' },
  badminton: { label: 'Badminton', icon: 'badminton' },
};

export default function HubVerificationScreen() {
  const { currentUser } = useAuthStore();

  // Strict Admin Role Guard
  const isAdmin = currentUser?.role === 'ADMIN';

  // Live state
  const [submissions, setSubmissions] = useState<HubVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

  // Decision processing state
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'approve' | 'decline';
    submission: HubVerificationRequest;
  } | null>(null);

  // Optional admin note for rejection/review decisions (max 300 chars)
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');

  // Inspection modal state
  const [inspectSubmission, setInspectSubmission] = useState<HubVerificationRequest | null>(null);

  const fetchSubmissions = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getHubVerifications();
      if (res.data?.requests) {
        setSubmissions(res.data.requests);
      } else {
        setError(res.error || 'Failed to retrieve verification submissions.');
      }
    } catch {
      setError('Connection failure loading verification requests.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      fetchSubmissions();
    }, [fetchSubmissions])
  );

  // =========================================================================
  // 1. ROLE GUARD: NON-ADMIN ACCESS RESTRICTION
  // =========================================================================
  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
        <ArenaHeader
          title="MAIDAAN"
          subtitle="ADMIN DESK // ACCESS RESTRICTION"
          showBack
          onBack={() => router.replace('/(tabs)/discover')}
        />
        <View className="flex-1 items-center justify-center p-6 bg-warm-white">
          <View className="w-16 h-16 rounded-full bg-rust/10 items-center justify-center border border-rust/30 mb-5">
            <Ionicons name="shield-outline" size={28} color="#875646" />
          </View>

          <ArenaBadge label="ADMIN ACCESS REQUIRED" variant="rust" size="md" />

          <Text className="text-graphite text-lg font-black uppercase tracking-tight text-center mt-3">
            ADMIN ACCESS REQUIRED
          </Text>

          <Text className="text-stone-muted text-sm text-center mt-2 max-w-[310px] leading-5">
            This review desk is restricted to Maidaan administrators. Public accounts cannot access platform verification queues.
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
  // 2. COUNTS & FILTERING DERIVATIONS
  // =========================================================================
  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;
  const approvedCount = submissions.filter((s) => s.status === 'APPROVED').length;
  const declinedCount = submissions.filter((s) => s.status === 'REJECTED').length;

  const displayedSubmissions = useMemo(() => {
    switch (activeFilter) {
      case 'PENDING':
        return submissions.filter((s) => s.status === 'PENDING');
      case 'APPROVED':
        return submissions.filter((s) => s.status === 'APPROVED');
      case 'REJECTED':
        return submissions.filter((s) => s.status === 'REJECTED');
      case 'ALL':
      default:
        return submissions;
    }
  }, [submissions, activeFilter]);

  // =========================================================================
  // 3. ACTION HANDLERS (LIVE BACKEND TRANSACTIONS)
  // =========================================================================
  const handleOpenConfirm = (type: 'approve' | 'decline', submission: HubVerificationRequest) => {
    setConfirmModal({ type, submission });
    setAdminNoteInput(submission.adminNote || '');
  };

  const handleConfirmDecision = async () => {
    if (!confirmModal) return;
    const { type, submission } = confirmModal;

    try {
      setProcessingId(submission.id);

      const action = type === 'approve' ? 'APPROVE' : 'REJECT';
      const trimmedNote = adminNoteInput.trim().slice(0, 300);

      const res = await adminService.reviewHubVerification(
        submission.id,
        action,
        trimmedNote || undefined
      );

      if (res.status === 409) {
        Alert.alert(
          'Notice',
          'This verification request has already been reviewed.'
        );
        await fetchSubmissions();
        setConfirmModal(null);
        setAdminNoteInput('');
        setInspectSubmission(null);
        return;
      }

      if (res.error) {
        Alert.alert('Action Failed', res.error);
        return;
      }

      // Success: refetch latest authoritative data from server
      await fetchSubmissions();
      setConfirmModal(null);
      setAdminNoteInput('');
      if (inspectSubmission?.id === submission.id) {
        setInspectSubmission(null);
      }
    } catch {
      Alert.alert('Network Error', 'Unable to execute decision. Please check your connection.');
    } finally {
      setProcessingId(null);
    }
  };

  // =========================================================================
  // 4. MAIN SCREEN RENDER
  // =========================================================================
  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
      {/* Header */}
      <ArenaHeader
        title="HUB VERIFICATION"
        subtitle="ADMIN DESK // FACILITY REVIEWS"
        showBack
        onBack={() => router.replace('/admin/dashboard')}
        rightAction={
          <ArenaBadge label="LIVE QUEUE" variant="stone" size="sm" />
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        {/* RESTRAINED FACILITY VERIFICATION BANNER */}
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
                  FACILITY APPROVAL DESK
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-warm-white text-sm font-black uppercase tracking-tight"
                >
                  HUB SUBMISSION AUDIT
                </Text>
              </View>
              <ArenaBadge
                label={`${pendingCount} PENDING`}
                variant="rust"
                size="sm"
              />
            </View>
          </View>
        </View>

        {/* PAGE TITLE & INSTRUCTIONS */}
        <View className="px-4 pt-3 pb-1">
          <Text className="text-graphite text-xl font-black uppercase tracking-tight">
            FACILITY SUBMISSIONS
          </Text>
          <Text className="text-stone-muted text-xs leading-4 mt-0.5">
            Audit Hub Owner profile submissions for platform onboarding. Verify location details, declared court capacity, and supported sports.
          </Text>
        </View>

        {/* LOADING INDICATOR */}
        {loading && (
          <View className="mx-4 mt-3 p-4 bg-white rounded-sm border border-stone flex-row items-center justify-center">
            <ActivityIndicator size="small" color="#3D4438" />
            <Text className="text-stone-muted text-xs font-mono ml-3">
              RETRIEVING FACILITY SUBMISSIONS...
            </Text>
          </View>
        )}

        {/* ERROR STATE WITH RETRY */}
        {error && !loading && (
          <View className="mx-4 mt-3 p-4 bg-rust/10 rounded-sm border border-rust/30">
            <View className="flex-row items-center mb-1.5">
              <Ionicons name="alert-circle-outline" size={18} color="#875646" />
              <Text className="text-rust text-xs font-black uppercase tracking-tight ml-2">
                RETRIEVAL ERROR
              </Text>
            </View>
            <Text className="text-stone-muted text-xs leading-4 mb-3">
              {error}
            </Text>
            <PrimaryButton
              title="RETRY"
              variant="outline"
              onPress={fetchSubmissions}
            />
          </View>
        )}

        {/* ================================================================= */}
        {/* SUMMARY STRIP */}
        {/* ================================================================= */}
        <View className="px-4 mt-3">
          <View className="flex-row gap-2">
            {/* PENDING */}
            <Pressable
              onPress={() => setActiveFilter('PENDING')}
              className={`flex-1 rounded-sm p-3 border ${
                activeFilter === 'PENDING'
                  ? 'bg-rust/15 border-rust'
                  : 'bg-stone/20 border-stone'
              }`}
            >
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider font-bold">
                PENDING
              </Text>
              <Text className="text-rust text-xl font-black tracking-tight mt-0.5">
                {pendingCount}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium">
                Awaiting review
              </Text>
            </Pressable>

            {/* APPROVED */}
            <Pressable
              onPress={() => setActiveFilter('APPROVED')}
              className={`flex-1 rounded-sm p-3 border ${
                activeFilter === 'APPROVED'
                  ? 'bg-arena-olive/20 border-arena-olive'
                  : 'bg-stone/20 border-stone'
              }`}
            >
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider font-bold">
                APPROVED
              </Text>
              <Text className="text-arena-olive text-xl font-black tracking-tight mt-0.5">
                {approvedCount}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium">
                Platform clear
              </Text>
            </Pressable>

            {/* REJECTED */}
            <Pressable
              onPress={() => setActiveFilter('REJECTED')}
              className={`flex-1 rounded-sm p-3 border ${
                activeFilter === 'REJECTED'
                  ? 'bg-stone/40 border-graphite'
                  : 'bg-stone/20 border-stone'
              }`}
            >
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider font-bold">
                DECLINED
              </Text>
              <Text className="text-graphite text-xl font-black tracking-tight mt-0.5">
                {declinedCount}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium">
                Needs revision
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ================================================================= */}
        {/* FILTER CHIPS */}
        {/* ================================================================= */}
        <View className="px-4 mt-4">
          <View className="flex-row space-x-1.5 bg-stone/20 p-1 rounded-sm border border-stone">
            {(
              [
                { id: 'PENDING', label: `PENDING (${pendingCount})` },
                { id: 'APPROVED', label: `APPROVED (${approvedCount})` },
                { id: 'REJECTED', label: `DECLINED (${declinedCount})` },
                { id: 'ALL', label: `ALL (${submissions.length})` },
              ] as const
            ).map((tab) => {
              const isSelected = activeFilter === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveFilter(tab.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${tab.label}`}
                  className={`flex-1 py-1.5 items-center justify-center rounded-xs ${
                    isSelected ? 'bg-graphite shadow-2xs' : 'bg-transparent'
                  }`}
                >
                  <Text
                    numberOfLines={1}
                    className={`text-[10px] font-mono uppercase tracking-wider ${
                      isSelected ? 'text-warm-white font-black' : 'text-stone-muted font-bold'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ================================================================= */}
        {/* SUBMISSION LISTING SECTION */}
        {/* ================================================================= */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold">
              VERIFICATION SUBMISSIONS
            </Text>
            <Text className="text-stone-muted text-[10px] font-mono">
              {displayedSubmissions.length} LISTED
            </Text>
          </View>

          {/* EMPTY STATE */}
          {displayedSubmissions.length === 0 && !loading ? (
            <View className="bg-white rounded-sm p-6 border border-stone items-center my-2 shadow-2xs">
              <View className="w-12 h-12 rounded-full bg-stone/20 border border-stone items-center justify-center mb-3">
                <Ionicons name="business-outline" size={24} color="#666B60" />
              </View>

              <Text className="text-graphite text-sm font-black uppercase tracking-tight text-center">
                {activeFilter === 'PENDING'
                  ? 'NO HUBS WAITING FOR REVIEW'
                  : 'NO HUB SUBMISSIONS'}
              </Text>

              <Text className="text-stone-muted text-xs text-center mt-1 max-w-[260px] leading-4">
                {activeFilter === 'PENDING'
                  ? 'New Hub Owner verification submissions will appear here.'
                  : `No Hub submissions matching the "${activeFilter}" filter.`}
              </Text>

              <View className="mt-4 w-full max-w-[220px]">
                <PrimaryButton
                  title="RETURN TO ADMIN DESK"
                  variant="outline"
                  onPress={() => router.replace('/admin/dashboard')}
                />
              </View>
            </View>
          ) : (
            displayedSubmissions.map((sub) => {
              const isPending = sub.status === 'PENDING';
              const isApproved = sub.status === 'APPROVED';
              const isRejected = sub.status === 'REJECTED';
              const isBusy = processingId === sub.id;

              return (
                <View
                  key={sub.id}
                  className="bg-white rounded-sm p-4 border border-stone mb-3 shadow-2xs"
                >
                  {/* Top Bar: Hub Name & Status Badge */}
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-1 pr-2">
                      <Text
                        numberOfLines={1}
                        className="text-graphite text-base font-black uppercase tracking-tight"
                      >
                        {sub.hubName}
                      </Text>
                      <Text className="text-stone-muted text-xs font-mono">
                        OWNER ID: {sub.hubOwnerId.substring(0, 8)}...
                      </Text>
                    </View>

                    <ArenaBadge
                      label={isPending ? 'PENDING' : isApproved ? 'APPROVED' : 'DECLINED'}
                      variant={isPending ? 'rust' : isApproved ? 'olive' : 'stone'}
                      size="sm"
                    />
                  </View>

                  {/* Location & Capacity */}
                  <View className="flex-row items-center mt-1 mb-2">
                    <Ionicons name="location-outline" size={13} color="#666B60" />
                    <Text className="text-graphite text-xs font-medium ml-1 flex-1" numberOfLines={1}>
                      {sub.location}
                    </Text>
                    <View className="flex-row items-center ml-2 bg-stone/20 px-2 py-0.5 rounded-xs border border-stone">
                      <Ionicons name="grid-outline" size={11} color="#242522" />
                      <Text className="text-graphite text-[10px] font-mono font-bold ml-1">
                        {sub.courtCount} COURTS
                      </Text>
                    </View>
                  </View>

                  {/* Sports Chips */}
                  <View className="flex-row flex-wrap gap-1.5 mb-2.5">
                    {sub.sports.map((sport) => {
                      const meta = SPORT_META[sport];
                      return (
                        <View
                          key={sport}
                          className="flex-row items-center bg-stone/20 px-2 py-0.5 rounded-xs border border-stone/50"
                        >
                          <MaterialCommunityIcons
                            name={meta?.icon || 'tennis'}
                            size={11}
                            color="#242522"
                          />
                          <Text className="text-graphite text-[10px] font-mono uppercase font-bold ml-1">
                            {meta?.label || sport}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Optional Contact Number */}
                  {sub.contactNumber ? (
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="call-outline" size={12} color="#666B60" />
                      <Text className="text-stone-muted text-[11px] font-mono ml-1.5">
                        {sub.contactNumber}
                      </Text>
                    </View>
                  ) : null}

                  {/* Persisted Admin Note if present */}
                  {sub.adminNote ? (
                    <View className="bg-stone/15 p-2 rounded-xs border border-stone/40 mb-2.5">
                      <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                        ADMIN AUDIT NOTE
                      </Text>
                      <Text className="text-graphite text-xs leading-4 mt-0.5">
                        {sub.adminNote}
                      </Text>
                    </View>
                  ) : null}

                  {/* Timestamp & Metadata Footer */}
                  <View className="flex-row items-center justify-between pt-2 border-t border-stone/20">
                    <Text className="text-stone-muted text-[9px] font-mono">
                      REF: {sub.id.substring(0, 8).toUpperCase()}
                    </Text>
                    <Text className="text-stone-muted text-[9px] font-mono">
                      SUBMITTED: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'RECENT'}
                    </Text>
                  </View>

                  {/* ACTION CONTROLS */}
                  {isPending ? (
                    <View className="flex-row gap-2 mt-3 pt-2.5 border-t border-stone/30">
                      <Pressable
                        onPress={() => setInspectSubmission(sub)}
                        disabled={isBusy}
                        className="py-2.5 px-3 rounded-xs bg-stone/20 border border-stone items-center justify-center active:bg-stone/40"
                      >
                        <Ionicons name="eye-outline" size={15} color="#242522" />
                      </Pressable>

                      <Pressable
                        onPress={() => handleOpenConfirm('decline', sub)}
                        disabled={isBusy}
                        className={`flex-1 py-2.5 rounded-xs border border-rust/40 items-center justify-center active:bg-rust/20 ${
                          isBusy ? 'opacity-50' : 'bg-rust/10'
                        }`}
                      >
                        <Text className="text-rust text-xs font-bold uppercase tracking-wider">
                          DECLINE
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleOpenConfirm('approve', sub)}
                        disabled={isBusy}
                        className={`flex-1 py-2.5 rounded-xs border border-arena-olive items-center justify-center active:bg-olive-dark ${
                          isBusy ? 'opacity-50' : 'bg-arena-olive'
                        }`}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#F4F1EA" />
                        ) : (
                          <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                            APPROVE
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-stone/30">
                      <View className="flex-row items-center">
                        <Ionicons
                          name={isApproved ? 'shield-checkmark-outline' : 'close-circle-outline'}
                          size={14}
                          color={isApproved ? '#3D4438' : '#875646'}
                        />
                        <Text
                          className={`text-[10px] font-mono uppercase font-bold ml-1.5 ${
                            isApproved ? 'text-arena-olive' : 'text-rust'
                          }`}
                        >
                          {isApproved ? 'VERIFIED VENUE' : 'DECLINED'}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => setInspectSubmission(sub)}
                        className="py-1 px-2.5 rounded-xs bg-stone/20 border border-stone"
                      >
                        <Text className="text-graphite text-[10px] font-mono font-bold uppercase">
                          VIEW AUDIT SHEET
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ===================================================================== */}
      {/* CONFIRMATION DECISION MODAL */}
      {/* ===================================================================== */}
      <Modal
        visible={!!confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!processingId) {
            setConfirmModal(null);
            setAdminNoteInput('');
          }
        }}
      >
        <View className="flex-1 bg-graphite/80 items-center justify-center p-5">
          <View className="w-full max-w-[340px] bg-warm-white rounded-sm p-5 border border-stone shadow-lg">
            {confirmModal ? (
              <>
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center mb-3 border ${
                    confirmModal.type === 'approve'
                      ? 'bg-arena-olive border-arena-olive'
                      : 'bg-rust/20 border-rust'
                  }`}
                >
                  <Ionicons
                    name={
                      confirmModal.type === 'approve'
                        ? 'checkmark-outline'
                        : 'close-outline'
                    }
                    size={24}
                    color={confirmModal.type === 'approve' ? '#F4F1EA' : '#875646'}
                  />
                </View>

                <ArenaBadge
                  label={
                    confirmModal.type === 'approve'
                      ? 'ADMIN APPROVAL AUDIT'
                      : 'DECLINE SUBMISSION'
                  }
                  variant={confirmModal.type === 'approve' ? 'olive' : 'rust'}
                  size="sm"
                />

                <Text className="text-graphite text-lg font-black uppercase tracking-tight mt-2">
                  {confirmModal.type === 'approve'
                    ? `APPROVE ${confirmModal.submission.hubName}?`
                    : `DECLINE SUBMISSION?`}
                </Text>

                <Text className="text-stone-muted text-xs leading-4 mt-1">
                  {confirmModal.type === 'approve'
                    ? 'This will verify the hub in the database. The hub profile is cleared for discovery.'
                    : `Decline ${confirmModal.submission.hubName}'s onboarding verification request.`}
                </Text>

                {/* Submissions summary snapshot */}
                <View className="my-3 p-2.5 bg-white rounded-xs border border-stone">
                  <Text className="text-graphite text-xs font-black uppercase" numberOfLines={1}>
                    {confirmModal.submission.hubName}
                  </Text>
                  <Text className="text-stone-muted text-[10px] font-mono mt-0.5">
                    {confirmModal.submission.location} • {confirmModal.submission.courtCount} COURTS
                  </Text>
                </View>

                {/* Optional Admin Note input if declining */}
                {confirmModal.type === 'decline' ? (
                  <View className="mb-3">
                    <Text className="text-stone-muted text-[10px] font-mono uppercase font-bold mb-1">
                      ADMIN NOTE (OPTIONAL)
                    </Text>
                    <TextInput
                      value={adminNoteInput}
                      onChangeText={setAdminNoteInput}
                      maxLength={300}
                      editable={!processingId}
                      placeholder="e.g. Venue details need clarification..."
                      placeholderTextColor="#A0A59A"
                      className="bg-white border border-stone p-2 rounded-xs text-graphite text-xs min-h-[38px]"
                    />
                    <Text className="text-stone-muted text-[9px] font-mono text-right mt-0.5">
                      {adminNoteInput.length}/300
                    </Text>
                  </View>
                ) : null}

                {/* Actions */}
                <View className="space-y-2 mt-1">
                  <PrimaryButton
                    title={
                      processingId
                        ? 'SAVING DECISION...'
                        : confirmModal.type === 'approve'
                        ? 'CONFIRM APPROVAL'
                        : 'CONFIRM DECLINE'
                    }
                    variant={confirmModal.type === 'approve' ? 'primary' : 'rust'}
                    onPress={handleConfirmDecision}
                  />

                  <Pressable
                    onPress={() => {
                      if (!processingId) {
                        setConfirmModal(null);
                        setAdminNoteInput('');
                      }
                    }}
                    disabled={!!processingId}
                    className="py-2.5 items-center mt-1"
                  >
                    <Text className="text-stone-muted text-xs font-bold uppercase tracking-wider">
                      CANCEL
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ===================================================================== */}
      {/* INLINE SUBMISSION SHEET INSPECTION MODAL */}
      {/* ===================================================================== */}
      <Modal
        visible={!!inspectSubmission}
        transparent
        animationType="slide"
        onRequestClose={() => setInspectSubmission(null)}
      >
        <View className="flex-1 bg-graphite/80 justify-end">
          <View className="bg-warm-white rounded-t-lg p-5 border-t border-stone max-h-[85%]">
            {inspectSubmission ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row items-center justify-between pb-3 border-b border-stone/30">
                  <View className="flex-1 pr-2">
                    <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                      SUBMISSION AUDIT SHEET
                    </Text>
                    <Text className="text-graphite text-base font-black uppercase tracking-tight mt-0.5">
                      {inspectSubmission.hubName}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setInspectSubmission(null)}
                    className="w-8 h-8 rounded-xs bg-stone/20 items-center justify-center border border-stone"
                  >
                    <Ionicons name="close" size={18} color="#242522" />
                  </Pressable>
                </View>

                {/* Fields Table */}
                <View className="mt-3 bg-white rounded-sm border border-stone p-3.5 space-y-2.5">
                  <View>
                    <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                      HUB IDENTIFIER
                    </Text>
                    <Text className="text-graphite text-xs font-mono font-bold mt-0.5">
                      {inspectSubmission.id}
                    </Text>
                  </View>

                  <View className="pt-2 border-t border-stone/20">
                    <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                      VENUE OPERATOR USER ID
                    </Text>
                    <Text className="text-graphite text-xs font-mono mt-0.5">
                      {inspectSubmission.hubOwnerId}
                    </Text>
                    {inspectSubmission.contactNumber ? (
                      <Text className="text-stone-muted text-[11px] font-mono mt-0.5">
                        TEL: {inspectSubmission.contactNumber}
                      </Text>
                    ) : null}
                  </View>

                  <View className="pt-2 border-t border-stone/20">
                    <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                      GROUND LOCALITY
                    </Text>
                    <Text className="text-graphite text-xs font-bold mt-0.5">
                      {inspectSubmission.location}
                    </Text>
                  </View>

                  <View className="pt-2 border-t border-stone/20">
                    <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                      DECLARED PLAYING SPACES
                    </Text>
                    <Text className="text-graphite text-xs font-bold mt-0.5">
                      {inspectSubmission.courtCount} Playing Courts / Pitches
                    </Text>
                  </View>

                  <View className="pt-2 border-t border-stone/20">
                    <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold mb-1">
                      SUPPORTED SPORTS
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {inspectSubmission.sports.map((sp) => (
                        <View
                          key={sp}
                          className="flex-row items-center bg-stone/20 px-2 py-0.5 rounded-xs border border-stone/60"
                        >
                          <MaterialCommunityIcons
                            name={SPORT_META[sp]?.icon || 'tennis'}
                            size={12}
                            color="#242522"
                          />
                          <Text className="text-graphite text-[10px] font-mono uppercase font-bold ml-1">
                            {SPORT_META[sp]?.label || sp}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {inspectSubmission.adminNote ? (
                    <View className="pt-2 border-t border-stone/20">
                      <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                        RECORDED AUDIT NOTE
                      </Text>
                      <Text className="text-graphite text-xs mt-0.5">
                        {inspectSubmission.adminNote}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Audit Context notice */}
                <View className="mt-3 p-3 bg-stone/20 rounded-sm border border-stone">
                  <Text className="text-stone-muted text-[10px] font-mono leading-4">
                    NOTE: Maidaan Hub verification clears the Hub profile submission for platform discovery and matchmaking. It verifies declared court parameters under platform standards.
                  </Text>
                </View>

                {/* Bottom Actions if pending */}
                {inspectSubmission.status === 'PENDING' ? (
                  <View className="flex-row gap-2 mt-4">
                    <Pressable
                      onPress={() => {
                        handleOpenConfirm('decline', inspectSubmission);
                      }}
                      className="flex-1 py-3 rounded-xs bg-warm-white border border-stone items-center justify-center active:bg-stone/20"
                    >
                      <Text className="text-graphite text-xs font-bold uppercase tracking-wide">
                        DECLINE
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        handleOpenConfirm('approve', inspectSubmission);
                      }}
                      className="flex-1 py-3 rounded-xs bg-arena-olive border border-arena-olive items-center justify-center active:bg-olive-dark"
                    >
                      <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                        APPROVE
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="mt-4">
                    <PrimaryButton
                      title="CLOSE AUDIT SHEET"
                      variant="outline"
                      onPress={() => setInspectSubmission(null)}
                    />
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
