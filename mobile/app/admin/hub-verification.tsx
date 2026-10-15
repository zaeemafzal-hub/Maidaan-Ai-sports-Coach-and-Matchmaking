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
import { Sport, HubVerificationRequest } from '../../types';
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
      <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top']}>
        <ArenaHeader
          title="Hub Verification"
          subtitle="Access Restriction"
          showBack
          onBack={() => router.replace('/(tabs)/discover')}
        />
        <View className="flex-1 items-center justify-center p-6 bg-[#171A1D]">
          <View className="w-16 h-16 rounded-full bg-[#F4A261]/10 items-center justify-center border border-[#F4A261]/30 mb-5">
            <Ionicons name="shield-outline" size={28} color="#F4A261" />
          </View>

          <ArenaBadge label="ADMIN REQUIRED" variant="rust" size="md" />

          <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight text-center mt-3">
            Admin Access Required
          </Text>

          <Text className="text-[#A0A5AD] text-sm text-center mt-2 max-w-[310px] leading-5">
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
  // 3. ACTION HANDLERS
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

  return (
    <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top']}>
      {/* Modern Athletic Header */}
      <ArenaHeader
        title="Hub Verification"
        subtitle="Facility Onboarding Reviews"
        showBack
        onBack={() => router.replace('/admin/dashboard')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        {/* Banner */}
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
                  Facility Approval Desk
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-[#F4F6F7] text-base font-black uppercase tracking-tight"
                >
                  Hub Submissions Audit
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

        {/* Page Title & Context */}
        <View className="px-4 pt-3 pb-1">
          <Text className="text-[#F4F6F7] text-xl font-black uppercase tracking-tight">
            Facility Submissions
          </Text>
          <Text className="text-[#A0A5AD] text-xs leading-4 mt-0.5">
            Audit Hub Owner profile submissions for platform onboarding. Verify location details, declared court capacity, and supported sports.
          </Text>
        </View>

        {/* LOADING INDICATOR */}
        {loading && (
          <View className="mx-4 mt-3 p-4 bg-[#1F2327] rounded-2xl border border-white/10 flex-row items-center justify-center">
            <ActivityIndicator size="small" color="#E85D26" />
            <Text className="text-[#A0A5AD] text-xs font-mono ml-3">
              Retrieving facility submissions...
            </Text>
          </View>
        )}

        {/* ERROR STATE WITH RETRY */}
        {error && !loading && (
          <View className="mx-4 mt-3 p-4 bg-[#F4A261]/10 rounded-2xl border border-[#F4A261]/30">
            <View className="flex-row items-center mb-1.5">
              <Ionicons name="alert-circle-outline" size={18} color="#F4A261" />
              <Text className="text-[#F4A261] text-xs font-black uppercase tracking-tight ml-2">
                Retrieval Error
              </Text>
            </View>
            <Text className="text-[#A0A5AD] text-xs leading-4 mb-3">
              {error}
            </Text>
            <PrimaryButton
              title="RETRY"
              variant="outline"
              onPress={fetchSubmissions}
            />
          </View>
        )}

        {/* SUMMARY STRIP */}
        <View className="px-4 mt-3">
          <View className="flex-row gap-2">
            {/* PENDING */}
            <Pressable
              onPress={() => setActiveFilter('PENDING')}
              className={`flex-1 rounded-2xl p-3.5 border ${
                activeFilter === 'PENDING'
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
              <Text className="text-[#A0A5AD] text-[10px] font-medium">
                Awaiting review
              </Text>
            </Pressable>

            {/* APPROVED */}
            <Pressable
              onPress={() => setActiveFilter('APPROVED')}
              className={`flex-1 rounded-2xl p-3.5 border ${
                activeFilter === 'APPROVED'
                  ? 'bg-[#E85D26]/15 border-[#E85D26]'
                  : 'bg-[#1F2327] border-white/10'
              }`}
            >
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-wider font-bold">
                APPROVED
              </Text>
              <Text className="text-[#E85D26] text-2xl font-black tracking-tight mt-0.5">
                {approvedCount}
              </Text>
              <Text className="text-[#A0A5AD] text-[10px] font-medium">
                Verified
              </Text>
            </Pressable>

            {/* REJECTED */}
            <Pressable
              onPress={() => setActiveFilter('REJECTED')}
              className={`flex-1 rounded-2xl p-3.5 border ${
                activeFilter === 'REJECTED'
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
              <Text className="text-[#7F8993] text-[10px] font-medium">
                Rejected
              </Text>
            </Pressable>
          </View>
        </View>

        {/* FILTER CHIPS */}
        <View className="px-4 mt-4">
          <View className="flex-row space-x-1.5 bg-[#1F2327] p-1 rounded-xl border border-white/10">
            {(
              [
                { id: 'PENDING', label: `Pending (${pendingCount})` },
                { id: 'APPROVED', label: `Approved (${approvedCount})` },
                { id: 'REJECTED', label: `Declined (${declinedCount})` },
                { id: 'ALL', label: `All (${submissions.length})` },
              ] as const
            ).map((tab) => {
              const isSelected = activeFilter === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveFilter(tab.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${tab.label}`}
                  className={`flex-1 py-2 items-center justify-center rounded-lg ${
                    isSelected ? 'bg-[#E85D26]' : 'bg-transparent'
                  }`}
                >
                  <Text
                    numberOfLines={1}
                    className={`text-[10px] uppercase font-bold ${
                      isSelected ? 'text-[#171A1D]' : 'text-[#A0A5AD]'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* SUBMISSION LISTING SECTION */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold">
              Verification Submissions
            </Text>
            <Text className="text-[#7F8993] text-[10px] font-mono">
              {displayedSubmissions.length} Listed
            </Text>
          </View>

          {/* EMPTY STATE */}
          {displayedSubmissions.length === 0 && !loading ? (
            <View className="bg-[#1F2327] rounded-2xl p-6 border border-white/10 items-center my-2">
              <View className="w-12 h-12 rounded-full bg-[#272C31] border border-white/10 items-center justify-center mb-3">
                <Ionicons name="business-outline" size={24} color="#A0A5AD" />
              </View>

              <Text className="text-[#F4F6F7] text-sm font-black uppercase tracking-tight text-center">
                {activeFilter === 'PENDING'
                  ? 'No Hubs Waiting for Review'
                  : 'No Hub Submissions'}
              </Text>

              <Text className="text-[#A0A5AD] text-xs text-center mt-1 max-w-[260px] leading-4">
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
              const isBusy = processingId === sub.id;

              return (
                <View
                  key={sub.id}
                  className="bg-[#1F2327] rounded-2xl p-4 border border-white/10 mb-3 shadow-sm"
                >
                  {/* Top Bar: Hub Name & Status Badge */}
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-1 pr-2">
                      <Text
                        numberOfLines={1}
                        className="text-[#F4F6F7] text-base font-black uppercase tracking-tight"
                      >
                        {sub.hubName}
                      </Text>
                      <Text className="text-[#7F8993] text-xs font-mono">
                        Owner ID: {sub.hubOwnerId.substring(0, 8)}...
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
                    <Ionicons name="location-outline" size={14} color="#A0A5AD" />
                    <Text className="text-[#A0A5AD] text-xs font-medium ml-1 flex-1" numberOfLines={1}>
                      {sub.location}
                    </Text>
                    <View className="flex-row items-center ml-2 bg-[#272C31] px-2.5 py-0.5 rounded-lg border border-white/10">
                      <Ionicons name="grid-outline" size={11} color="#E85D26" />
                      <Text className="text-[#E85D26] text-[10px] font-mono font-bold ml-1">
                        {sub.courtCount} Courts
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
                          className="flex-row items-center bg-[#272C31] px-2.5 py-1 rounded-lg border border-white/10"
                        >
                          <MaterialCommunityIcons
                            name={meta?.icon || 'tennis'}
                            size={11}
                            color="#E85D26"
                          />
                          <Text className="text-[#F4F6F7] text-[10px] font-bold ml-1">
                            {meta?.label || sport}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Optional Contact Number */}
                  {sub.contactNumber ? (
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="call-outline" size={13} color="#A0A5AD" />
                      <Text className="text-[#A0A5AD] text-xs font-mono ml-1.5">
                        {sub.contactNumber}
                      </Text>
                    </View>
                  ) : null}

                  {/* Persisted Admin Note if present */}
                  {sub.adminNote ? (
                    <View className="bg-[#272C31] p-2.5 rounded-xl border border-white/5 mb-2.5">
                      <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold">
                        Admin Note
                      </Text>
                      <Text className="text-[#F4F6F7] text-xs leading-4 mt-0.5">
                        {sub.adminNote}
                      </Text>
                    </View>
                  ) : null}

                  {/* Timestamp & Metadata Footer */}
                  <View className="flex-row items-center justify-between pt-2 border-t border-white/5">
                    <Text className="text-[#7F8993] text-[10px] font-mono">
                      REF: {sub.id.substring(0, 8).toUpperCase()}
                    </Text>
                    <Text className="text-[#7F8993] text-[10px] font-mono">
                      SUBMITTED: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'RECENT'}
                    </Text>
                  </View>

                  {/* ACTION CONTROLS */}
                  {isPending ? (
                    <View className="flex-row gap-2 mt-3 pt-2.5 border-t border-white/5">
                      <Pressable
                        onPress={() => setInspectSubmission(sub)}
                        disabled={isBusy}
                        className="py-2.5 px-3.5 rounded-xl bg-[#272C31] border border-white/10 items-center justify-center active:bg-white/5"
                      >
                        <Ionicons name="eye-outline" size={16} color="#F4F6F7" />
                      </Pressable>

                      <Pressable
                        onPress={() => handleOpenConfirm('decline', sub)}
                        disabled={isBusy}
                        className={`flex-1 py-2.5 rounded-xl border border-[#F4A261]/30 items-center justify-center active:bg-[#F4A261]/20 ${
                          isBusy ? 'opacity-50' : 'bg-[#F4A261]/10'
                        }`}
                      >
                        <Text className="text-[#F4A261] text-xs font-bold uppercase tracking-wider">
                          Decline
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleOpenConfirm('approve', sub)}
                        disabled={isBusy}
                        className={`flex-1 py-2.5 rounded-xl border border-[#E85D26] items-center justify-center active:opacity-90 ${
                          isBusy ? 'opacity-50' : 'bg-[#E85D26]'
                        }`}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#171A1D" />
                        ) : (
                          <Text className="text-[#171A1D] text-xs font-black uppercase tracking-wider">
                            Approve
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-white/5">
                      <View className="flex-row items-center">
                        <Ionicons
                          name={isApproved ? 'shield-checkmark-outline' : 'close-circle-outline'}
                          size={15}
                          color={isApproved ? '#E85D26' : '#F4A261'}
                        />
                        <Text
                          className={`text-xs font-bold uppercase ml-1.5 ${
                            isApproved ? 'text-[#E85D26]' : 'text-[#F4A261]'
                          }`}
                        >
                          {isApproved ? 'Verified Venue' : 'Declined'}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => setInspectSubmission(sub)}
                        className="py-1 px-3 rounded-lg bg-[#272C31] border border-white/10"
                      >
                        <Text className="text-[#F4F6F7] text-xs font-bold">
                          View Details
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

      {/* CONFIRMATION DECISION MODAL */}
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
        <View className="flex-1 bg-[#171A1D]/85 items-center justify-center p-5">
          <View className="w-full max-w-[340px] bg-[#1F2327] rounded-2xl p-6 border border-white/10 shadow-2xl">
            {confirmModal ? (
              <>
                <View
                  className={`w-12 h-12 rounded-xl items-center justify-center mb-3 ${
                    confirmModal.type === 'approve'
                      ? 'bg-[#E85D26]'
                      : 'bg-[#F4A261]/20 border border-[#F4A261]/30'
                  }`}
                >
                  <Ionicons
                    name={
                      confirmModal.type === 'approve'
                        ? 'checkmark-outline'
                        : 'close-outline'
                    }
                    size={24}
                    color={confirmModal.type === 'approve' ? '#171A1D' : '#F4A261'}
                  />
                </View>

                <ArenaBadge
                  label={
                    confirmModal.type === 'approve'
                      ? 'ADMIN APPROVAL'
                      : 'DECLINE SUBMISSION'
                  }
                  variant={confirmModal.type === 'approve' ? 'olive' : 'rust'}
                  size="sm"
                />

                <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight mt-2">
                  {confirmModal.type === 'approve'
                    ? `Approve ${confirmModal.submission.hubName}?`
                    : `Decline Submission?`}
                </Text>

                <Text className="text-[#A0A5AD] text-xs leading-4 mt-1">
                  {confirmModal.type === 'approve'
                    ? 'This will verify the hub in the database. The hub profile is cleared for discovery.'
                    : `Decline ${confirmModal.submission.hubName}'s onboarding verification request.`}
                </Text>

                {/* Submissions summary snapshot */}
                <View className="my-3 p-3 bg-[#272C31] rounded-xl border border-white/10">
                  <Text className="text-[#F4F6F7] text-xs font-black uppercase" numberOfLines={1}>
                    {confirmModal.submission.hubName}
                  </Text>
                  <Text className="text-[#A0A5AD] text-xs font-mono mt-0.5">
                    {confirmModal.submission.location} • {confirmModal.submission.courtCount} Courts
                  </Text>
                </View>

                {/* Optional Admin Note input if declining */}
                {confirmModal.type === 'decline' ? (
                  <View className="mb-3">
                    <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold mb-1.5">
                      Admin Note (Optional)
                    </Text>
                    <TextInput
                      value={adminNoteInput}
                      onChangeText={setAdminNoteInput}
                      maxLength={300}
                      editable={!processingId}
                      placeholder="e.g. Venue details need clarification..."
                      placeholderTextColor="#7F8993"
                      className="bg-[#272C31] border border-white/10 p-2.5 rounded-xl text-[#F4F6F7] text-xs min-h-[42px]"
                    />
                    <Text className="text-[#7F8993] text-[9px] font-mono text-right mt-1">
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

      {/* INLINE SUBMISSION SHEET INSPECTION MODAL */}
      <Modal
        visible={!!inspectSubmission}
        transparent
        animationType="slide"
        onRequestClose={() => setInspectSubmission(null)}
      >
        <View className="flex-1 bg-[#171A1D]/85 justify-end">
          <View className="bg-[#1F2327] rounded-t-3xl p-6 border-t border-white/10 max-h-[85%]">
            {inspectSubmission ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row items-center justify-between pb-3 border-b border-white/5">
                  <View className="flex-1 pr-2">
                    <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold">
                      Submission Audit Sheet
                    </Text>
                    <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight mt-0.5">
                      {inspectSubmission.hubName}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setInspectSubmission(null)}
                    className="w-9 h-9 rounded-xl bg-[#272C31] items-center justify-center border border-white/10"
                  >
                    <Ionicons name="close" size={20} color="#F4F6F7" />
                  </Pressable>
                </View>

                {/* Fields Table */}
                <View className="mt-4 bg-[#272C31] rounded-2xl border border-white/10 p-4 space-y-3">
                  <View>
                    <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold">
                      Hub Identifier
                    </Text>
                    <Text className="text-[#F4F6F7] text-xs font-mono font-bold mt-0.5">
                      {inspectSubmission.id}
                    </Text>
                  </View>

                  <View className="pt-2 border-t border-white/5">
                    <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold">
                      Venue Operator ID
                    </Text>
                    <Text className="text-[#F4F6F7] text-xs font-mono mt-0.5">
                      {inspectSubmission.hubOwnerId}
                    </Text>
                    {inspectSubmission.contactNumber ? (
                      <Text className="text-[#A0A5AD] text-xs font-mono mt-0.5">
                        TEL: {inspectSubmission.contactNumber}
                      </Text>
                    ) : null}
                  </View>

                  <View className="pt-2 border-t border-white/5">
                    <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold">
                      Ground Locality
                    </Text>
                    <Text className="text-[#F4F6F7] text-xs font-bold mt-0.5">
                      {inspectSubmission.location}
                    </Text>
                  </View>

                  <View className="pt-2 border-t border-white/5">
                    <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold">
                      Declared Playing Spaces
                    </Text>
                    <Text className="text-[#F4F6F7] text-xs font-bold mt-0.5">
                      {inspectSubmission.courtCount} Playing Courts / Pitches
                    </Text>
                  </View>

                  <View className="pt-2 border-t border-white/5">
                    <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold mb-1.5">
                      Supported Sports
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {inspectSubmission.sports.map((sp) => (
                        <View
                          key={sp}
                          className="flex-row items-center bg-[#1F2327] px-2.5 py-1 rounded-lg border border-white/10"
                        >
                          <MaterialCommunityIcons
                            name={SPORT_META[sp]?.icon || 'tennis'}
                            size={12}
                            color="#E85D26"
                          />
                          <Text className="text-[#F4F6F7] text-[10px] font-bold ml-1">
                            {SPORT_META[sp]?.label || sp}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {inspectSubmission.adminNote ? (
                    <View className="pt-2 border-t border-white/5">
                      <Text className="text-[#7F8993] text-[10px] font-mono uppercase font-bold">
                        Recorded Audit Note
                      </Text>
                      <Text className="text-[#F4F6F7] text-xs mt-0.5">
                        {inspectSubmission.adminNote}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Audit Context notice */}
                <View className="mt-3 p-3.5 bg-[#272C31] rounded-xl border border-white/5">
                  <Text className="text-[#7F8993] text-xs leading-4">
                    Maidaan Hub verification clears the Hub profile submission for platform discovery and matchmaking.
                  </Text>
                </View>

                {/* Bottom Actions if pending */}
                {inspectSubmission.status === 'PENDING' ? (
                  <View className="flex-row gap-2 mt-4">
                    <Pressable
                      onPress={() => {
                        handleOpenConfirm('decline', inspectSubmission);
                      }}
                      className="flex-1 py-3 rounded-xl bg-[#272C31] border border-white/10 items-center justify-center active:bg-white/5"
                    >
                      <Text className="text-[#F4F6F7] text-xs font-bold uppercase tracking-wide">
                        Decline
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        handleOpenConfirm('approve', inspectSubmission);
                      }}
                      className="flex-1 py-3 rounded-xl bg-[#E85D26] border border-[#E85D26] items-center justify-center active:opacity-90"
                    >
                      <Text className="text-[#171A1D] text-xs font-black uppercase tracking-wider">
                        Approve
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
