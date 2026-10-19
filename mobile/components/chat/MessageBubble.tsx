import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ChatMessage } from "../../services/chatService";

export interface OptimisticChatMessage extends ChatMessage {
  status?: "SENDING" | "SENT" | "FAILED";
  clientMessageId?: string;
}

interface MessageBubbleProps {
  message: OptimisticChatMessage;
  currentUserId: string;
  isGroup?: boolean;
  onRetry?: (message: OptimisticChatMessage) => void;
}

const formatBubbleTime = (dateStr?: string): string => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  isGroup = false,
  onRetry,
}) => {
  // System notification banner
  if (message.senderId === "system") {
    return (
      <View className="w-full my-3 items-center">
        <View className="px-3.5 py-1.5 rounded-full bg-[#E85D26]/15 border border-[#E85D26]/30 flex-row items-center">
          <Ionicons name="shield-checkmark" size={13} color="#E85D26" />
          <Text className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider ml-1.5">
            {message.body}
          </Text>
        </View>
      </View>
    );
  }

  const isOutgoing = message.senderId === currentUserId;
  const isCaptain = message.senderRole === "TEAM_CAPTAIN";
  const status = message.status || "SENT";

  return (
    <View
      className={`w-full my-1 flex-row ${
        isOutgoing ? "justify-end" : "justify-start"
      }`}
    >
      <View
        style={{ maxWidth: "82%" }}
        className={`p-3.5 rounded-2xl ${
          isOutgoing
            ? "bg-[#E85D26] rounded-tr-xs"
            : "bg-[#141518]/25 border border-white/[0.08] rounded-tl-xs shadow-xs"
        }`}
      >
        {/* In Group Chat: Show Sender Name and Role Distinction for incoming messages */}
        {!isOutgoing && isGroup && (
          <View className="flex-row items-center mb-1 flex-wrap">
            <Text
              style={{ color: "#FFFFFF" }}
              className="text-white text-[11px] font-bold uppercase tracking-wide mr-1.5"
            >
              {message.senderName || "Athlete"}
            </Text>
            {isCaptain ? (
              <View className="bg-[#E85D26]/15 border border-[#E85D26] px-1.5 py-0.5 rounded-xs">
                <Text className="text-[#E85D26] text-[8px] font-black uppercase tracking-wider">
                  TEAM CAPTAIN
                </Text>
              </View>
            ) : (
              <Text
                style={{ color: "#5C616A" }}
                className="text-[#5C616A] text-[9px] font-bold uppercase tracking-wider"
              >
                • PLAYER
              </Text>
            )}
          </View>
        )}

        {/* Message Body */}
        <Text
          style={{ color: isOutgoing ? "#0C0D0E" : "#FFFFFF" }}
          className={`text-sm leading-relaxed ${
            isOutgoing
              ? "text-[#0C0D0E] font-semibold"
              : "text-white font-medium"
          }`}
        >
          {message.body}
        </Text>

        {/* Footer: Time + Status indicator */}
        <View className="flex-row items-center justify-end mt-1 space-x-1">
          <Text
            style={{ color: isOutgoing ? "rgba(12, 13, 14, 0.7)" : "#5C616A" }}
            className={`text-[10px] font-bold ${
              isOutgoing ? "text-[#0C0D0E]/70" : "text-[#5C616A]"
            }`}
          >
            {formatBubbleTime(message.createdAt)}
          </Text>

          {isOutgoing && (
            <View className="ml-1">
              {status === "SENDING" && (
                <ActivityIndicator size={10} color="#0C0D0E" />
              )}
              {status === "SENT" && (
                <Ionicons name="checkmark" size={12} color="#0C0D0E" />
              )}
              {status === "FAILED" && (
                <Pressable
                  onPress={() => onRetry?.(message)}
                  className="flex-row items-center"
                  accessibilityRole="button"
                  accessibilityLabel="Retry sending message"
                >
                  <Ionicons name="alert-circle" size={13} color="#EF4444" />
                  <Text className="text-[#EF4444] text-[9px] font-bold ml-0.5 uppercase">
                    RETRY
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
