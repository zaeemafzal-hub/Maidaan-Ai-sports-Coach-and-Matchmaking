import React from "react";
import { View, Text, Pressable } from "../theme/Primitives";
import { Ionicons } from "../theme/Icons";
import { router } from "expo-router";
import { AgentJoinRequestData } from "../../services/agentService";

interface CaptainRequestCardProps {
  requests: AgentJoinRequestData[];
  className?: string;
}

export const CaptainRequestCard: React.FC<CaptainRequestCardProps> = ({
  requests,
  className = "",
}) => {
  if (!requests || requests.length === 0) return null;

  return (
    <View className={`w-full mt-2.5 space-y-2.5 ${className}`}>
      {requests.slice(0, 3).map((req) => {
        return (
          <View
            key={req.id}
            className="w-full p-3.5 rounded-xl bg-[#141518]/25 border border-white/[0.08]"
          >
            {/* Applicant Name & Status */}
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center flex-1 mr-2">
                <Ionicons
                  name="person-circle-outline"
                  size={16}
                  color="#E85D26"
                />
                <Text
                  className="text-white text-sm font-bold tracking-tight ml-1.5 flex-1"
                  numberOfLines={1}
                >
                  {req.playerName || "Player"}
                </Text>
              </View>

              <View className="px-2 py-0.5 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/30">
                <Text className="text-[#F59E0B] text-[10px] font-bold uppercase tracking-wider">
                  Pending Review
                </Text>
              </View>
            </View>

            {/* Target Match */}
            <View className="flex-row items-center mb-1">
              <Ionicons name="trophy-outline" size={13} color="#A0A5AD" />
              <Text
                className="text-[#A0A5AD] text-xs font-semibold ml-1"
                numberOfLines={1}
              >
                {req.matchTitle || "Scheduled Fixture"}
              </Text>
            </View>

            {/* Skill Level & Message */}
            {req.skillLevel ? (
              <Text className="text-[#5C616A] text-xs font-medium mb-1 capitalize">
                Skill Level: {req.skillLevel}
              </Text>
            ) : null}

            {req.message ? (
              <View className="p-2 rounded-lg bg-[#141518]/25 border border-white/[0.06] mb-2">
                <Text className="text-[#A0A5AD] text-xs italic">
                  "{req.message}"
                </Text>
              </View>
            ) : null}

            {/* Quick Action Hint */}
            <View className="pt-2 border-t border-white/[0.06] flex-row items-center justify-between">
              <Text className="text-[#5C616A] text-[11px] font-normal">
                Reply "Accept {req.playerName}" to approve
              </Text>
              <Pressable
                onPress={() => router.push("/captain/join-requests")}
                accessibilityRole="button"
                accessibilityLabel="Open Join Requests screen in Captain Dashboard"
                className="min-h-[44px] min-w-[44px] justify-center items-end"
              >
                <Text className="text-[#E85D26] text-xs font-bold">
                  Open Hub
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
};
