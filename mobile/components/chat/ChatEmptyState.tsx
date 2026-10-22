import React from "react";
import { View, Text, Pressable } from "../theme/Primitives";
import { Ionicons } from "../theme/Icons";

interface ChatEmptyStateProps {
  title?: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  title = "NO ACTIVE CHATS",
  description = "Confirmed squad chats and direct messages will appear here once matches are created or joined.",
  icon = "chatbubbles-outline",
  actionLabel,
  onAction,
}) => {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View className="w-16 h-16 rounded-2xl bg-[#141518]/25 border border-white/[0.08] items-center justify-center mb-4">
        <Ionicons name={icon} size={30} color="#E85D26" />
      </View>
      <Text
        style={{ color: "#FFFFFF" }}
        className="text-white text-base font-black uppercase tracking-tight text-center"
      >
        {title}
      </Text>
      <Text
        style={{ color: "#A0A5AD" }}
        className="text-[#A0A5AD] text-xs font-medium text-center mt-2 max-w-[280px] leading-relaxed"
      >
        {description}
      </Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          className="mt-6 py-3 px-5 rounded-xl bg-[#E85D26] active:opacity-90 shadow-sm"
        >
          <Text
            style={{ color: "#0C0D0E" }}
            className="text-[#0C0D0E] text-xs font-black uppercase tracking-wider"
          >
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
};
