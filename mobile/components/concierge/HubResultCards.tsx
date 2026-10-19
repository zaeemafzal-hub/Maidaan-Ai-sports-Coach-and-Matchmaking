import React from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AgentHubData } from "../../services/agentService";

interface HubResultCardsProps {
  hubs: AgentHubData[];
  className?: string;
}

export const HubResultCards: React.FC<HubResultCardsProps> = ({
  hubs,
  className = "",
}) => {
  if (!hubs || hubs.length === 0) return null;

  return (
    <View className={`w-full mt-2.5 space-y-2.5 ${className}`}>
      {hubs.slice(0, 3).map((hub, idx) => {
        const hubDisplayName = hub.name || hub.hubName || "Sports Hub";
        const hubId = hub.id || hub.userId || `hub-${idx}`;

        return (
          <View
            key={hubId}
            accessibilityRole="text"
            accessibilityLabel={`Sports hub: ${hubDisplayName} located in ${hub.location}`}
            className="w-full p-3.5 rounded-xl bg-[#141518]/25 border border-white/[0.08]"
          >
            {/* Header: Name and Verified Badge */}
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center flex-1 mr-2">
                <Ionicons name="business" size={16} color="#E85D26" />
                <Text
                  className="text-white text-sm font-bold tracking-tight ml-1.5 flex-1"
                  numberOfLines={1}
                >
                  {hubDisplayName}
                </Text>
              </View>

              {hub.isVerified ? (
                <View className="flex-row items-center px-2 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30">
                  <Ionicons name="shield-checkmark" size={11} color="#22C55E" />
                  <Text className="text-[#22C55E] text-[10px] font-bold uppercase tracking-wider ml-1">
                    Verified Hub
                  </Text>
                </View>
              ) : (
                <View className="px-2 py-0.5 rounded-full bg-[#5C616A]/20 border border-white/[0.08]">
                  <Text className="text-[#A0A5AD] text-[10px] font-semibold">
                    Standard Hub
                  </Text>
                </View>
              )}
            </View>

            {/* Location */}
            <View className="flex-row items-center mb-2">
              <Ionicons name="location-outline" size={13} color="#A0A5AD" />
              <Text
                className="text-[#A0A5AD] text-xs font-normal ml-1"
                numberOfLines={1}
              >
                {hub.location}
              </Text>
              {hub.courtCount ? (
                <Text className="text-[#5C616A] text-xs font-medium ml-1.5">
                  • {hub.courtCount} Court{hub.courtCount === 1 ? "" : "s"}
                </Text>
              ) : null}
            </View>

            {/* Sports tags */}
            {hub.sports && hub.sports.length > 0 ? (
              <View className="flex-row flex-wrap gap-1.5 mb-2.5">
                {hub.sports.map((sport) => (
                  <View
                    key={sport}
                    className="px-2 py-0.5 rounded-md bg-[#141518]/25 border border-white/[0.06]"
                  >
                    <Text className="text-[#A0A5AD] text-[10px] font-bold uppercase tracking-wider">
                      {sport}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Footer */}
            <View className="pt-2 border-t border-white/[0.06] flex-row items-center justify-between">
              <Text className="text-[#5C616A] text-[11px] font-medium">
                {hub.contactNumber
                  ? `Contact: ${hub.contactNumber}`
                  : "Partner Venue"}
              </Text>
              <View className="flex-row items-center">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={12}
                  color="#E85D26"
                />
                <Text className="text-[#E85D26] text-[11px] font-bold ml-1">
                  Discovered Hub
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};
