import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/useAuthStore";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { ArenaBadge } from "../../components/ui/ArenaBadge";
import { PrimaryButton } from "../../components/ui/PrimaryButton";

import { adminService } from "../../services/adminService";
import { AdminDashboardSummary } from "../../types";

export interface AdminActivityItem {
  id: string;
  action: string;
  category: "HUB" | "REPORT" | "PLATFORM";
  detail: string;
  timestampLabel: string;
  status: "PENDING" | "OPEN" | "REVIEWED" | "RESOLVED";
  rawDate: number;
}

export default function AdminDashboardScreen() {
  const { currentUser, roles = [] } = useAuthStore();

  const isAdmin = roles.includes("ADMIN");

  // Live operational metrics
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<AdminDashboardSummary>({
    users: { total: 0 },
    matches: { total: 0, open: 0 },
    hubs: { total: 0, verified: 0, pendingVerification: 0 },
    reports: { open: 0 },
  });

  const [activities, setActivities] = useState<AdminActivityItem[]>([]);

  const isMountedRef = React.useRef(true);

  const fetchDashboardData = useCallback(
    async (isPull = false) => {
      if (!isAdmin) return;

      try {
        if (!isPull) setLoading(true);
        setError(null);

        const [summaryRes, verifRes, reportsRes] = await Promise.all([
          adminService.getDashboardSummary(),
          adminService.getHubVerifications(),
          adminService.getReports(),
        ]);

        if (
          !summaryRes.data ||
          summaryRes.error ||
          verifRes.error ||
          reportsRes.error
        )
          throw new Error(
            summaryRes.error || verifRes.error || reportsRes.error,
          );
        if (summaryRes.data && isMountedRef.current) {
          setMetrics(summaryRes.data);
        }

        const verifications = verifRes.data?.requests || [];
        const reports = reportsRes.data?.reports || [];

        const liveItems: AdminActivityItem[] = [
          ...verifications.map((v) => ({
            id: `hub-${v.id.substring(0, 8)}`,
            action:
              v.status === "PENDING"
                ? "HUB VERIFICATION SUBMITTED"
                : `HUB ${v.status}`,
            category: "HUB" as const,
            detail: `${v.hubName} (${v.location}) — ${v.courtCount} court(s).${
              v.adminNote ? ` Admin note: "${v.adminNote}"` : ""
            }`,
            timestampLabel: v.submittedAt
              ? new Date(v.submittedAt).toLocaleDateString()
              : "RECENT",
            status: (v.status === "PENDING" ? "PENDING" : "REVIEWED") as
              "PENDING" | "REVIEWED",
            rawDate: new Date(v.updatedAt || v.submittedAt).getTime(),
          })),
          ...reports.map((r) => ({
            id: `rep-${r.id.substring(0, 8)}`,
            action: `REPORT ${r.status}`,
            category: "REPORT" as const,
            detail: `${r.category}: ${r.description}${
              r.adminNote ? ` — Note: "${r.adminNote}"` : ""
            }`,
            timestampLabel: r.createdAt
              ? new Date(r.createdAt).toLocaleDateString()
              : "RECENT",
            status: (r.status === "RESOLVED"
              ? "RESOLVED"
              : r.status === "OPEN"
                ? "OPEN"
                : "REVIEWED") as "RESOLVED" | "OPEN" | "REVIEWED",
            rawDate: new Date(r.updatedAt || r.createdAt).getTime(),
          })),
        ]
          .sort((a, b) => b.rawDate - a.rawDate)
          .slice(0, 6);

        if (isMountedRef.current) {
          setActivities(liveItems);
        }
      } catch (error) {
        console.warn('[AdminDashboard] Operational data could not be loaded:', error);
        if (isMountedRef.current) {
          setError(
            "Connection failure while loading operational data. Please retry.",
          );
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [isAdmin],
  );

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      fetchDashboardData();
      return () => {
        isMountedRef.current = false;
      };
    }, [fetchDashboardData]),
  );

  // 1. Role Guard
  if (!isAdmin) {
    return (
      <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
        <ArenaHeader
          title="Admin Desk"
          subtitle="Access Restriction"
          showBack
          fallbackRoute="/(tabs)/profile"
        />
        <View className="flex-1 items-center justify-center p-6 bg-[#0C0D0E]">
          <View className="w-16 h-16 rounded-full bg-red-950/40 items-center justify-center border border-red-500/30 mb-5">
            <Ionicons name="shield-outline" size={28} color="#EF4444" />
          </View>

          <ArenaBadge label="ADMIN ACCESS REQUIRED" variant="rust" size="md" />

          <Text className="text-white text-lg font-black uppercase tracking-tight text-center mt-3">
            Admin Access Required
          </Text>

          <Text className="text-[#8E9298] text-sm text-center mt-2 max-w-[310px] leading-5">
            This workspace is restricted to Maidaan administrators. Public
            accounts cannot access platform review queues.
          </Text>

          <View className="w-full mt-6">
            <PrimaryButton
              title="RETURN TO PROFILE"
              variant="primary"
              onPress={() => router.replace("/(tabs)/profile")}
            />
          </View>
        </View>
      </ThemedScreen>
    );
  }

  const adminName = currentUser?.name?.trim() || "Platform Admin";

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
      <ArenaHeader
        title="Admin Control Center"
        subtitle="Platform Governance & Moderation"
        showBack
        fallbackRoute="/(tabs)/profile"
        rightAction={
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            className="w-10 h-10 rounded-xl bg-[#141518]/25 border border-white/[0.08] items-center justify-center"
          >
            <Ionicons name="person-outline" size={18} color="#A0A5AD" />
          </Pressable>
        }
      />

      <ThemedScroll
        kind="form"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDashboardData(true);
            }}
            tintColor="#E85D26"
            colors={["#E85D26"]}
          />
        }
      >
        <View style={{ padding: 20, gap: 12 }}>
          <PrimaryButton
            title="BOOKING REFUNDS"
            onPress={() => router.push("/bookings?scope=refunds" as any)}
          />
          <PrimaryButton
            title="ACCOUNTS & SUPER-USERS"
            onPress={() => router.push("/admin/accounts" as any)}
          />
          <PrimaryButton
            title="MANAGE HUB OWNERS"
            onPress={() => router.push("/admin/accounts?role=HUB_OWNER" as any)}
          />
        </View>
        {/* Operational Identity Card */}
        <View className="px-5 pt-3">
          <View className="p-4 rounded-2xl bg-[#141518]/25 border border-white/[0.08] flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[#8E9298] text-[10px] font-bold uppercase tracking-widest">
                Authenticated Admin Session
              </Text>
              <Text
                numberOfLines={1}
                className="text-white text-base font-bold tracking-tight mt-0.5"
              >
                {adminName}
              </Text>
            </View>
            <View className="px-2.5 py-1 rounded-full bg-[#1B3B2B] border border-[#22C55E]/30 flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-[#22C55E] mr-1.5" />
              <Text className="text-[#22C55E] text-[10px] font-bold uppercase tracking-wider">
                ADMIN
              </Text>
            </View>
          </View>
        </View>

        {loading && !refreshing && (
          <View className="mx-5 mt-4 p-4 bg-[#141518]/25 rounded-2xl border border-white/[0.08] flex-row items-center justify-center">
            <ActivityIndicator size="small" color="#E85D26" />
            <Text className="text-[#8E9298] text-xs ml-3 font-semibold">
              Syncing operational metrics...
            </Text>
          </View>
        )}

        {error && !loading && (
          <View className="mx-5 mt-4 p-4 bg-red-950/40 rounded-2xl border border-red-500/20">
            <View className="flex-row items-center mb-1">
              <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text className="text-red-200 text-xs font-bold ml-1.5">
                Sync Error
              </Text>
            </View>
            <Text className="text-red-300 text-xs leading-4 mb-3">{error}</Text>
            <PrimaryButton
              title="RETRY SYNC"
              onPress={() => fetchDashboardData()}
            />
          </View>
        )}

        {!loading && !error ? (
          <>
            {/* Platform Overview Metrics Grid */}
            <View className="px-5 mt-5">
              <Text className="text-white text-xs font-bold uppercase tracking-wider mb-3">
                Platform Metrics Overview
              </Text>

              <View className="gap-2.5">
                {/* Row 1: Users & Matches */}
                <View className="flex-row gap-2.5">
                  <View className="flex-1 p-4 rounded-2xl bg-[#141518]/25 border border-white/[0.08]">
                    <Text className="text-[#8E9298] text-[10px] font-bold uppercase tracking-wider">
                      TOTAL PLAYERS
                    </Text>
                    <Text className="text-white text-2xl font-black mt-1">
                      {metrics.users.total}
                    </Text>
                    <Text className="text-[#8E9298] text-[10px] mt-0.5">
                      Registered accounts
                    </Text>
                  </View>

                  <View className="flex-1 p-4 rounded-2xl bg-[#141518]/25 border border-white/[0.08]">
                    <Text className="text-[#8E9298] text-[10px] font-bold uppercase tracking-wider">
                      TOTAL MATCHES
                    </Text>
                    <Text className="text-white text-2xl font-black mt-1">
                      {metrics.matches.total}
                    </Text>
                    <Text className="text-[#22C55E] text-[10px] font-semibold mt-0.5">
                      {metrics.matches.open} open fixtures
                    </Text>
                  </View>
                </View>

                {/* Row 2: Hubs Total & Verified */}
                <View className="flex-row gap-2.5">
                  <View className="flex-1 p-4 rounded-2xl bg-[#141518]/25 border border-white/[0.08]">
                    <Text className="text-[#8E9298] text-[10px] font-bold uppercase tracking-wider">
                      REGISTERED HUBS
                    </Text>
                    <Text className="text-white text-2xl font-black mt-1">
                      {metrics.hubs.total}
                    </Text>
                    <Text className="text-[#8E9298] text-[10px] mt-0.5">
                      Sports facilities
                    </Text>
                  </View>

                  <View className="flex-1 p-4 rounded-2xl bg-[#141518]/25 border border-white/[0.08]">
                    <Text className="text-[#8E9298] text-[10px] font-bold uppercase tracking-wider">
                      VERIFIED HUBS
                    </Text>
                    <Text className="text-[#22C55E] text-2xl font-black mt-1">
                      {metrics.hubs.verified}
                    </Text>
                    <Text className="text-[#22C55E] text-[10px] font-semibold mt-0.5">
                      Official badge active
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Active Governance Queues */}
            <View className="px-5 mt-5">
              <Text className="text-white text-xs font-bold uppercase tracking-wider mb-3">
                Active Review Queues
              </Text>

              <View className="flex-row gap-2.5">
                {/* Hub Verification Queue Card */}
                <Pressable
                  onPress={() => router.push("/admin/hub-verification")}
                  accessibilityRole="button"
                  accessibilityLabel="Hub Verification"
                  className="flex-1 p-4 rounded-2xl bg-[#141518]/25 border border-[#EAB308]/20"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Ionicons
                      name="shield-checkmark"
                      size={18}
                      color="#EAB308"
                    />
                    <View className="px-2 py-0.5 rounded-full bg-[#3B2C1A]">
                      <Text className="text-[#EAB308] text-[10px] font-bold">
                        {metrics.hubs.pendingVerification}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-white text-xs font-bold uppercase tracking-wider">
                    Hub Verification
                  </Text>
                  <Text className="text-[#8E9298] text-[11px] mt-1">
                    {metrics.hubs.pendingVerification === 0
                      ? "No hubs awaiting review."
                      : `${metrics.hubs.pendingVerification} awaiting audit`}
                  </Text>
                </Pressable>

                {/* Reports Queue Card */}
                <Pressable
                  onPress={() => router.push("/admin/report-review")}
                  accessibilityRole="button"
                  accessibilityLabel="Open Reports"
                  className="flex-1 p-4 rounded-2xl bg-[#141518]/25 border border-[#EF4444]/20"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Ionicons name="alert-circle" size={18} color="#EF4444" />
                    <View className="px-2 py-0.5 rounded-full bg-[#3B1A1A]">
                      <Text className="text-[#EF4444] text-[10px] font-bold">
                        {metrics.reports.open}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-white text-xs font-bold uppercase tracking-wider">
                    Open Reports
                  </Text>
                  <Text className="text-[#8E9298] text-[11px] mt-1">
                    {metrics.reports.open === 0
                      ? "No open reports."
                      : `${metrics.reports.open} reports open`}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Moderation Actions Grid */}
            <View className="px-5 mt-5">
              <Text className="text-white text-xs font-bold uppercase tracking-wider mb-3">
                Governance Workspaces
              </Text>

              <View className="gap-2.5">
                <Pressable
                  onPress={() => router.push("/admin/hub-verification")}
                  accessibilityRole="button"
                  accessibilityLabel="Hub Verification Desk"
                  className="p-4 rounded-2xl bg-[#141518]/25 border border-white/[0.08] flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 pr-3">
                    <View className="w-10 h-10 rounded-xl bg-[#1B1E22] items-center justify-center mr-3">
                      <Ionicons name="business" size={20} color="#E85D26" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-xs font-bold uppercase tracking-wide">
                        Hub Verification Desk
                      </Text>
                      <Text className="text-[#8E9298] text-[11px] mt-0.5">
                        Review facility documents and issue verified venue
                        credentials.
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#8E9298" />
                </Pressable>

                <Pressable
                  onPress={() => router.push("/admin/report-review")}
                  accessibilityRole="button"
                  accessibilityLabel="Community Moderation Desk"
                  className="p-4 rounded-2xl bg-[#141518]/25 border border-white/[0.08] flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 pr-3">
                    <View className="w-10 h-10 rounded-xl bg-[#1B1E22] items-center justify-center mr-3">
                      <Ionicons name="flag" size={20} color="#E85D26" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-xs font-bold uppercase tracking-wide">
                        Community Moderation Desk
                      </Text>
                      <Text className="text-[#8E9298] text-[11px] mt-0.5">
                        Audit player conduct disputes, spam, and sportsmanship
                        reports.
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#8E9298" />
                </Pressable>
              </View>
            </View>

            {/* Recent Platform Moderation Feed */}
            <View className="px-5 mt-6">
              <Text className="text-white text-xs font-bold uppercase tracking-wider mb-3">
                Recent Audit Activity
              </Text>

              {activities.length === 0 ? (
                <View className="p-6 rounded-2xl bg-[#141518]/25 border border-white/[0.08] items-center">
                  <Ionicons
                    name="checkmark-done-circle-outline"
                    size={28}
                    color="#4B5563"
                  />
                  <Text className="text-[#8E9298] text-xs font-semibold mt-2">
                    All platform queues are clear.
                  </Text>
                </View>
              ) : (
                <View className="gap-2.5">
                  {activities.map((item) => (
                    <View
                      key={item.id}
                      className="p-3.5 rounded-xl bg-[#141518]/25 border border-white/[0.08]"
                    >
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-white text-xs font-bold">
                          {item.action}
                        </Text>
                        <Text className="text-[#8E9298] text-[10px]">
                          {item.timestampLabel}
                        </Text>
                      </View>
                      <Text className="text-[#8E9298] text-xs leading-4">
                        {item.detail}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ThemedScroll>
    </ThemedScreen>
  );
}
