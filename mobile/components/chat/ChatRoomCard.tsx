import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ChatRoom } from '../../services/chatService';

interface ChatRoomCardProps {
  room: ChatRoom;
  onPress: (room: ChatRoom) => void;
}

const formatCardTime = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export const ChatRoomCard: React.FC<ChatRoomCardProps> = ({ room, onPress }) => {
  const isGroup = room.type === 'GROUP' || room.type === ('group' as any);
  const formattedTime = formatCardTime(room.lastMessageAt);
  const previewText = room.lastMessage || 'No messages yet. Start the conversation!';

  return (
    <Pressable
      onPress={() => onPress(room)}
      className="mx-4 mb-3 p-4 rounded-2xl bg-[#141518] border border-white/[0.08] active:bg-[#1B1D22]"
      accessibilityRole="button"
      accessibilityLabel={`Open chat for ${room.title}`}
    >
      <View className="flex-row items-center">
        {/* Avatar Well */}
        <View
          className={`w-12 h-12 rounded-xl items-center justify-center mr-3.5 border ${
            isGroup
              ? 'bg-[#E85D26]/15 border-[#E85D26]/30'
              : 'bg-[#1B1D22] border border-white/[0.08]'
          }`}
        >
          {isGroup ? (
            <Ionicons name="people" size={22} color="#E85D26" />
          ) : (
            <Ionicons name="person" size={22} color="#E85D26" />
          )}
        </View>

        {/* Content Details */}
        <View className="flex-1 min-w-0">
          {/* Header Row: Title and Timestamp */}
          <View className="flex-row items-center justify-between mb-1">
            <Text
              numberOfLines={1}
              style={{ color: '#FFFFFF' }}
              className="text-white text-sm font-bold uppercase tracking-tight flex-1 mr-2"
            >
              {room.title}
            </Text>
            {formattedTime ? (
              <Text style={{ color: '#5C616A' }} className="text-[#5C616A] text-[10px] font-semibold">
                {formattedTime}
              </Text>
            ) : null}
          </View>

          {/* Subtitle Row: Last Message and Type Tag */}
          <View className="flex-row items-center justify-between">
            <Text
              numberOfLines={1}
              style={{ color: '#A0A5AD' }}
              className="text-[#A0A5AD] text-xs font-medium flex-1 mr-2"
            >
              {previewText}
            </Text>
            <View className="px-2 py-0.5 rounded-md bg-[#1B1D22] border border-white/[0.08]">
              <Text className="text-[#E85D26] text-[9px] font-bold uppercase tracking-wider">
                {isGroup ? 'SQUAD' : 'DIRECT'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
};
