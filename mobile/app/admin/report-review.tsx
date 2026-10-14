import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { IMAGES } from '../../constants/images';
import { AdminReport, ReportCategory, ReportStatus } from '../../types';
import { adminService } from '../../services/adminService';

// =============================================================================
// DOMAIN METADATA CONFIGURATION
// =============================================================================

const CATEGORY_META: Record<
  ReportCategory,
  { label: string; badgeVariant: 'rust' | 'stone' | 'olive'; description: string }
> = {
  CONDUCT: {
    label: 'CONDUCT',
    badgeVariant: 'rust',
    description: 'Player sportsmanship or sideline conduct violation',
  },
  HARASSMENT: {
    label: 'HARASSMENT',
    badgeVariant: 'rust',
    description: 'Verbal aggression or coordinator harassment report',
  },
  UNSAFE_BEHAVIOR: {
    label: 'UNSAFE BEHAVIOR',
    badgeVariant: 'rust',
    description: 'Reckless pitch tackle or equipment safety issue',
  },
  SPAM: {
    label: 'SPAM',
    badgeVariant: 'stone',
    description: 'Repeated unauthorized slot promotion or unsolicited links',
  },
  OTHER: {
    label: 'OTHER',
    badgeVariant: 'stone',
    description: 'General dispute requiring coordinator audit',
  },
};

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; badgeVariant: 'rust' | 'olive' | 'stone'; hint: string }
> = {
  OPEN: {
    label: 'OPEN',
    badgeVariant: 'rust',
    hint: 'Awaiting administrative conduct review',
  },
  FOLLOW_UP: {
    label: 'FOLLOW-UP',
    badgeVariant: 'rust',
    hint: 'Additional coordinator clarification needed',
  },
  RESOLVED: {
    label: 'RESOLVED',
    badgeVariant: 'olive',
    hint: 'Platform review complete; fair play notice recorded',
  },
  DISMISSED: {
    label: 'DISMISSED',
    badgeVariant: 'stone',
    hint: 'No further platform review required',
  },
};

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return dateString;
  }
}

