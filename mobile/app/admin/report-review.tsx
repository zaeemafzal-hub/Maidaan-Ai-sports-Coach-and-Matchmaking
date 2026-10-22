import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
} from "../../components/theme/Primitives";

import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "../../components/theme/Icons";
import { useAuthStore } from "../../store/useAuthStore";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { ArenaBadge } from "../../components/ui/ArenaBadge";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { IMAGES } from "../../constants/images";
import { AdminReport, ReportCategory, ReportStatus } from "../../types";
import { adminService } from "../../services/adminService";

// Domain Metadata
const CATEGORY_META: Record<
  ReportCategory,
  {
    label: string;
    badgeVariant: "rust" | "stone" | "olive";
    description: string;
  }
> = {
  CONDUCT: {
    label: "CONDUCT",
    badgeVariant: "rust",
    description: "Player sportsmanship or sideline conduct violation",
  },
  HARASSMENT: {
    label: "HARASSMENT",
    badgeVariant: "rust",
    description: "Verbal aggression or coordinator harassment report",
  },
  UNSAFE_BEHAVIOR: {
    label: "UNSAFE BEHAVIOR",
    badgeVariant: "rust",
    description: "Reckless pitch tackle or equipment safety issue",
  },
  SPAM: {
    label: "SPAM",
    badgeVariant: "stone",
    description: "Repeated unauthorized slot promotion or unsolicited links",
  },
  OTHER: {
    label: "OTHER",
    badgeVariant: "stone",
    description: "General dispute requiring coordinator audit",
  },
};

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; badgeVariant: "rust" | "olive" | "stone"; hint: string }
> = {
  OPEN: {
    label: "OPEN",
    badgeVariant: "rust",
    hint: "Awaiting administrative conduct review",
  },
  FOLLOW_UP: {
    label: "FOLLOW-UP",
    badgeVariant: "rust",
    hint: "Additional coordinator clarification needed",
  },
  RESOLVED: {
    label: "RESOLVED",
    badgeVariant: "olive",
    hint: "Platform review complete; fair play notice recorded",
  },
  DISMISSED: {
    label: "DISMISSED",
    badgeVariant: "stone",
    hint: "No further platform review required",
  },
};

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
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
  const { currentUser, roles = [] } = useAuthStore();

  const isAdmin = roles.includes("ADMIN");

  // Live state
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeFilter, setActiveFilter] = useState<
    "OPEN" | "FOLLOW_UP" | "RESOLVED" | "DISMISSED" | "ALL"
  >("OPEN");

  // Confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    action: "RESOLVE" | "DISMISS" | "FOLLOW_UP";
    report: AdminReport;
  } | null>(null);

  const [adminNoteInput, setAdminNoteInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const [inspectReport, setInspectReport] = useState<AdminReport | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getReports();
      if (res.data?.reports) {
        setReports(res.data.reports);
      } else {
        setError(res.error || "Failed to retrieve reports.");
      }
    } catch (err: any) {
      console.error("Failed to load admin reports:", err);
      setError(err?.message || "Unable to connect to administration server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        fetchReports();
      }
    }, [isAdmin, fetchReports]),
  );

  // =========================================================================
  // 1. ROLE GUARD: NON-ADMIN ACCESS RESTRICTION
  // =========================================================================
  const displayedReports = useMemo(() => {
    switch (activeFilter) {
      case "OPEN":
        return reports.filter((r) => r.status === "OPEN");
      case "FOLLOW_UP":
        return reports.filter((r) => r.status === "FOLLOW_UP");
      case "RESOLVED":
        return reports.filter((r) => r.status === "RESOLVED");
      case "DISMISSED":
        return reports.filter((r) => r.status === "DISMISSED");
      case "ALL":
      default:
        return reports;
    }
  }, [reports, activeFilter]);

  if (!isAdmin) {
    return (
      <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
        <ArenaHeader
          title="Report Review"
          subtitle="Access Restriction"
          showBack
          onBack={() => router.replace("/(tabs)/discover")}
        />
        <View className="flex-1 items-center justify-center p-6 bg-[#0C0D0E]">
          <View className="w-16 h-16 rounded-full bg-[#F4A261]/10 items-center justify-center border border-[#F4A261]/30 mb-5">
            <Ionicons name="shield-outline" size={28} color="#F4A261" />
          </View>

          <ArenaBadge label="ADMIN REQUIRED" variant="rust" size="md" />

          <Text className="text-[#FFFFFF] text-lg font-black uppercase tracking-tight text-center mt-3">
            Admin Access Required
          </Text>

          <Text className="text-[#A0A5AD] text-sm text-center mt-2 max-w-[310px] leading-5">
            This review desk is restricted to Maidaan administrators.
          </Text>

          <View className="w-full mt-6 space-y-3">
            <PrimaryButton
              title="RETURN TO DISCOVER"
              variant="primary"
              onPress={() => router.replace("/(tabs)/discover")}
            />
          </View>
        </View>
      </ThemedScreen>
    );
  }

  // =========================================================================
  // 2. COUNTS & FILTERING DERIVATIONS
  // =========================================================================
  const openCount = reports.filter((r) => r.status === "OPEN").length;
  const followUpCount = reports.filter((r) => r.status === "FOLLOW_UP").length;
  const resolvedCount = reports.filter((r) => r.status === "RESOLVED").length;
  const dismissedCount = reports.filter((r) => r.status === "DISMISSED").length;

  // =========================================================================
  // 3. ACTION HANDLERS
  // =========================================================================
  const handleOpenConfirm = (
    action: "RESOLVE" | "DISMISS" | "FOLLOW_UP",
    report: AdminReport,
  ) => {
    setDecisionError(null);
    setConfirmModal({ action, report });
    setAdminNoteInput(report.adminNote || "");
  };

  const handleConfirmDecision = async () => {
    if (!confirmModal || isSubmitting) return;
    const { action, report } = confirmModal;

    const trimmedNote = adminNoteInput.trim().slice(0, 300);

    try {
      setIsSubmitting(true);
      setDecisionError(null);
      const res = await adminService.reviewReport(
        report.id,
        action,
        trimmedNote || undefined,
      );
      if (res.status === 409) {
        setConfirmModal(null);
        setInspectReport(null);
        setAdminNoteInput("");
        await fetchReports();
        return;
      }
      if (res.data?.report) {
        const updated = res.data.report;

        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? updated : r)),
        );

        setConfirmModal(null);
        setAdminNoteInput("");
        if (inspectReport?.id === report.id) {
          setInspectReport(updated);
        }
      } else {
        throw new Error(res.error || "Failed to record report review.");
      }
    } catch (err: any) {
      console.error("Failed to review report:", err);
      setDecisionError(err?.message || "Could not record review decision. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
      {/* Modern Athletic Header */}
      <ArenaHeader
        title="Report Review"
        subtitle="Fair Play & Conduct"
        showBack
        onBack={() => router.replace("/admin/dashboard")}
      />

      <ThemedScroll
        kind="form"
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        {/* Banner */}
        <View className="px-4 pt-3">
          <View style={{ height: 80 }}
            className="w-full rounded-2xl overflow-hidden border border-white/[0.08] relative bg-[#141518]/25">
            <Image
              source={IMAGES.arenaGround}
              className="absolute inset-0 w-full h-full opacity-35"
              resizeMode="cover"
            />
            <View className="absolute inset-0 px-4 py-3 flex-row items-center justify-between bg-gradient-to-r from-[#0C0D0E]/80 to-transparent">
              <View className="flex-1 pr-2">
                <Text className="text-[#5C616A] text-[10px] font-mono uppercase tracking-widest font-bold">
                  Fair Play Governance
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-[#FFFFFF] text-base font-black uppercase tracking-tight"
                >
                  Conduct & Safety Audit
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

        {/* Page Title & Context */}
        <View className="px-4 pt-3 pb-1">
          <Text className="text-[#FFFFFF] text-xl font-black uppercase tracking-tight">
            User Conduct Reports
          </Text>
          <Text className="text-[#A0A5AD] text-xs leading-4 mt-0.5">
            Audit user-submitted conduct and safety concerns. Review incident
            summaries, verify match context, and resolve platform reports.
          </Text>
        </View>

        {/* SUMMARY STRIP */}
        <View className="px-4 mt-3">
          <View className="flex-row gap-2">
            {/* OPEN */}
            <Pressable
              onPress={() => setActiveFilter("OPEN")}
              className={`flex-1 rounded-2xl p-3.5 border ${
                activeFilter === "OPEN"
                  ? "bg-[#F4A261]/15 border-[#F4A261]"
                  : "bg-[#141518]/25 border-white/[0.08]"
              }`}
            >
              <Text className="text-[#5C616A] text-[10px] font-mono uppercase tracking-wider font-bold">
                OPEN
              </Text>
              <Text className="text-[#F4A261] text-2xl font-black tracking-tight mt-0.5">
                {openCount}
              </Text>
              <Text className="text-[#A0A5AD] text-[10px] font-medium mt-0.5">
                Unreviewed
              </Text>
            </Pressable>

            {/* FOLLOW-UP */}
            <Pressable
              onPress={() => setActiveFilter("FOLLOW_UP")}
              className={`flex-1 rounded-2xl p-3.5 border ${
                activeFilter === "FOLLOW_UP"
                  ? "bg-[#1B1D22] border-white/30"
                  : "bg-[#141518]/25 border-white/[0.08]"
              }`}
            >
              <Text className="text-[#5C616A] text-[10px] font-mono uppercase tracking-wider font-bold">
                FOLLOW-UP
              </Text>
              <Text className="text-[#FFFFFF] text-2xl font-black tracking-tight mt-0.5">
                {followUpCount}
              </Text>
              <Text className="text-[#A0A5AD] text-[10px] font-medium mt-0.5">
                Clarification
              </Text>
            </Pressable>

            {/* RESOLVED */}
            <Pressable
              onPress={() => setActiveFilter("RESOLVED")}
              className={`flex-1 rounded-2xl p-3.5 border ${
                activeFilter === "RESOLVED"
                  ? "bg-[#E85D26]/15 border-[#E85D26]"
                  : "bg-[#141518]/25 border-white/[0.08]"
              }`}
            >
              <Text className="text-[#5C616A] text-[10px] font-mono uppercase tracking-wider font-bold">
                RESOLVED
              </Text>
              <Text className="text-[#E85D26] text-2xl font-black tracking-tight mt-0.5">
                {resolvedCount}
              </Text>
              <Text className="text-[#A0A5AD] text-[10px] font-medium mt-0.5">
                Complete
              </Text>
            </Pressable>
          </View>
        </View>

        {/* FILTER CHIPS */}
        <View className="px-4 mt-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row"
          >
            <View className="flex-row space-x-1.5 bg-[#141518]/25 p-1 rounded-xl border border-white/[0.08]">
              {(
                [
                  { id: "OPEN", label: `Open (${openCount})` },
                  { id: "FOLLOW_UP", label: `Follow-Up (${followUpCount})` },
                  { id: "RESOLVED", label: `Resolved (${resolvedCount})` },
                  { id: "DISMISSED", label: `Dismissed (${dismissedCount})` },
                  { id: "ALL", label: `All (${reports.length})` },
                ] as const
              ).map((tab) => {
                const isSelected = activeFilter === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setActiveFilter(tab.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${tab.label}`}
                    className={`px-3 py-2 items-center justify-center rounded-lg ${
                      isSelected ? "bg-[#E85D26]" : "bg-transparent"
                    }`}
                  >
                    <Text
                      numberOfLines={1}
                      className={`text-xs uppercase font-bold ${
                        isSelected ? "text-[#0C0D0E]" : "text-[#A0A5AD]"
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

        {/* REPORT LISTING SECTION */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text
              accessibilityRole="header"
              className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold"
            >
              Conduct Reports
            </Text>
            <Text className="text-[#5C616A] text-[10px] font-mono">
              {displayedReports.length} Listed
            </Text>
          </View>

          {/* LOADING STATE */}
          {loading ? (
            <View className="bg-[#141518]/25 rounded-2xl p-8 border border-white/[0.08] items-center my-2">
              <ActivityIndicator size="small" color="#E85D26" />
              <Text className="text-[#A0A5AD] text-xs font-mono mt-3 uppercase tracking-wider">
                Loading Conduct Reports...
              </Text>
            </View>
          ) : error ? (
            <View className="bg-[#141518]/25 rounded-2xl p-6 border border-[#F4A261]/30 items-center my-2">
              <Ionicons name="alert-circle-outline" size={28} color="#F4A261" />
              <Text className="text-[#FFFFFF] text-sm font-black uppercase tracking-tight text-center mt-2">
                Failed to Load Reports
              </Text>
              <Text className="text-[#A0A5AD] text-xs text-center mt-1 leading-4">
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
            <View className="bg-[#141518]/25 rounded-2xl p-6 border border-white/[0.08] items-center my-2">
              <View className="w-12 h-12 rounded-full bg-[#1B1D22] border border-white/[0.08] items-center justify-center mb-3">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={24}
                  color="#A0A5AD"
                />
              </View>

              <Text className="text-[#FFFFFF] text-sm font-black uppercase tracking-tight text-center">
                {activeFilter === "OPEN"
                  ? "No Reports Waiting"
                  : "No Reports in this Status"}
              </Text>

              <Text className="text-[#A0A5AD] text-xs text-center mt-1 max-w-[260px] leading-4">
                {activeFilter === "OPEN"
                  ? "New conduct and safety reports will appear here for review."
                  : `No conduct reports matching the "${activeFilter}" filter.`}
              </Text>

              <View className="mt-4 w-full max-w-[220px]">
                <PrimaryButton
                  title="RETURN TO ADMIN DESK"
                  variant="outline"
                  onPress={() => router.replace("/admin/dashboard")}
                />
              </View>
            </View>
          ) : (
            displayedReports.map((item) => {
              const categoryMeta =
                CATEGORY_META[item.category] || CATEGORY_META.OTHER;
              const statusMeta =
                STATUS_CONFIG[item.status] || STATUS_CONFIG.OPEN;

              const isOpen = item.status === "OPEN";
              const isFollowUp = item.status === "FOLLOW_UP";
              const isResolved = item.status === "RESOLVED";

              const reporterDisplay = item.reporterName || "Anonymous";
              const reportedDisplay =
                item.reportedUserName || "Unknown Account";

              return (
                <View
                  key={item.id}
                  className="bg-[#141518]/25 rounded-2xl border border-white/[0.08] p-4 mb-3 shadow-sm"
                >
                  {/* Top Bar: Category & Status Badges */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="bg-[#1B1D22] px-2.5 py-0.5 rounded-lg border border-white/[0.08] mr-2">
                        <Text className="text-[#A0A5AD] text-[10px] font-mono font-bold uppercase">
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
                  <View className="mt-3 pt-2.5 border-t border-white/[0.08] flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold">
                        Reporter
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="text-[#FFFFFF] text-xs font-bold uppercase mt-0.5"
                      >
                        {reporterDisplay}
                      </Text>
                    </View>

                    <View className="flex-1 pl-2 items-end">
                      <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold">
                        Reported Account
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="text-[#FFFFFF] text-xs font-bold uppercase mt-0.5 text-right"
                      >
                        {reportedDisplay}
                      </Text>
                    </View>
                  </View>

                  {/* Incident Summary */}
                  <View className="mt-2.5 p-3 bg-[#1B1D22] rounded-xl border border-white/[0.08]">
                    <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold mb-1">
                      Incident Summary
                    </Text>
                    <Text className="text-[#FFFFFF] text-xs leading-4 font-medium">
                      {item.description}
                    </Text>
                    <Text className="text-[#5C616A] text-[10px] font-mono mt-2">
                      Submitted {formatTimeAgo(item.createdAt)}
                    </Text>
                  </View>

                  {/* Match Context Box */}
                  {item.matchId ? (
                    <View className="mt-2.5 p-3 bg-[#1B1D22] rounded-xl border border-white/[0.08]">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold">
                          Associated Match
                        </Text>
                        <Text className="text-[#E85D26] text-[10px] font-mono">
                          {item.matchId.slice(0, 8).toUpperCase()}
                        </Text>
                      </View>

                      <Text
                        className="text-[#FFFFFF] text-xs font-black uppercase tracking-tight"
                        numberOfLines={1}
                      >
                        {item.matchTitle || "Unnamed Match"}
                      </Text>

                      <View className="flex-row items-center justify-between mt-1.5 pt-1.5 border-t border-white/[0.08]">
                        <Text
                          className="text-[#A0A5AD] text-[10px] font-mono"
                          numberOfLines={1}
                        >
                          {(item.matchSport || "SPORTS").toUpperCase()} • Match
                          Ref
                        </Text>

                        <Pressable
                          onPress={() => router.push(`/match/${item.matchId}`)}
                          accessibilityRole="button"
                          accessibilityLabel={`View match ${item.matchTitle || item.matchId}`}
                          className="flex-row items-center"
                        >
                          <Text className="text-[#E85D26] text-[10px] font-bold uppercase mr-1">
                            View Match
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={11}
                            color="#E85D26"
                          />
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  {/* Admin Note if already added */}
                  {item.adminNote ? (
                    <View className="mt-2.5 p-2.5 bg-[#1B1D22] rounded-xl border border-white/[0.08]">
                      <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold">
                        Admin Note:
                      </Text>
                      <Text className="text-[#FFFFFF] text-xs leading-4 mt-0.5">
                        {item.adminNote}
                      </Text>
                    </View>
                  ) : null}

                  {/* Review Actions */}
                  <View className="mt-3 pt-2.5 border-t border-white/[0.08]">
                    {isOpen ? (
                      <View>
                        <View className="flex-row gap-2">
                          {/* RESOLVE BUTTON */}
                          <Pressable
                            onPress={() => handleOpenConfirm("RESOLVE", item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Resolve report ${item.id}`}
                            className="flex-1 py-3 rounded-xl bg-[#E85D26] border border-[#E85D26] items-center justify-center active:opacity-90"
                          >
                            <Text className="text-[#0C0D0E] text-xs font-black uppercase tracking-wider">
                              Resolve Report
                            </Text>
                          </Pressable>

                          {/* DISMISS BUTTON */}
                          <Pressable
                            onPress={() => handleOpenConfirm("DISMISS", item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Dismiss report ${item.id}`}
                            className="flex-1 py-3 rounded-xl bg-[#1B1D22] border border-white/[0.08] items-center justify-center active:bg-white/5"
                          >
                            <Text className="text-[#FFFFFF] text-xs font-bold uppercase tracking-wide">
                              Dismiss
                            </Text>
                          </Pressable>
                        </View>

                        {/* NEEDS FOLLOW-UP ACTION */}
                        <Pressable
                          onPress={() => handleOpenConfirm("FOLLOW_UP", item)}
                          accessibilityRole="button"
                          accessibilityLabel={`Mark report ${item.id} as needing follow up`}
                          className="mt-2 py-2.5 rounded-xl bg-[#1B1D22] border border-white/[0.08] items-center justify-center active:bg-white/5"
                        >
                          <Text className="text-[#A0A5AD] text-xs font-bold uppercase">
                            Needs Follow-Up
                          </Text>
                        </Pressable>
                      </View>
                    ) : isFollowUp ? (
                      <View>
                        <View className="p-3 bg-[#F4A261]/10 rounded-xl border border-[#F4A261]/30 mb-2.5 flex-row items-center justify-between">
                          <View className="flex-row items-center flex-1 pr-2">
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color="#F4A261"
                            />
                            <View className="ml-2 flex-1">
                              <Text className="text-[#F4A261] text-xs font-black uppercase tracking-tight">
                                Follow-up Required
                              </Text>
                              <Text className="text-[#A0A5AD] text-[10px]">
                                Additional platform review is needed later.
                              </Text>
                            </View>
                          </View>
                          <ArenaBadge
                            label="FOLLOW-UP"
                            variant="rust"
                            size="sm"
                          />
                        </View>

                        <View className="flex-row gap-2">
                          <Pressable
                            onPress={() => handleOpenConfirm("RESOLVE", item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Resolve report ${item.id}`}
                            className="flex-1 py-3 rounded-xl bg-[#E85D26] border border-[#E85D26] items-center justify-center active:opacity-90"
                          >
                            <Text className="text-[#0C0D0E] text-xs font-black uppercase tracking-wider">
                              Resolve
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleOpenConfirm("DISMISS", item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Dismiss report ${item.id}`}
                            className="flex-1 py-3 rounded-xl bg-[#1B1D22] border border-white/[0.08] items-center justify-center active:bg-white/5"
                          >
                            <Text className="text-[#FFFFFF] text-xs font-bold uppercase tracking-wide">
                              Dismiss
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : isResolved ? (
                      <View className="p-3 bg-[#E85D26]/10 rounded-xl border border-[#E85D26]/30 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#E85D26"
                          />
                          <View className="ml-2">
                            <Text className="text-[#E85D26] text-xs font-black uppercase tracking-tight">
                              Resolved
                            </Text>
                            <Text className="text-[#A0A5AD] text-[10px] font-mono">
                              Platform review complete
                            </Text>
                          </View>
                        </View>
                        <ArenaBadge
                          label="RESOLVED"
                          variant="olive"
                          size="sm"
                        />
                      </View>
                    ) : (
                      <View className="p-3 bg-[#1B1D22] rounded-xl border border-white/[0.08] flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons
                            name="close-circle-outline"
                            size={18}
                            color="#A0A5AD"
                          />
                          <View className="ml-2">
                            <Text className="text-[#FFFFFF] text-xs font-bold uppercase tracking-tight">
                              Dismissed
                            </Text>
                            <Text className="text-[#5C616A] text-[10px] font-mono">
                              No further review required
                            </Text>
                          </View>
                        </View>
                        <ArenaBadge
                          label="DISMISSED"
                          variant="stone"
                          size="sm"
                        />
                      </View>
                    )}

                    {/* Secondary Action: Inspect Case Details Inline */}
                    <Pressable
                      onPress={() => setInspectReport(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`View full report sheet for ${item.id}`}
                      className="mt-2.5 pt-2 border-t border-white/[0.08] flex-row items-center justify-between"
                    >
                      <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold">
                        View Case Details Sheet
                      </Text>
                      <View className="flex-row items-center">
                        <Text className="text-[#A0A5AD] text-[10px] font-bold mr-1">
                          {item.id.slice(0, 8).toUpperCase()}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={12}
                          color="#A0A5AD"
                        />
                      </View>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ThemedScroll>

      {/* One native window: switch between inspection and confirmation inside it. */}
      {(confirmModal || inspectReport) ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (isSubmitting) return;
            if (confirmModal) {
              setConfirmModal(null);
              setAdminNoteInput("");
            } else {
              setInspectReport(null);
            }
          }}
        >
          {confirmModal ? (
            <View className="flex-1 bg-[#0C0D0E]/85 items-center justify-center p-5">
              <View className="w-full max-w-sm bg-[#141518]/25 rounded-2xl p-6 border border-white/[0.08] shadow-2xl">
                {confirmModal ? (
                  <>
                    <View
                      className={`w-12 h-12 rounded-xl items-center justify-center mb-3 ${
                        confirmModal.action === "RESOLVE"
                          ? "bg-[#E85D26]"
                          : confirmModal.action === "DISMISS"
                            ? "bg-[#1B1D22] border border-white/[0.08]"
                            : "bg-[#F4A261]/20 border border-[#F4A261]/40"
                      }`}
                    >
                      <Ionicons
                        name={
                          confirmModal.action === "RESOLVE"
                            ? "checkmark-sharp"
                            : confirmModal.action === "DISMISS"
                              ? "close-sharp"
                              : "alert-circle-outline"
                        }
                        size={24}
                        color={
                          confirmModal.action === "RESOLVE" ? "#0C0D0E" : "#FFFFFF"
                        }
                      />
                    </View>

                    <ArenaBadge
                      label={
                        confirmModal.action === "RESOLVE"
                          ? "RESOLVE REPORT"
                          : confirmModal.action === "DISMISS"
                            ? "DISMISS REPORT"
                            : "NEEDS FOLLOW-UP"
                      }
                      variant={
                        confirmModal.action === "RESOLVE"
                          ? "olive"
                          : confirmModal.action === "DISMISS"
                            ? "stone"
                            : "rust"
                      }
                      size="sm"
                    />

                    <Text className="text-[#FFFFFF] text-lg font-black uppercase tracking-tight mt-2">
                      {confirmModal.action === "RESOLVE"
                        ? "Resolve Report?"
                        : confirmModal.action === "DISMISS"
                          ? "Dismiss Report?"
                          : "Needs Follow-Up?"}
                    </Text>

                    <Text className="text-[#A0A5AD] text-xs leading-4 mt-1">
                      {confirmModal.action === "RESOLVE"
                        ? "This will record platform review completion for this conduct report."
                        : confirmModal.action === "DISMISS"
                          ? "Use this when the submitted report does not require further platform action."
                          : "This marks the report as requiring additional coordinator follow-up."}
                    </Text>

                    {/* Case snapshot */}
                    <View className="my-3 p-3 bg-[#1B1D22] rounded-xl border border-white/[0.08]">
                      <Text
                        className="text-[#FFFFFF] text-xs font-black uppercase"
                        numberOfLines={1}
                      >
                        {confirmModal.report.id.slice(0, 8).toUpperCase()} •{" "}
                        {CATEGORY_META[confirmModal.report.category]?.label ||
                          "REPORT"}
                      </Text>
                      <Text
                        className="text-[#A0A5AD] text-xs mt-0.5"
                        numberOfLines={2}
                      >
                        {confirmModal.report.description}
                      </Text>
                    </View>

                    {/* Optional local admin note input */}
                    <View className="mb-3">
                      <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold mb-1.5">
                        Admin Note (Optional)
                      </Text>
                      <TextInput
                        value={adminNoteInput}
                        onChangeText={setAdminNoteInput}
                        maxLength={300}
                        editable={!isSubmitting}
                        placeholder="e.g. Verified with match coordinator..."
                        placeholderTextColor="#5C616A"
                        className="bg-[#1B1D22] border border-white/[0.08] p-2.5 rounded-xl text-[#FFFFFF] text-xs min-h-[42px]"
                      />
                      <Text className="text-[#5C616A] text-[9px] font-mono text-right mt-1">
                        {adminNoteInput.length}/300
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    {decisionError ? (
                      <Text accessibilityRole="alert" className="text-red-300 text-xs mb-3">
                        {decisionError}
                      </Text>
                    ) : null}
                    <View className="space-y-2 mt-1">
                      <PrimaryButton
                        title={
                          isSubmitting
                            ? "SAVING DECISION..."
                            : confirmModal.action === "RESOLVE"
                              ? "RESOLVE REPORT"
                              : confirmModal.action === "DISMISS"
                                ? "DISMISS REPORT"
                                : "NEEDS FOLLOW-UP"
                        }
                        variant={
                          confirmModal.action === "RESOLVE" ? "primary" : "outline"
                        }
                        disabled={isSubmitting}
                        onPress={handleConfirmDecision}
                      />

                      <Pressable
                        disabled={isSubmitting}
                        onPress={() => {
                          setConfirmModal(null);
                          setAdminNoteInput("");
                        }}
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
          ) : (
            <View className="flex-1 bg-[#0C0D0E]/85 justify-end">
              <View className="bg-[#141518]/25 rounded-t-3xl p-6 border-t border-white/[0.08] "
                style={{ height: "85%" }}>
                {inspectReport ? (
                  <ThemedScroll kind="form" style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View className="flex-row items-center justify-between pb-3 border-b border-white/[0.08]">
                      <View className="flex-1 pr-2">
                        <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold">
                          Case Details Audit Sheet
                        </Text>
                        <Text className="text-[#FFFFFF] text-lg font-black uppercase tracking-tight mt-0.5">
                          Report #{inspectReport.id.slice(0, 8).toUpperCase()}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setInspectReport(null)}
                        className="w-9 h-9 rounded-xl bg-[#1B1D22] items-center justify-center border border-white/[0.08]"
                      >
                        <Ionicons name="close" size={20} color="#FFFFFF" />
                      </Pressable>
                    </View>

                    {/* Table Breakdown */}
                    <View className="mt-4 bg-[#1B1D22] rounded-2xl border border-white/[0.08] p-4 space-y-3">
                      <View>
                        <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold">
                          Incident Category
                        </Text>
                        <Text className="text-[#FFFFFF] text-xs font-bold mt-0.5">
                          {
                            (
                              CATEGORY_META[inspectReport.category] ||
                              CATEGORY_META.OTHER
                            ).label
                          }{" "}
                          •{" "}
                          {
                            (
                              CATEGORY_META[inspectReport.category] ||
                              CATEGORY_META.OTHER
                            ).description
                          }
                        </Text>
                      </View>

                      <View className="pt-2 border-t border-white/[0.08]">
                        <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold">
                          Reporting Player
                        </Text>
                        <Text className="text-[#FFFFFF] text-xs font-bold mt-0.5">
                          {inspectReport.reporterName || "Anonymous"}
                        </Text>
                      </View>

                      <View className="pt-2 border-t border-white/[0.08]">
                        <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold">
                          Reported Account
                        </Text>
                        <Text className="text-[#FFFFFF] text-xs font-bold mt-0.5">
                          {inspectReport.reportedUserName || "Unknown Account"}
                        </Text>
                      </View>

                      <View className="pt-2 border-t border-white/[0.08]">
                        <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold">
                          Full Incident Statement
                        </Text>
                        <Text className="text-[#FFFFFF] text-xs leading-4 mt-0.5">
                          {inspectReport.description}
                        </Text>
                      </View>

                      {inspectReport.matchId ? (
                        <View className="pt-2 border-t border-white/[0.08]">
                          <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold">
                            Match Reference
                          </Text>
                          <Text className="text-[#FFFFFF] text-xs font-mono font-bold mt-0.5">
                            {inspectReport.matchTitle
                              ? `${inspectReport.matchTitle} (${inspectReport.matchId})`
                              : inspectReport.matchId}
                          </Text>
                        </View>
                      ) : null}

                      {inspectReport.adminNote ? (
                        <View className="pt-2 border-t border-white/[0.08]">
                          <Text className="text-[#5C616A] text-[10px] font-mono uppercase font-bold">
                            Recorded Audit Note
                          </Text>
                          <Text className="text-[#FFFFFF] text-xs leading-4 mt-0.5">
                            {inspectReport.adminNote}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Regulatory Notice */}
                    <View className="mt-3 p-3.5 bg-[#1B1D22] rounded-xl border border-white/[0.08]">
                      <Text className="text-[#5C616A] text-xs leading-4">
                        Moderation decisions are administrative platform actions
                        under Maidaan Fair Play standards.
                      </Text>
                    </View>

                    {/* Action buttons if open or follow-up */}
                    {inspectReport.status === "OPEN" ? (
                      <View className="space-y-2 mt-4">
                        <View className="flex-row gap-2">
                          <Pressable
                            onPress={() => {
                              handleOpenConfirm("RESOLVE", inspectReport);
                            }}
                            className="flex-1 py-3 rounded-xl bg-[#E85D26] border border-[#E85D26] items-center justify-center active:opacity-90"
                          >
                            <Text className="text-[#0C0D0E] text-xs font-black uppercase tracking-wider">
                              Resolve
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => {
                              handleOpenConfirm("DISMISS", inspectReport);
                            }}
                            className="flex-1 py-3 rounded-xl bg-[#1B1D22] border border-white/[0.08] items-center justify-center active:bg-white/5"
                          >
                            <Text className="text-[#FFFFFF] text-xs font-bold uppercase tracking-wide">
                              Dismiss
                            </Text>
                          </Pressable>
                        </View>

                        <Pressable
                          onPress={() => {
                            handleOpenConfirm("FOLLOW_UP", inspectReport);
                          }}
                          className="py-2.5 rounded-xl bg-[#1B1D22] border border-white/[0.08] items-center justify-center active:bg-white/5"
                        >
                          <Text className="text-[#A0A5AD] text-xs font-bold uppercase">
                            Needs Follow-Up
                          </Text>
                        </Pressable>
                      </View>
                    ) : inspectReport.status === "FOLLOW_UP" ? (
                      <View className="flex-row gap-2 mt-4">
                        <Pressable
                          onPress={() => {
                            handleOpenConfirm("RESOLVE", inspectReport);
                          }}
                          className="flex-1 py-3 rounded-xl bg-[#E85D26] border border-[#E85D26] items-center justify-center active:opacity-90"
                        >
                          <Text className="text-[#0C0D0E] text-xs font-black uppercase tracking-wider">
                            Resolve
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            handleOpenConfirm("DISMISS", inspectReport);
                          }}
                          className="flex-1 py-3 rounded-xl bg-[#1B1D22] border border-white/[0.08] items-center justify-center active:bg-white/5"
                        >
                          <Text className="text-[#FFFFFF] text-xs font-bold uppercase tracking-wide">
                            Dismiss
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
                  </ThemedScroll>
                ) : null}
              </View>
            </View>
          )}
        </Modal>
      ) : null}
    </ThemedScreen>
  );
}
