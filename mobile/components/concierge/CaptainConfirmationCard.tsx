import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "../theme/Primitives";
import { Ionicons } from "../theme/Icons";
import {
  CaptainActionSummary,
  agentService,
  ActionStatus,
} from "../../services/agentService";

interface CaptainConfirmationCardProps {
  action: CaptainActionSummary;
  onActionComplete?: (updatedAction: CaptainActionSummary) => void;
  className?: string;
}

export const CaptainConfirmationCard: React.FC<
  CaptainConfirmationCardProps
> = ({ action, onActionComplete, className = "" }) => {
  const [status, setStatus] = useState<ActionStatus>(action.status);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const remaining = Date.parse(action.expiresAt) - Date.now();
    const pending = ['DRAFT', 'AWAITING_CONFIRMATION'].includes(action.status);
    setStatus(pending && remaining <= 0 ? 'EXPIRED' : action.status);
    if (!pending || !Number.isFinite(remaining) || remaining <= 0) return;
    const timeout = setTimeout(() => setStatus('EXPIRED'), remaining);
    return () => clearTimeout(timeout);
  }, [action.status, action.expiresAt]);

  const isPending = status === "AWAITING_CONFIRMATION";
  const isExecuted = status === "EXECUTED";
  const isCancelled = status === "CANCELLED";
  const isExpired = status === "EXPIRED";

  const handleConfirm = async () => {
    if (isLoading || !isPending) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await agentService.confirmAction(action.actionId);

      if (!response || response.status !== 200 || !response.data?.success) {
        const errorText = response?.error || "Failed to execute action.";
        const errLower = errorText.toLowerCase();
        const code = response?.data?.code || response?.data?.result?.code;

        if (response?.status === 410 || errLower.includes("expired")) {
          setStatus("EXPIRED");
          setErrorMessage(
            "This confirmation expired. Please ask Maidaan to prepare the action again.",
          );
        } else if (errLower.includes("full") || code === "MATCH_FULL") {
          setStatus("FAILED");
          setErrorMessage(
            "This match filled up before the request was confirmed.",
          );
        } else if (
          errLower.includes("already handled") ||
          errLower.includes("only pending") ||
          errLower.includes("not pending") ||
          code === "REQUEST_ALREADY_HANDLED" ||
          code === "INVALID_STATUS"
        ) {
          setStatus("FAILED");
          setErrorMessage("This join request has already been handled.");
        } else {
          setStatus("FAILED");
          setErrorMessage(errorText);
        }
        return;
      }

      // Successful execution confirmed by server
      setStatus("EXECUTED");
      const msg =
        response.data.message ||
        (action.type === "CREATE_MATCH"
          ? "Match created successfully!"
          : action.type === "ACCEPT_JOIN_REQUEST"
            ? "Join request accepted. Player spot is confirmed!"
            : "Join request has been declined.");
      setSuccessMessage(msg);

      if (onActionComplete) {
        onActionComplete({
          ...action,
          status: "EXECUTED",
          executionResult: response.data.result,
        });
      }
    } catch {
      setErrorMessage("Your Assistant is temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (isLoading || !isPending) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await agentService.cancelAction(action.actionId);
      if (response && response.status === 200) {
        setStatus("CANCELLED");
        if (onActionComplete) {
          onActionComplete({
            ...action,
            status: "CANCELLED",
          });
        }
      } else {
        setErrorMessage(response?.error || "Could not cancel action draft.");
      }
    } catch {
      setErrorMessage(
        "Could not cancel action draft. Please check your connection.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Render Post-Execution Success State
  if (isExecuted) {
    return (
      <View
        className={`w-full mt-3 p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 ${className}`}
      >
        <View className="flex-row items-center mb-1">
          <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
          <Text className="text-[#22C55E] text-xs font-bold uppercase tracking-wider ml-1.5">
            Action Completed
          </Text>
        </View>
        <Text className="text-white text-sm font-semibold">
          {successMessage || "Action was executed successfully."}
        </Text>
      </View>
    );
  }

  // Render Cancelled State
  if (isCancelled) {
    return (
      <View
        className={`w-full mt-3 p-4 rounded-xl bg-[#141518]/25 border border-white/[0.08] ${className}`}
      >
        <View className="flex-row items-center mb-1">
          <Ionicons name="close-circle-outline" size={16} color="#5C616A" />
          <Text className="text-[#5C616A] text-xs font-bold uppercase tracking-wider ml-1.5">
            Action Cancelled
          </Text>
        </View>
        <Text className="text-[#A0A5AD] text-xs">
          This draft was cancelled and will not mutate any fixture or player
          data.
        </Text>
      </View>
    );
  }

  // Render Expired State
  if (isExpired) {
    return (
      <View
        className={`w-full mt-3 p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 ${className}`}
      >
        <View className="flex-row items-center mb-1">
          <Ionicons name="time-outline" size={16} color="#F59E0B" />
          <Text className="text-[#F59E0B] text-xs font-bold uppercase tracking-wider ml-1.5">
            Draft Expired
          </Text>
        </View>
        <Text className="text-[#A0A5AD] text-xs">
          This confirmation expired. Please ask Maidaan to prepare the action
          again.
        </Text>
      </View>
    );
  }

  const { summary, type } = action;

  return (
    <View
      className={`w-full mt-3 p-4 rounded-xl bg-[#141518]/25 border-2 border-[#E85D26]/40 shadow-lg ${className}`}
    >
      {/* Header with Action Type */}
      <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-white/[0.08]">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-[#E85D26] mr-2" />
          <Text className="text-[#E85D26] text-xs font-black uppercase tracking-wider">
            {type === "CREATE_MATCH"
              ? "Draft: Create Fixture"
              : type === "ACCEPT_JOIN_REQUEST"
                ? "Draft: Accept Request"
                : "Draft: Reject Request"}
          </Text>
        </View>

        <View className="px-2 py-0.5 rounded-full bg-[#E85D26]/15 border border-[#E85D26]/30">
          <Text className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider">
            Awaiting Confirmation
          </Text>
        </View>
      </View>

      {/* Details by Type */}
      {type === "CREATE_MATCH" ? (
        <View className="space-y-1.5 mb-3 bg-[#141518]/25 p-3 rounded-lg border border-white/[0.06]">
          <Text className="text-white text-sm font-bold">
            {summary.title || "Match Title"}
          </Text>

          <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1 mt-1">
            <View className="flex-row items-center">
              <Text className="text-[#5C616A] text-xs font-semibold mr-1">
                Sport:
              </Text>
              <Text className="text-[#A0A5AD] text-xs font-bold uppercase">
                {summary.sport || "General"}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Text className="text-[#5C616A] text-xs font-semibold mr-1">
                Date:
              </Text>
              <Text className="text-[#A0A5AD] text-xs">
                {summary.date || "Today"}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Text className="text-[#5C616A] text-xs font-semibold mr-1">
                Time:
              </Text>
              <Text className="text-[#A0A5AD] text-xs">
                {summary.time || "TBD"}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Text className="text-[#5C616A] text-xs font-semibold mr-1">
                Venue:
              </Text>
              <Text className="text-[#A0A5AD] text-xs">
                {summary.venue || summary.area || "Lahore"}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Text className="text-[#5C616A] text-xs font-semibold mr-1">
                Capacity:
              </Text>
              <Text className="text-[#A0A5AD] text-xs">
                {summary.capacity || 10} players
              </Text>
            </View>

            <View className="flex-row items-center">
              <Text className="text-[#5C616A] text-xs font-semibold mr-1">
                Skill:
              </Text>
              <Text className="text-[#A0A5AD] text-xs capitalize">
                {summary.skillLevel || "Intermediate"}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View className="space-y-1.5 mb-3 bg-[#141518]/25 p-3 rounded-lg border border-white/[0.06]">
          <View className="flex-row items-center justify-between">
            <Text className="text-white text-sm font-bold">
              {summary.player || "Player"}
            </Text>
            <View
              className={`px-2 py-0.5 rounded-full ${
                type === "ACCEPT_JOIN_REQUEST"
                  ? "bg-[#22C55E]/15 border border-[#22C55E]/30"
                  : "bg-[#EF4444]/15 border border-[#EF4444]/30"
              }`}
            >
              <Text
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  type === "ACCEPT_JOIN_REQUEST"
                    ? "text-[#22C55E]"
                    : "text-[#EF4444]"
                }`}
              >
                {type === "ACCEPT_JOIN_REQUEST"
                  ? "Approve & Confirm"
                  : "Decline Request"}
              </Text>
            </View>
          </View>

          <Text className="text-[#A0A5AD] text-xs font-normal">
            Target Match:{" "}
            <Text className="text-white font-semibold">
              {summary.match || "Scheduled Game"}
            </Text>
          </Text>
        </View>
      )}

      {/* Error banner if present */}
      {errorMessage ? (
        <View className="p-2.5 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/30 mb-3 flex-row items-center">
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text className="text-[#EF4444] text-xs font-medium ml-1.5 flex-1">
            {errorMessage}
          </Text>
        </View>
      ) : null}

      {/* Confirmation & Cancellation Buttons (>= 44x44 Touch Target) */}
      <View className="flex-row items-center gap-2.5 pt-1">
        {/* Cancel Button */}
        <Pressable
          onPress={handleCancel}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Cancel Action Draft"
          className="flex-1 min-h-[44px] rounded-lg bg-[#141518]/25 border border-white/[0.12] items-center justify-center active:bg-[#20232A]"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#A0A5AD" />
          ) : (
            <Text className="text-[#A0A5AD] text-xs font-bold uppercase tracking-wider">
              Cancel Draft
            </Text>
          )}
        </Pressable>

        {/* Confirm Button */}
        <Pressable
          onPress={handleConfirm}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel={
            type === "CREATE_MATCH"
              ? "Confirm Create Match"
              : type === "ACCEPT_JOIN_REQUEST"
                ? "Confirm Accept Request"
                : "Confirm Reject Request"
          }
          className={`flex-1 min-h-[44px] rounded-lg items-center justify-center shadow-sm ${
            type === "REJECT_JOIN_REQUEST"
              ? "bg-[#EF4444] active:bg-[#DC2626]"
              : "bg-[#E85D26] active:bg-[#D04E1B]"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white text-xs font-black uppercase tracking-wider">
              {type === "CREATE_MATCH"
                ? "Confirm Match"
                : type === "ACCEPT_JOIN_REQUEST"
                  ? "Confirm Spot"
                  : "Confirm Reject"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};