export default function ReportReviewScreen() {
  const { currentUser } = useAuthStore();

  // Strict Admin Role Guard
  const isAdmin = currentUser?.role === 'ADMIN';

  // Live state
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeFilter, setActiveFilter] = useState<'OPEN' | 'FOLLOW_UP' | 'RESOLVED' | 'DISMISSED' | 'ALL'>('OPEN');

  // Confirmation dialog state (resolve, dismiss, or follow_up)
  const [confirmModal, setConfirmModal] = useState<{
    action: 'RESOLVE' | 'DISMISS' | 'FOLLOW_UP';
    report: AdminReport;
  } | null>(null);

  // Optional local admin review note state & submission loading
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inline detail inspection modal state
  const [inspectReport, setInspectReport] = useState<AdminReport | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getReports();
      if (res.data?.reports) {
        setReports(res.data.reports);
      } else {
        setError(res.error || 'Failed to retrieve reports.');
      }
    } catch (err: any) {
      console.error('Failed to load admin reports:', err);
      setError(err?.message || 'Unable to connect to administration server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        fetchReports();
      }
    }, [isAdmin, fetchReports])
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
            This review desk is restricted to Maidaan administrators.
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
  const openCount = reports.filter((r) => r.status === 'OPEN').length;
  const followUpCount = reports.filter((r) => r.status === 'FOLLOW_UP').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;
  const dismissedCount = reports.filter((r) => r.status === 'DISMISSED').length;

  const displayedReports = useMemo(() => {
    switch (activeFilter) {
      case 'OPEN':
        return reports.filter((r) => r.status === 'OPEN');
      case 'FOLLOW_UP':
        return reports.filter((r) => r.status === 'FOLLOW_UP');
      case 'RESOLVED':
        return reports.filter((r) => r.status === 'RESOLVED');
      case 'DISMISSED':
        return reports.filter((r) => r.status === 'DISMISSED');
      case 'ALL':
      default:
        return reports;
    }
  }, [reports, activeFilter]);

  // =========================================================================
  // 3. ACTION HANDLERS
  // =========================================================================
  const handleOpenConfirm = (
    action: 'RESOLVE' | 'DISMISS' | 'FOLLOW_UP',
    report: AdminReport
  ) => {
    setConfirmModal({ action, report });
    setAdminNoteInput(report.adminNote || '');
  };

  const handleConfirmDecision = async () => {
    if (!confirmModal || isSubmitting) return;
    const { action, report } = confirmModal;

    const trimmedNote = adminNoteInput.trim().slice(0, 300);

    try {
      setIsSubmitting(true);
      const res = await adminService.reviewReport(
        report.id,
        action,
        trimmedNote || undefined
      );
      if (res.data?.report) {
        const updated = res.data.report;

        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? updated : r))
        );

        setConfirmModal(null);
        setAdminNoteInput('');
        if (inspectReport?.id === report.id) {
          setInspectReport(updated);
        }
      } else {
        throw new Error(res.error || 'Failed to record report review.');
      }
    } catch (err: any) {
      console.error('Failed to review report:', err);
      if (err?.status === 409) {
        Alert.alert(
          'Already Reviewed',
          'This report has already been reviewed by an administrator.',
          [{ text: 'OK', onPress: () => fetchReports() }]
        );
      } else {
        Alert.alert(
          'Review Failed',
          err?.message || 'Could not record review decision. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // 4. MAIN SCREEN RENDER
  // =========================================================================
  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
      {/* Header */}
      <ArenaHeader
        title="REPORT REVIEW"
        subtitle="ADMIN DESK // CONDUCT REVIEWS"
        showBack
        onBack={() => router.replace('/admin/dashboard')}
        rightAction={
          <ArenaBadge label="SCREEN 22" variant="stone" size="sm" />
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        {/* RESTRAINED CONDUCT AUDIT BANNER */}
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
                  FAIR PLAY GOVERNANCE DESK
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-warm-white text-sm font-black uppercase tracking-tight"
                >
                  CONDUCT & SAFETY AUDIT
                </Text>
              </View>
              <ArenaBadge
                label={`${openCount} OPEN`}
                variant="rust"
                size="sm"
              />
            </View>
          </View>
        </View>

        {/* PAGE TITLE & CONTEXT */}
        <View className="px-4 pt-3 pb-1">
          <Text className="text-graphite text-xl font-black uppercase tracking-tight">
            USER CONDUCT REPORTS
          </Text>
          <Text className="text-stone-muted text-xs leading-4 mt-0.5">
            Audit user-submitted conduct and safety concerns. Review incident summaries, verify match context, and resolve platform reports.
          </Text>
        </View>

        {/* ================================================================= */}
        {/* SUMMARY STRIP */}
        {/* ================================================================= */}
        <View className="px-4 mt-3">
          <View className="flex-row gap-2">
            {/* OPEN */}
            <Pressable
              onPress={() => setActiveFilter('OPEN')}
              className={`flex-1 rounded-sm p-3 border ${
                activeFilter === 'OPEN'
                  ? 'bg-rust/15 border-rust'
                  : 'bg-stone/20 border-stone'
              }`}
            >
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider font-bold">
                OPEN
              </Text>
              <Text className="text-rust text-xl font-black tracking-tight mt-0.5">
                {openCount}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium">
                Unreviewed
              </Text>
            </Pressable>

            {/* FOLLOW-UP */}
            <Pressable
              onPress={() => setActiveFilter('FOLLOW_UP')}
              className={`flex-1 rounded-sm p-3 border ${
                activeFilter === 'FOLLOW_UP'
                  ? 'bg-stone/40 border-graphite'
                  : 'bg-stone/20 border-stone'
              }`}
            >
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider font-bold">
                FOLLOW-UP
              </Text>
              <Text className="text-graphite text-xl font-black tracking-tight mt-0.5">
                {followUpCount}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium">
                Clarification
              </Text>
            </Pressable>

            {/* RESOLVED */}
            <Pressable
              onPress={() => setActiveFilter('RESOLVED')}
              className={`flex-1 rounded-sm p-3 border ${
                activeFilter === 'RESOLVED'
                  ? 'bg-arena-olive/20 border-arena-olive'
                  : 'bg-stone/20 border-stone'
              }`}
            >
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider font-bold">
                RESOLVED
              </Text>
              <Text className="text-arena-olive text-xl font-black tracking-tight mt-0.5">
                {resolvedCount}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium">
                Complete
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ================================================================= */}
        {/* FILTER CHIPS */}
        {/* ================================================================= */}
        <View className="px-4 mt-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            <View className="flex-row space-x-1.5 bg-stone/20 p-1 rounded-sm border border-stone">
              {(
                [
                  { id: 'OPEN', label: `OPEN (${openCount})` },
                  { id: 'FOLLOW_UP', label: `FOLLOW-UP (${followUpCount})` },
                  { id: 'RESOLVED', label: `RESOLVED (${resolvedCount})` },
                  { id: 'DISMISSED', label: `DISMISSED (${dismissedCount})` },
                  { id: 'ALL', label: `ALL (${reports.length})` },
                ] as const
              ).map((tab) => {
                const isSelected = activeFilter === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setActiveFilter(tab.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${tab.label}`}
                    className={`px-2.5 py-1.5 items-center justify-center rounded-xs ${
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
          </ScrollView>
        </View>

        {/* ================================================================= */}
        {/* REPORT LISTING SECTION */}
        {/* ================================================================= */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text
              accessibilityRole="header"
              className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold"
            >
              CONDUCT REPORTS
            </Text>
            <Text className="text-stone-muted text-[10px] font-mono">
              {displayedReports.length} LISTED
            </Text>
          </View>

          {/* LOADING STATE */}
          {loading ? (
            <View className="bg-white rounded-sm p-8 border border-stone items-center my-2 shadow-2xs">
              <ActivityIndicator size="small" color="#242522" />
              <Text className="text-stone-muted text-xs font-mono mt-3 uppercase tracking-wider">
                LOADING CONDUCT REPORTS...
              </Text>
            </View>
          ) : error ? (
            /* ERROR STATE */
            <View className="bg-white rounded-sm p-6 border border-rust/40 items-center my-2 shadow-2xs">
              <Ionicons name="alert-circle-outline" size={28} color="#875646" />
              <Text className="text-graphite text-sm font-black uppercase tracking-tight text-center mt-2">
                FAILED TO LOAD REPORTS
              </Text>
              <Text className="text-stone-muted text-xs text-center mt-1 leading-4">
                {error}
              </Text>
              <View className="mt-4 w-full max-w-[200px]">
                <PrimaryButton
                  title="RETRY"
                  variant="outline"
                  onPress={fetchReports}
                />
              </View>
            </View>
          ) : displayedReports.length === 0 ? (
            /* EMPTY STATE */
            <View className="bg-white rounded-sm p-6 border border-stone items-center my-2 shadow-2xs">
              <View className="w-12 h-12 rounded-full bg-stone/20 border border-stone items-center justify-center mb-3">
                <Ionicons name="shield-checkmark-outline" size={24} color="#666B60" />
              </View>

              <Text className="text-graphite text-sm font-black uppercase tracking-tight text-center">
                {activeFilter === 'OPEN'
                  ? 'NO REPORTS WAITING'
                  : 'NO REPORTS IN THIS STATUS'}
              </Text>

              <Text className="text-stone-muted text-xs text-center mt-1 max-w-[260px] leading-4">
                {activeFilter === 'OPEN'
                  ? 'New conduct and safety reports will appear here for review.'
                  : `No conduct reports matching the "${activeFilter}" filter.`}
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
            displayedReports.map((item) => {
              const categoryMeta = CATEGORY_META[item.category] || CATEGORY_META.OTHER;
              const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.OPEN;

              const isOpen = item.status === 'OPEN';
              const isFollowUp = item.status === 'FOLLOW_UP';
              const isResolved = item.status === 'RESOLVED';
              const isDismissed = item.status === 'DISMISSED';

              const reporterDisplay = item.reporterName || 'ANONYMOUS';
              const reportedDisplay = item.reportedUserName || 'UNKNOWN ACCOUNT';

              return (
                <View
                  key={item.id}
                  className="bg-white rounded-sm border border-stone p-4 mb-3 shadow-2xs"
                >
                  {/* Top Bar: Category & Status Badges */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="bg-stone/20 px-2 py-0.5 rounded-xs border border-stone/60 mr-2">
                        <Text className="text-graphite text-[9px] font-mono font-bold uppercase">
                          {item.id.slice(0, 8).toUpperCase()}
                        </Text>
                      </View>
                      <ArenaBadge
                        label={categoryMeta.label}
                        variant={categoryMeta.badgeVariant}
                        size="sm"
                      />
                    </View>

                    <ArenaBadge
                      label={statusMeta.label}
                      variant={statusMeta.badgeVariant}
                      size="sm"
                    />
                  </View>

                  {/* Parties Strip: Reporter & Reported Account */}
                  <View className="mt-3 pt-2.5 border-t border-stone/30 flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                        REPORTER
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="text-graphite text-xs font-bold uppercase mt-0.5"
                      >
                        {reporterDisplay}
                      </Text>
                    </View>

                    <View className="flex-1 pl-2 items-end">
                      <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                        REPORTED ACCOUNT
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="text-graphite text-xs font-bold uppercase mt-0.5 text-right"
                      >
                        {reportedDisplay}
                      </Text>
                    </View>
                  </View>

                  {/* Incident Summary */}
                  <View className="mt-2.5 p-3 bg-stone/15 rounded-xs border border-stone/30">
                    <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold mb-1">
                      INCIDENT SUMMARY
                    </Text>
                    <Text className="text-graphite text-xs leading-4 font-medium">
                      {item.description}
                    </Text>
                    <Text className="text-stone-muted text-[9px] font-mono mt-2">
                      SUBMITTED {formatTimeAgo(item.createdAt).toUpperCase()}
                    </Text>
                  </View>

                  {/* Match Context Box (if valid match info exists) */}
                  {item.matchId ? (
                    <View className="mt-2.5 p-2.5 bg-white rounded-xs border border-stone/60">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                          ASSOCIATED MATCH
                        </Text>
                        <Text className="text-stone-muted text-[9px] font-mono">
                          {item.matchId.slice(0, 8).toUpperCase()}
                        </Text>
                      </View>

                      <Text
                        className="text-graphite text-xs font-black uppercase tracking-tight"
                        numberOfLines={1}
                      >
                        {item.matchTitle || 'UNNAMED MATCH'}
                      </Text>

                      <View className="flex-row items-center justify-between mt-1 pt-1 border-t border-stone/20">
                        <Text className="text-stone-muted text-[10px] font-mono" numberOfLines={1}>
                          {(item.matchSport || 'SPORTS').toUpperCase()} • MATCH REF
                        </Text>

                        {/* View Match Details CTA */}
                        <Pressable
                          onPress={() => router.push(`/match/${item.matchId}`)}
                          accessibilityRole="button"
                          accessibilityLabel={`View match ${item.matchTitle || item.matchId}`}
                          className="flex-row items-center"
                        >
                          <Text className="text-graphite text-[10px] font-mono uppercase font-bold mr-0.5">
                            VIEW MATCH
                          </Text>
                          <Ionicons name="chevron-forward" size={10} color="#242522" />
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  {/* Admin Note if already added */}
                  {item.adminNote ? (
                    <View className="mt-2.5 p-2 bg-stone/20 rounded-xs border border-stone/50">
                      <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                        ADMIN NOTE:
                      </Text>
                      <Text className="text-graphite text-[11px] leading-4 mt-0.5">
                        {item.adminNote}
                      </Text>
                    </View>
                  ) : null}

                  {/* Review Actions & Status Transition Strip */}
                  <View className="mt-3 pt-2.5 border-t border-stone/30">
                    {isOpen ? (
                      <View>
                        <View className="flex-row gap-2">
                          {/* RESOLVE BUTTON */}
                          <Pressable
                            onPress={() => handleOpenConfirm('RESOLVE', item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Resolve report ${item.id}`}
                            className="flex-1 py-2.5 rounded-xs bg-arena-olive border border-arena-olive items-center justify-center active:bg-olive-dark"
                          >
                            <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                              RESOLVE REPORT
                            </Text>
                          </Pressable>

                          {/* DISMISS BUTTON */}
                          <Pressable
                            onPress={() => handleOpenConfirm('DISMISS', item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Dismiss report ${item.id}`}
                            className="flex-1 py-2.5 rounded-xs bg-warm-white border border-stone items-center justify-center active:bg-stone/20"
                          >
                            <Text className="text-graphite text-xs font-bold uppercase tracking-wide">
                              DISMISS REPORT
                            </Text>
                          </Pressable>
                        </View>

                        {/* NEEDS FOLLOW-UP ACTION */}
                        <Pressable
                          onPress={() => handleOpenConfirm('FOLLOW_UP', item)}
                          accessibilityRole="button"
                          accessibilityLabel={`Mark report ${item.id} as needing follow up`}
                          className="mt-2 py-2 rounded-xs bg-stone/20 border border-stone items-center justify-center active:bg-stone/30"
                        >
                          <Text className="text-graphite text-[10px] font-mono uppercase font-bold">
                            NEEDS FOLLOW-UP
                          </Text>
                        </Pressable>
                      </View>
                    ) : isFollowUp ? (
                      <View>
                        <View className="p-2.5 bg-rust/10 rounded-xs border border-rust/30 mb-2.5 flex-row items-center justify-between">
                          <View className="flex-row items-center flex-1 pr-2">
                            <Ionicons name="time-outline" size={16} color="#875646" />
                            <View className="ml-2 flex-1">
                              <Text className="text-rust text-xs font-black uppercase tracking-tight">
                                FOLLOW-UP REQUIRED
                              </Text>
                              <Text className="text-stone-muted text-[9px] font-mono">
                                This means additional platform review is needed later.
                              </Text>
                            </View>
                          </View>
                          <ArenaBadge label="FOLLOW-UP" variant="rust" size="sm" />
                        </View>

                        <View className="flex-row gap-2">
                          <Pressable
                            onPress={() => handleOpenConfirm('RESOLVE', item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Resolve report ${item.id}`}
                            className="flex-1 py-2 rounded-xs bg-arena-olive border border-arena-olive items-center justify-center active:bg-olive-dark"
                          >
                            <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                              RESOLVE REPORT
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleOpenConfirm('DISMISS', item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Dismiss report ${item.id}`}
                            className="flex-1 py-2 rounded-xs bg-warm-white border border-stone items-center justify-center active:bg-stone/20"
                          >
                            <Text className="text-graphite text-xs font-bold uppercase tracking-wide">
                              DISMISS REPORT
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : isResolved ? (
                      /* RESOLVED STATUS STRIP */
                      <View className="p-2.5 bg-arena-olive/15 rounded-xs border border-arena-olive/30 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="checkmark-circle" size={16} color="#3D4438" />
                          <View className="ml-2">
                            <Text className="text-arena-olive text-xs font-black uppercase tracking-tight">
                              RESOLVED
                            </Text>
                            <Text className="text-stone-muted text-[9px] font-mono">
                              PLATFORM REVIEW COMPLETE
                            </Text>
                          </View>
                        </View>
                        <ArenaBadge label="RESOLVED" variant="olive" size="sm" />
                      </View>
                    ) : (
                      /* DISMISSED STATUS STRIP */
                      <View className="p-2.5 bg-stone/20 rounded-xs border border-stone/50 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="close-circle-outline" size={16} color="#666B60" />
                          <View className="ml-2">
                            <Text className="text-graphite text-xs font-bold uppercase tracking-tight">
                              DISMISSED
                            </Text>
                            <Text className="text-stone-muted text-[9px] font-mono">
                              NO FURTHER PLATFORM REVIEW REQUIRED
                            </Text>
                          </View>
                        </View>
                        <ArenaBadge label="DISMISSED" variant="stone" size="sm" />
                      </View>
                    )}

                    {/* Secondary Action: Inspect Case Details Inline */}
                    <Pressable
                      onPress={() => setInspectReport(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`View full report sheet for ${item.id}`}
                      className="mt-2.5 pt-2 border-t border-stone/20 flex-row items-center justify-between"
                    >
                      <Text className="text-stone-muted text-[10px] font-mono uppercase font-bold">
                        VIEW CASE DETAILS SHEET
                      </Text>
                      <View className="flex-row items-center">
                        <Text className="text-graphite text-[10px] font-bold mr-1">
                          {item.id.slice(0, 8).toUpperCase()}
                        </Text>
                        <Ionicons name="chevron-forward" size={12} color="#242522" />
                      </View>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ===================================================================== */}
      {/* CONFIRMATION MODAL: RESOLVE / DISMISS / FOLLOW-UP */}
      {/* ===================================================================== */}
      <Modal
        visible={!!confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isSubmitting && setConfirmModal(null)}
      >
        <View className="flex-1 bg-graphite/80 items-center justify-center p-5">
          <View className="w-full max-w-sm bg-warm-white rounded-sm p-5 border border-stone shadow-xl">
            {confirmModal ? (
              <>
                <View
                  className={`w-12 h-12 rounded-sm items-center justify-center border mb-3 ${
                    confirmModal.action === 'RESOLVE'
                      ? 'bg-arena-olive border-warm-white/20'
                      : confirmModal.action === 'DISMISS'
                      ? 'bg-stone/30 border-stone'
                      : 'bg-rust/20 border-rust/40'
                  }`}
                >
                  <Ionicons
                    name={
                      confirmModal.action === 'RESOLVE'
                        ? 'checkmark-sharp'
                        : confirmModal.action === 'DISMISS'
                        ? 'close-sharp'
                        : 'alert-circle-outline'
                    }
                    size={24}
                    color={confirmModal.action === 'RESOLVE' ? '#F4F1EA' : '#242522'}
                  />
                </View>

                <ArenaBadge
                  label={
                    confirmModal.action === 'RESOLVE'
                      ? 'RESOLVE REPORT'
                      : confirmModal.action === 'DISMISS'
                      ? 'DISMISS REPORT'
                      : 'NEEDS FOLLOW-UP'
                  }
                  variant={
                    confirmModal.action === 'RESOLVE'
                      ? 'olive'
                      : confirmModal.action === 'DISMISS'
                      ? 'stone'
                      : 'rust'
                  }
                  size="sm"
                />

                <Text className="text-graphite text-lg font-black uppercase tracking-tight mt-2">
                  {confirmModal.action === 'RESOLVE'
                    ? 'RESOLVE REPORT?'
                    : confirmModal.action === 'DISMISS'
                    ? 'DISMISS REPORT?'
                    : 'NEEDS FOLLOW-UP?'}
                </Text>

                <Text className="text-stone-muted text-xs leading-4 mt-1">
                  {confirmModal.action === 'RESOLVE'
                    ? 'This will record platform review completion for this conduct report.'
                    : confirmModal.action === 'DISMISS'
                    ? 'Use this when the submitted report does not require further platform action.'
                    : 'This marks the report as requiring additional coordinator follow-up.'}
                </Text>

                {/* Case snapshot */}
                <View className="my-3 p-2.5 bg-white rounded-xs border border-stone">
                  <Text className="text-graphite text-xs font-black uppercase" numberOfLines={1}>
                    {confirmModal.report.id.slice(0, 8).toUpperCase()} • {CATEGORY_META[confirmModal.report.category]?.label || 'REPORT'}
                  </Text>
                  <Text className="text-stone-muted text-[10px] mt-0.5" numberOfLines={2}>
                    {confirmModal.report.description}
                  </Text>
                </View>

                {/* Optional local admin note input */}
                <View className="mb-3">
                  <Text className="text-stone-muted text-[10px] font-mono uppercase font-bold mb-1">
                    ADMIN NOTE (OPTIONAL)
                  </Text>
                  <TextInput
                    value={adminNoteInput}
                    onChangeText={setAdminNoteInput}
                    maxLength={300}
                    editable={!isSubmitting}
                    placeholder="e.g. Verified with match coordinator..."
                    placeholderTextColor="#A0A59A"
                    className="bg-white border border-stone p-2 rounded-xs text-graphite text-xs min-h-[38px]"
                  />
                  <Text className="text-stone-muted text-[9px] font-mono text-right mt-0.5">
                    {adminNoteInput.length}/300
                  </Text>
                </View>

                {/* Action Buttons */}
                <View className="space-y-2 mt-1">
                  <PrimaryButton
                    title={
                      isSubmitting
                        ? 'SAVING DECISION...'
                        : confirmModal.action === 'RESOLVE'
                        ? 'RESOLVE REPORT'
                        : confirmModal.action === 'DISMISS'
                        ? 'DISMISS REPORT'
                        : 'NEEDS FOLLOW-UP'
                    }
                    variant={confirmModal.action === 'RESOLVE' ? 'primary' : 'outline'}
                    disabled={isSubmitting}
                    onPress={handleConfirmDecision}
                  />

                  <Pressable
                    disabled={isSubmitting}
                    onPress={() => {
                      setConfirmModal(null);
                      setAdminNoteInput('');
                    }}
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
      {/* INLINE CASE DETAILS SHEET MODAL */}
      {/* ===================================================================== */}
      <Modal
        visible={!!inspectReport}
        transparent
        animationType="slide"
        onRequestClose={() => setInspectReport(null)}
      >
        <View className="flex-1 bg-graphite/80 justify-end">
          <View className="bg-warm-white rounded-t-lg p-5 border-t border-stone max-h-[85%]">
            {inspectReport ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row items-center justify-between pb-3 border-b border-stone/30">
                  <View className="flex-1 pr-2">
                    <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                      CASE DETAILS AUDIT SHEET
                    </Text>
                    <Text className="text-graphite text-base font-black uppercase tracking-tight mt-0.5">
                      REPORT #{inspectReport.id.slice(0, 8).toUpperCase()}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setInspectReport(null)}
                    className="w-8 h-8 rounded-xs bg-stone/20 items-center justify-center border border-stone"
                  >
                    <Ionicons name="close" size={18} color="#242522" />
                  </Pressable>
                </View>

                {/* Table Breakdown */}
                <View className="mt-3 bg-white rounded-sm border border-stone p-3.5 space-y-2.5">
                  <View>
                    <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                      INCIDENT CATEGORY
                    </Text>
                    <Text className="text-graphite text-xs font-bold mt-0.5">
                      {(CATEGORY_META[inspectReport.category] || CATEGORY_META.OTHER).label} • {(CATEGORY_META[inspectReport.category] || CATEGORY_META.OTHER).description}
                    </Text>
                  </View>

                  <View className="pt-2 border-t border-stone/20">
                    <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                      REPORTING PLAYER
                    </Text>
                    <Text className="text-graphite text-xs font-bold mt-0.5">
                      {inspectReport.reporterName || 'ANONYMOUS'}
                    </Text>
                  </View>

                  <View className="pt-2 border-t border-stone/20">
                    <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                      REPORTED ACCOUNT
                    </Text>
                    <Text className="text-graphite text-xs font-bold mt-0.5">
                      {inspectReport.reportedUserName || 'UNKNOWN ACCOUNT'}
                    </Text>
                  </View>

                  <View className="pt-2 border-t border-stone/20">
                    <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                      FULL INCIDENT STATEMENT
                    </Text>
                    <Text className="text-graphite text-xs leading-4 mt-0.5">
                      {inspectReport.description}
                    </Text>
                  </View>

                  {inspectReport.matchId ? (
                    <View className="pt-2 border-t border-stone/20">
                      <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                        MATCH REFERENCE
                      </Text>
                      <Text className="text-graphite text-xs font-mono font-bold mt-0.5">
                        {inspectReport.matchTitle ? `${inspectReport.matchTitle} (${inspectReport.matchId})` : inspectReport.matchId}
                      </Text>
                    </View>
                  ) : null}

                  {inspectReport.adminNote ? (
                    <View className="pt-2 border-t border-stone/20">
                      <Text className="text-stone-muted text-[9px] font-mono uppercase font-bold">
                        EXISTING ADMINISTRATIVE NOTE
                      </Text>
                      <Text className="text-graphite text-xs leading-4 mt-0.5">
                        {inspectReport.adminNote}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Regulatory Notice */}
                <View className="mt-3 p-3 bg-stone/20 rounded-sm border border-stone">
                  <Text className="text-stone-muted text-[10px] font-mono leading-4">
                    NOTE: Moderation decisions are administrative platform actions under Maidaan Fair Play standards. They do not constitute legal adjudication or criminal investigation.
                  </Text>
                </View>

                {/* Action buttons if open or follow-up */}
                {inspectReport.status === 'OPEN' ? (
                  <View className="space-y-2 mt-4">
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => {
                          handleOpenConfirm('RESOLVE', inspectReport);
                        }}
                        className="flex-1 py-3 rounded-xs bg-arena-olive border border-arena-olive items-center justify-center active:bg-olive-dark"
                      >
                        <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                          RESOLVE REPORT
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          handleOpenConfirm('DISMISS', inspectReport);
                        }}
                        className="flex-1 py-3 rounded-xs bg-warm-white border border-stone items-center justify-center active:bg-stone/20"
                      >
                        <Text className="text-graphite text-xs font-bold uppercase tracking-wide">
                          DISMISS REPORT
                        </Text>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() => {
                        handleOpenConfirm('FOLLOW_UP', inspectReport);
                      }}
                      className="py-2.5 rounded-xs bg-stone/20 border border-stone items-center justify-center active:bg-stone/30"
                    >
                      <Text className="text-graphite text-[10px] font-mono uppercase font-bold">
                        NEEDS FOLLOW-UP
                      </Text>
                    </Pressable>
                  </View>
                ) : inspectReport.status === 'FOLLOW_UP' ? (
                  <View className="flex-row gap-2 mt-4">
                    <Pressable
                      onPress={() => {
                        handleOpenConfirm('RESOLVE', inspectReport);
                      }}
                      className="flex-1 py-3 rounded-xs bg-arena-olive border border-arena-olive items-center justify-center active:bg-olive-dark"
                    >
                      <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                        RESOLVE REPORT
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        handleOpenConfirm('DISMISS', inspectReport);
                      }}
                      className="flex-1 py-3 rounded-xs bg-warm-white border border-stone items-center justify-center active:bg-stone/20"
                    >
                      <Text className="text-graphite text-xs font-bold uppercase tracking-wide">
                        DISMISS REPORT
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="mt-4">
                    <PrimaryButton
                      title="CLOSE CASE SHEET"
                      variant="outline"
                      onPress={() => setInspectReport(null)}
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
