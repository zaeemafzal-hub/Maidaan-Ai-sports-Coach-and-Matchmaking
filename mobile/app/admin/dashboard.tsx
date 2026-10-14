import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { IMAGES } from '../../constants/images';
import { adminService } from '../../services/adminService';

// =============================================================================
// DOMAIN TYPES & LIVE SUMMARY MODEL
// =============================================================================

export interface AdminQueueSummary {
  pendingHubs: number;
  openReports: number;
  followUpReports: number;
  completedReviews: number;
}

export interface AdminActivityItem {
  id: string;
  action: string;
  category: 'HUB' | 'REPORT' | 'PLATFORM';
  detail: string;
  timestampLabel: string;
  status: 'PENDING' | 'OPEN' | 'REVIEWED' | 'RESOLVED';
  rawDate: number;
}

export default function AdminDashboardScreen() {
  const { currentUser } = useAuthStore();

  // Strict Admin Role Guard:
  // Only authenticated user with currentUser.role === 'ADMIN' has access.
  const isAdmin = currentUser?.role === 'ADMIN';

  // Live operational state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminQueueSummary>({
    pendingHubs: 0,
    openReports: 0,
    followUpReports: 0,
    completedReviews: 0,
  });
  const [activities, setActivities] = useState<AdminActivityItem[]>([]);

  const isMountedRef = React.useRef(true);

  const fetchDashboardData = useCallback(async () => {
    if (!isAdmin) return;

    try {
      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const [verifRes, reportsRes] = await Promise.all([
        adminService.getHubVerifications(),
        adminService.getReports(),
      ]);

      if (!verifRes.data || !reportsRes.data) {
        const err =
          verifRes.error ||
          reportsRes.error ||
          'Failed to retrieve operational queue data.';
        if (isMountedRef.current) {
          setError(err);
        }
        return;
      }

      const verifications = verifRes.data.requests || [];
      const reports = reportsRes.data.reports || [];

      const pendingHubs = verifications.filter((r) => r.status === 'PENDING').length;
      const openReports = reports.filter((r) => r.status === 'OPEN').length;
      const followUpReports = reports.filter((r) => r.status === 'FOLLOW_UP').length;
      const completedHubs = verifications.filter(
        (r) => r.status === 'APPROVED' || r.status === 'REJECTED'
      ).length;
      const completedReports = reports.filter(
        (r) => r.status === 'RESOLVED' || r.status === 'DISMISSED'
      ).length;
      const completedReviews = completedHubs + completedReports;

      if (isMountedRef.current) {
        setSummary({
          pendingHubs,
          openReports,
          followUpReports,
          completedReviews,
        });
      }

      // Construct live recent activity stream from real verifications & reports
      const liveItems: AdminActivityItem[] = [
        ...verifications.map((v) => ({
          id: `hub-${v.id.substring(0, 8)}`,
          action:
            v.status === 'PENDING'
              ? 'HUB VERIFICATION SUBMITTED'
              : `HUB ${v.status}`,
          category: 'HUB' as const,
          detail: `${v.hubName} (${v.location}) — ${v.courtCount} court(s).${
            v.adminNote ? ` Admin note: "${v.adminNote}"` : ''
          }`,
          timestampLabel: v.submittedAt
            ? new Date(v.submittedAt).toLocaleDateString()
            : 'RECENT',
          status: (v.status === 'PENDING' ? 'PENDING' : 'REVIEWED') as
            | 'PENDING'
            | 'REVIEWED',
          rawDate: new Date(v.updatedAt || v.submittedAt).getTime(),
        })),
        ...reports.map((r) => ({
          id: `rep-${r.id.substring(0, 8)}`,
          action: `REPORT ${r.status}`,
          category: 'REPORT' as const,
          detail: `${r.category}: ${r.description}${
            r.adminNote ? ` — Note: "${r.adminNote}"` : ''
          }`,
          timestampLabel: r.createdAt
            ? new Date(r.createdAt).toLocaleDateString()
            : 'RECENT',
          status: (r.status === 'RESOLVED'
            ? 'RESOLVED'
            : r.status === 'OPEN'
            ? 'OPEN'
            : 'REVIEWED') as 'RESOLVED' | 'OPEN' | 'REVIEWED',
          rawDate: new Date(r.updatedAt || r.createdAt).getTime(),
        })),
      ]
        .sort((a, b) => b.rawDate - a.rawDate)
        .slice(0, 6);

      if (isMountedRef.current) {
        setActivities(liveItems);
      }
    } catch {
      if (isMountedRef.current) {
        setError('Connection failure while loading operational data. Please retry.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      fetchDashboardData();
      return () => {
        isMountedRef.current = false;
      };
    }, [fetchDashboardData])
  );

  // =========================================================================
  // 1. ROLE GUARD: NON-ADMIN ACCESS
  // =========================================================================
  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
        <ArenaHeader
          title="MAIDAAN"
          subtitle="PLATFORM OPERATIONS // ACCESS RESTRICTION"
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
            This workspace is restricted to Maidaan administrators. Public accounts cannot access platform review queues.
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
  // 2. ADMIN IDENTITY PRESENTATION
  // =========================================================================
  const adminName = currentUser?.name?.trim() || 'ADMINISTRATOR';
  const adminIdentifier = currentUser?.id ? `ID: ${currentUser.id.substring(0, 8)}` : 'ADM-01';

  const areQueuesClear = summary.pendingHubs === 0 && summary.openReports === 0;

  // =========================================================================
  // 3. MAIN DASHBOARD RENDER
  // =========================================================================
  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
      {/* Header */}
      <ArenaHeader
        title="ADMIN DESK"
        subtitle="PLATFORM OPERATIONS // REVIEW QUEUES"
        showBack
        onBack={() => router.replace('/(tabs)/discover')}
        rightAction={
          <ArenaBadge label="LIVE DESK" variant="stone" size="sm" />
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        {/* RESTRAINED OPERATIONAL BANNER */}
        <View className="px-4 pt-3">
          <View className="h-16 w-full rounded-sm overflow-hidden border border-stone relative bg-graphite">
            <Image
              source={IMAGES.arenaGround}
              className="w-full h-full opacity-30"
              resizeMode="cover"
            />
            <View className="absolute inset-0 px-3.5 py-2 flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-widest font-bold">
                  ADMIN SESSION ACTIVE
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-warm-white text-sm font-black uppercase tracking-tight"
                >
                  {adminName} • {adminIdentifier}
                </Text>
              </View>
              <ArenaBadge label="OPERATIONS DESK" variant="olive" size="sm" />
            </View>
          </View>
        </View>

        {/* LOADING INDICATOR */}
        {loading && (
          <View className="mx-4 mt-4 p-4 bg-white rounded-sm border border-stone flex-row items-center justify-center">
            <ActivityIndicator size="small" color="#3D4438" />
            <Text className="text-stone-muted text-xs font-mono ml-3">
              SYNCING OPERATIONAL METRICS...
            </Text>
          </View>
        )}

        {/* ERROR WITH RETRY */}
        {error && !loading && (
          <View className="mx-4 mt-4 p-4 bg-rust/10 rounded-sm border border-rust/30">
            <View className="flex-row items-center mb-2">
              <Ionicons name="alert-circle-outline" size={18} color="#875646" />
              <Text className="text-rust text-xs font-black uppercase tracking-tight ml-2">
                METRIC SYNC ERROR
              </Text>
            </View>
            <Text className="text-stone-muted text-xs leading-4 mb-3">
              {error}
            </Text>
            <PrimaryButton
              title="RETRY SYNC"
              variant="outline"
              onPress={fetchDashboardData}
            />
          </View>
        )}

        {/* DOMINANT ELEMENT: REVIEW WORKLOAD SUMMARY STRIP */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text
              accessibilityRole="header"
              className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold"
            >
              MODERATION & VERIFICATION WORKLOAD
            </Text>
            <Text className="text-stone-muted text-[10px] font-mono">
              LIVE QUEUE STATUS
            </Text>
          </View>

          <View className="flex-row gap-2">
            {/* Stat 1: Hubs Pending */}
            <View className="flex-1 bg-stone/20 rounded-sm p-3 border border-stone">
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider font-bold">
                HUBS PENDING
              </Text>
              <Text className="text-rust text-2xl font-black tracking-tight mt-0.5">
                {summary.pendingHubs}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium mt-0.5">
                Awaiting audit
              </Text>
            </View>

            {/* Stat 2: Reports Open */}
            <View className="flex-1 bg-stone/20 rounded-sm p-3 border border-stone">
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider font-bold">
                REPORTS OPEN
              </Text>
              <Text className="text-rust text-2xl font-black tracking-tight mt-0.5">
                {summary.openReports}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium mt-0.5">
                Safety & conduct
              </Text>
            </View>

            {/* Stat 3: Reviews Completed */}
            <View className="flex-1 bg-stone/20 rounded-sm p-3 border border-stone">
              <Text className="text-stone-muted text-[9px] font-mono uppercase tracking-wider font-bold">
                REVIEWS COMPLETED
              </Text>
              <Text className="text-arena-olive text-2xl font-black tracking-tight mt-0.5">
                {summary.completedReviews}
              </Text>
              <Text className="text-stone-muted text-[10px] font-medium mt-0.5">
                Resolved cases
              </Text>
            </View>
          </View>
        </View>

        {/* EMPTY WORKLOAD STATE */}
        {!loading && areQueuesClear ? (
          <View className="mx-4 mt-4 bg-white rounded-sm p-5 border border-stone items-center">
            <View className="w-12 h-12 rounded-full bg-arena-olive/20 border border-arena-olive items-center justify-center mb-2">
              <Ionicons name="checkmark-done" size={24} color="#3D4438" />
            </View>
            <Text className="text-graphite text-xs font-black uppercase tracking-wider">
              REVIEW QUEUES CLEAR
            </Text>
            <Text className="text-stone-muted text-xs text-center mt-1">
              No Hub verifications or reports are waiting for review.
            </Text>
          </View>
        ) : null}

        {/* ================================================================= */}
        {/* APPROVED WORK QUEUE CARDS */}
        {/* ================================================================= */}
        <View className="px-4 mt-6">
          <Text
            accessibilityRole="header"
            className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold mb-3"
          >
            ACTIVE REVIEW QUEUES
          </Text>

          {/* QUEUE 01: HUB VERIFICATION (Screen 21 Bridge) */}
          <Pressable
            onPress={() => router.push('/admin/hub-verification')}
            accessibilityRole="button"
            accessibilityLabel={`Open Hub Verification queue. ${summary.pendingHubs} submissions pending.`}
            className="w-full bg-white rounded-sm p-4 border border-stone mb-3 shadow-2xs active:bg-stone/10 active:scale-[0.99]"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Text className="text-stone-muted text-xs font-mono font-bold mr-2">
                  01
                </Text>
                <View className="w-2 h-2 rounded-full bg-rust mr-2" />
                <Text className="text-graphite text-sm font-black uppercase tracking-tight">
                  HUB VERIFICATION
                </Text>
              </View>
              <ArenaBadge
                label={`${summary.pendingHubs} PENDING SUBMISSIONS`}
                variant="rust"
                size="sm"
              />
            </View>

            <Text className="text-stone-muted text-xs leading-4 mb-3">
              Review Hub Owner submissions awaiting administrative verification. Inspect court dimensions, safety floodlights, and ground amenities.
            </Text>

            <View className="flex-row items-center justify-between pt-2.5 border-t border-stone/30">
              <View className="flex-row items-center">
                <Ionicons name="business-outline" size={14} color="#3D4438" />
                <Text className="text-stone-muted text-[10px] font-mono uppercase font-bold ml-1.5">
                  SCREEN 21 WORKFLOW
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-arena-olive text-xs font-black uppercase tracking-wider mr-1">
                  REVIEW HUBS
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#3D4438" />
              </View>
            </View>
          </Pressable>

          {/* QUEUE 02: REPORT REVIEW (Screen 22 Bridge) */}
          <Pressable
            onPress={() => router.push('/admin/report-review')}
            accessibilityRole="button"
            accessibilityLabel={`Open Report Review queue. ${summary.openReports} reports awaiting action.`}
            className="w-full bg-white rounded-sm p-4 border border-stone shadow-2xs active:bg-stone/10 active:scale-[0.99]"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Text className="text-stone-muted text-xs font-mono font-bold mr-2">
                  02
                </Text>
                <View className="w-2 h-2 rounded-full bg-rust mr-2" />
                <Text className="text-graphite text-sm font-black uppercase tracking-tight">
                  REPORT REVIEW
                </Text>
              </View>
              <ArenaBadge
                label={`${summary.openReports} OPEN REPORTS`}
                variant="rust"
                size="sm"
              />
            </View>

            <Text className="text-stone-muted text-xs leading-4 mb-3">
              Review submitted player safety and conduct reports. Audit incident reports, match dispute notices, and sportsmanship violations.
            </Text>

            <View className="flex-row items-center justify-between pt-2.5 border-t border-stone/30">
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark-outline" size={14} color="#875646" />
                <Text className="text-stone-muted text-[10px] font-mono uppercase font-bold ml-1.5">
                  SCREEN 22 WORKFLOW
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-rust text-xs font-black uppercase tracking-wider mr-1">
                  REVIEW REPORTS
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#875646" />
              </View>
            </View>
          </Pressable>
        </View>

        {/* ================================================================= */}
        {/* RECENT ADMIN ACTIVITY LOG */}
        {/* ================================================================= */}
        <View className="px-4 mt-6">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text
              accessibilityRole="header"
              className="text-graphite text-[11px] font-mono uppercase tracking-widest font-bold"
            >
              RECENT ADMIN ACTIVITY
            </Text>
            <Text className="text-stone-muted text-[10px] font-mono">
              LIVE AUDIT LOG
            </Text>
          </View>

          <View className="bg-white rounded-sm border border-stone divide-y divide-stone/30 shadow-2xs">
            {activities.length === 0 && !loading ? (
              <View className="p-4 items-center">
                <Text className="text-stone-muted text-xs font-mono">
                  NO ADMINISTRATIVE ACTIONS RECORDED YET
                </Text>
              </View>
            ) : (
              activities.map((item) => (
                <View key={item.id} className="p-3.5">
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center flex-1 pr-2">
                      <View
                        className={`w-1.5 h-1.5 rounded-full mr-2 ${
                          item.category === 'HUB' ? 'bg-arena-olive' : 'bg-rust'
                        }`}
                      />
                      <Text
                        numberOfLines={1}
                        className="text-graphite text-xs font-black uppercase tracking-tight flex-1"
                      >
                        {item.action}
                      </Text>
                    </View>

                    <ArenaBadge
                      label={item.status}
                      variant={
                        item.status === 'RESOLVED' || item.status === 'REVIEWED'
                          ? 'olive'
                          : item.status === 'OPEN'
                          ? 'rust'
                          : 'stone'
                      }
                      size="sm"
                    />
                  </View>

                  <Text className="text-stone-muted text-xs leading-4 mt-0.5">
                    {item.detail}
                  </Text>

                  <View className="flex-row items-center justify-between mt-2 pt-1 border-t border-stone/20">
                    <Text className="text-stone-muted text-[9px] font-mono">
                      LOG REF: {item.id.toUpperCase()}
                    </Text>
                    <Text className="text-stone-muted text-[9px] font-mono">
                      {item.timestampLabel}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* PLATFORM OPERATIONS DISCLAIMER */}
        <View className="px-4 mt-5">
          <View className="p-3 bg-stone/20 rounded-sm border border-stone">
            <Text className="text-stone-muted text-[10px] font-mono leading-4 text-center">
              MAIDAAN ADMINISTRATIVE WORKSPACE • PLATFORM GOVERNANCE DESK
              {'\n'}
              Decisions made in review queues execute policy checks under fair play standards.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
