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
      <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top']}>
        <ArenaHeader
          title="Admin Desk"
          subtitle="Access Restriction"
          showBack
          onBack={() => router.replace('/(tabs)/discover')}
        />
        <View className="flex-1 items-center justify-center p-6 bg-[#171A1D]">
          <View className="w-16 h-16 rounded-full bg-[#F4A261]/10 items-center justify-center border border-[#F4A261]/30 mb-5">
            <Ionicons name="shield-outline" size={28} color="#F4A261" />
          </View>

          <ArenaBadge label="ADMIN ACCESS REQUIRED" variant="rust" size="md" />

          <Text className="text-[#F4F6F7] text-lg font-black uppercase tracking-tight text-center mt-3">
            Admin Access Required
          </Text>

          <Text className="text-[#A0A5AD] text-sm text-center mt-2 max-w-[310px] leading-5">
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
  const adminName = currentUser?.name?.trim() || 'Administrator';
  const adminIdentifier = currentUser?.id ? `ID: ${currentUser.id.substring(0, 8)}` : 'ADM-01';

  const areQueuesClear = summary.pendingHubs === 0 && summary.openReports === 0;

  // =========================================================================
  // 3. MAIN DASHBOARD RENDER
  // =========================================================================
  return (
    <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top']}>
      {/* Modern Athletic Header */}
      <ArenaHeader
        title="Admin Desk"
        subtitle="Platform Governance"
        showBack
        onBack={() => router.replace('/(tabs)/discover')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        {/* Operational Banner */}
        <View className="px-4 pt-3">
          <View className="h-18 w-full rounded-2xl overflow-hidden border border-white/10 relative bg-[#1F2327]">
            <Image
              source={IMAGES.arenaGround}
              className="w-full h-full opacity-30"
              resizeMode="cover"
            />
            <View className="absolute inset-0 px-4 py-3 flex-row items-center justify-between bg-gradient-to-r from-[#171A1D]/80 to-transparent">
              <View className="flex-1 pr-2">
                <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-widest font-bold">
                  Admin Session Active
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-[#F4F6F7] text-base font-black uppercase tracking-tight"
                >
                  {adminName} • {adminIdentifier}
                </Text>
              </View>
              <ArenaBadge label="ADMIN" variant="olive" size="sm" />
            </View>
          </View>
        </View>

        {/* LOADING INDICATOR */}
        {loading && (
          <View className="mx-4 mt-4 p-4 bg-[#1F2327] rounded-2xl border border-white/10 flex-row items-center justify-center">
            <ActivityIndicator size="small" color="#E85D26" />
            <Text className="text-[#A0A5AD] text-xs font-mono ml-3">
              Syncing operational metrics...
            </Text>
          </View>
        )}

        {/* ERROR WITH RETRY */}
        {error && !loading && (
          <View className="mx-4 mt-4 p-4 bg-[#F4A261]/10 rounded-2xl border border-[#F4A261]/30">
            <View className="flex-row items-center mb-2">
              <Ionicons name="alert-circle-outline" size={18} color="#F4A261" />
              <Text className="text-[#F4A261] text-xs font-black uppercase tracking-tight ml-2">
                Metric Sync Error
              </Text>
            </View>
            <Text className="text-[#A0A5AD] text-xs leading-4 mb-3">
              {error}
            </Text>
            <PrimaryButton
              title="RETRY SYNC"
              variant="outline"
              onPress={fetchDashboardData}
            />
          </View>
        )}

        {/* REVIEW WORKLOAD SUMMARY STRIP */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text
              accessibilityRole="header"
              className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold"
            >
              Moderation & Verification Workload
            </Text>
            <Text className="text-[#7F8993] text-[10px] font-mono">
              Live Queue Status
            </Text>
          </View>

          <View className="flex-row gap-2">
            {/* Stat 1: Hubs Pending */}
            <View className="flex-1 bg-[#1F2327] rounded-2xl p-3.5 border border-white/10">
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-wider font-bold">
                HUBS PENDING
              </Text>
              <Text className="text-[#F4A261] text-2xl font-black tracking-tight mt-0.5">
                {summary.pendingHubs}
              </Text>
              <Text className="text-[#A0A5AD] text-[10px] font-medium mt-0.5">
                Awaiting audit
              </Text>
            </View>

            {/* Stat 2: Reports Open */}
            <View className="flex-1 bg-[#1F2327] rounded-2xl p-3.5 border border-white/10">
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-wider font-bold">
                REPORTS OPEN
              </Text>
              <Text className="text-[#F4A261] text-2xl font-black tracking-tight mt-0.5">
                {summary.openReports}
              </Text>
              <Text className="text-[#A0A5AD] text-[10px] font-medium mt-0.5">
                Safety & conduct
              </Text>
            </View>

            {/* Stat 3: Reviews Completed */}
            <View className="flex-1 bg-[#1F2327] rounded-2xl p-3.5 border border-white/10">
              <Text className="text-[#7F8993] text-[10px] font-mono uppercase tracking-wider font-bold">
                RESOLVED
              </Text>
              <Text className="text-[#E85D26] text-2xl font-black tracking-tight mt-0.5">
                {summary.completedReviews}
              </Text>
              <Text className="text-[#A0A5AD] text-[10px] font-medium mt-0.5">
                Completed
              </Text>
            </View>
          </View>
        </View>

        {/* EMPTY WORKLOAD STATE */}
        {!loading && areQueuesClear ? (
          <View className="mx-4 mt-4 bg-[#1F2327] rounded-2xl p-5 border border-white/10 items-center">
            <View className="w-12 h-12 rounded-full bg-[#E85D26]/20 border border-[#E85D26]/40 items-center justify-center mb-2">
              <Ionicons name="checkmark-done" size={24} color="#E85D26" />
            </View>
            <Text className="text-[#F4F6F7] text-xs font-black uppercase tracking-wider">
              Review Queues Clear
            </Text>
            <Text className="text-[#A0A5AD] text-xs text-center mt-1">
              No Hub verifications or reports are waiting for review.
            </Text>
          </View>
        ) : null}

        {/* ACTIVE REVIEW QUEUES */}
        <View className="px-4 mt-6">
          <Text
            accessibilityRole="header"
            className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold mb-3"
          >
            Active Review Queues
          </Text>

          {/* QUEUE 01: HUB VERIFICATION */}
          <Pressable
            onPress={() => router.push('/admin/hub-verification')}
            accessibilityRole="button"
            accessibilityLabel={`Open Hub Verification queue. ${summary.pendingHubs} submissions pending.`}
            className="w-full bg-[#1F2327] rounded-2xl p-4 border border-white/10 mb-3 shadow-sm active:bg-[#272C31] active:scale-[0.99]"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Text className="text-[#7F8993] text-xs font-mono font-bold mr-2">
                  01
                </Text>
                <View className="w-2 h-2 rounded-full bg-[#F4A261] mr-2" />
                <Text className="text-[#F4F6F7] text-sm font-black uppercase tracking-tight">
                  Hub Verification
                </Text>
              </View>
              <ArenaBadge
                label={`${summary.pendingHubs} PENDING`}
                variant="rust"
                size="sm"
              />
            </View>

            <Text className="text-[#A0A5AD] text-xs leading-4 mb-3">
              Review Hub Owner submissions awaiting administrative verification. Inspect court dimensions, safety floodlights, and ground amenities.
            </Text>

            <View className="flex-row items-center justify-between pt-2.5 border-t border-white/5">
              <View className="flex-row items-center">
                <Ionicons name="business-outline" size={14} color="#E85D26" />
                <Text className="text-[#A0A5AD] text-xs ml-1.5">
                  Verification Desk
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-[#E85D26] text-xs font-bold uppercase tracking-wider mr-1">
                  Review Hubs
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#E85D26" />
              </View>
            </View>
          </Pressable>

          {/* QUEUE 02: REPORT REVIEW */}
          <Pressable
            onPress={() => router.push('/admin/report-review')}
            accessibilityRole="button"
            accessibilityLabel={`Open Report Review queue. ${summary.openReports} reports awaiting action.`}
            className="w-full bg-[#1F2327] rounded-2xl p-4 border border-white/10 shadow-sm active:bg-[#272C31] active:scale-[0.99]"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Text className="text-[#7F8993] text-xs font-mono font-bold mr-2">
                  02
                </Text>
                <View className="w-2 h-2 rounded-full bg-[#F4A261] mr-2" />
                <Text className="text-[#F4F6F7] text-sm font-black uppercase tracking-tight">
                  Report Review
                </Text>
              </View>
              <ArenaBadge
                label={`${summary.openReports} OPEN`}
                variant="rust"
                size="sm"
              />
            </View>

            <Text className="text-[#A0A5AD] text-xs leading-4 mb-3">
              Review submitted player safety and conduct reports. Audit incident reports, match dispute notices, and sportsmanship violations.
            </Text>

            <View className="flex-row items-center justify-between pt-2.5 border-t border-white/5">
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark-outline" size={14} color="#F4A261" />
                <Text className="text-[#A0A5AD] text-xs ml-1.5">
                  Conduct Audit
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-[#F4A261] text-xs font-bold uppercase tracking-wider mr-1">
                  Review Reports
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#F4A261" />
              </View>
            </View>
          </Pressable>
        </View>

        {/* RECENT ADMIN ACTIVITY LOG */}
        <View className="px-4 mt-6">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text
              accessibilityRole="header"
              className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold"
            >
              Recent Admin Activity
            </Text>
            <Text className="text-[#7F8993] text-[10px] font-mono">
              Audit Log
            </Text>
          </View>

          <View className="bg-[#1F2327] rounded-2xl border border-white/10 divide-y divide-white/5 shadow-sm">
            {activities.length === 0 && !loading ? (
              <View className="p-4 items-center">
                <Text className="text-[#7F8993] text-xs font-mono">
                  No administrative actions recorded yet
                </Text>
              </View>
            ) : (
              activities.map((item) => (
                <View key={item.id} className="p-4">
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center flex-1 pr-2">
                      <View
                        className={`w-1.5 h-1.5 rounded-full mr-2 ${
                          item.category === 'HUB' ? 'bg-[#E85D26]' : 'bg-[#F4A261]'
                        }`}
                      />
                      <Text
                        numberOfLines={1}
                        className="text-[#F4F6F7] text-xs font-black uppercase tracking-tight flex-1"
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

                  <Text className="text-[#A0A5AD] text-xs leading-4 mt-0.5">
                    {item.detail}
                  </Text>

                  <View className="flex-row items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                    <Text className="text-[#7F8993] text-[10px] font-mono">
                      REF: {item.id.toUpperCase()}
                    </Text>
                    <Text className="text-[#7F8993] text-[10px] font-mono">
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
          <View className="p-3.5 bg-[#1F2327] rounded-xl border border-white/5">
            <Text className="text-[#7F8993] text-xs leading-4 text-center">
              Maidaan Administrative Workspace • Platform Governance Desk
              {'\n'}
              Decisions made in review queues execute policy checks under fair play standards.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
