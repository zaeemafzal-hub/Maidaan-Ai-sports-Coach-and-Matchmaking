import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "../../components/theme/Primitives";

import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "../../components/theme/Icons";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { ArenaBadge } from "../../components/ui/ArenaBadge";
import { chatService, ChatRoom } from "../../services/chatService";
import { socketService } from "../../services/socketService";
import { ConnectionBanner } from "../../components/chat/ConnectionBanner";

type ChannelFilter = "ALL" | "DIRECT" | "SQUADS";

const formatTime = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

export default function ChatScreen() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeFilter, setActiveFilter] = useState<ChannelFilter>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);

  const loadRooms = async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await chatService.getRooms();
      if (isMountedRef.current) {
        setRooms(data);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn("[ChatScreen] Failed to load chat rooms:", err);
        setError(err?.message || "Could not load chat channels.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      loadRooms();

      // Listen for incoming messages to reorder and update previews in realtime
      const unsubscribe = socketService.onMessage((incoming) => {
        if (!isMountedRef.current) return;
        setRooms((prev) => {
          const index = prev.findIndex((r) => r.id === incoming.roomId);
          if (index !== -1) {
            const updated = [...prev];
            const targetRoom = {
              ...updated[index],
              lastMessage: incoming.body,
              lastMessageAt: incoming.createdAt,
            };
            updated.splice(index, 1);
            return [targetRoom, ...updated];
          }
          return prev;
        });
      });

      return () => {
        isMountedRef.current = false;
        unsubscribe();
      };
    }, []),
  );

  const filteredRooms = rooms.filter((room) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "DIRECT")
      return room.type === "DIRECT" || room.type === ("direct" as any);
    if (activeFilter === "SQUADS")
      return room.type === "GROUP" || room.type === ("group" as any);
    return true;
  });

  const handleOpenRoom = (room: ChatRoom) => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: room.id,
        type: room.type,
      },
    });
  };

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
      {/* Modern Header */}
      <ArenaHeader
        title="Messages"
        subtitle="Squad & direct conversations"
        locationBadge="Lahore"
        rightAction={
          <Pressable
            onPress={() => router.push("/notifications")}
            className="w-10 h-10 rounded-xl bg-[#141518]/25 border border-white/[0.08] items-center justify-center active:bg-[#1B1D22]"
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={19} color="#FFFFFF" />
          </Pressable>
        }
      />

      {/* Socket Connection Status Banner */}
      <ConnectionBanner />

      {/* Channel Filters Strip */}
      <View className="px-4 py-3 bg-[#0C0D0E] border-b border-white/[0.08]">
        <View className="flex-row items-center justify-between">
          <View className="flex-row space-x-1.5">
            {(
              [
                { key: "ALL", label: "All Channels" },
                { key: "DIRECT", label: "Direct" },
                { key: "SQUADS", label: "Match Squads" },
              ] as const
            ).map((filter) => {
              const isSelected = activeFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setActiveFilter(filter.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Filter ${filter.label}`}
                  className={`px-3 py-1.5 rounded-lg border ${
                    isSelected
                      ? "bg-[#E85D26] border-[#E85D26]"
                      : "bg-[#141518]/25 border-white/[0.08] active:bg-[#1B1D22]"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isSelected ? "text-[#0C0D0E]" : "text-[#A0A5AD]"
                    }`}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Activity State Badge */}
          <View className="flex-row items-center">
            <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider">
              {rooms.length} {rooms.length === 1 ? "CHANNEL" : "CHANNELS"}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Conversation Feed */}
      {loading ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#E85D26" />
          <Text className="text-[#A0A5AD] text-xs font-bold uppercase tracking-wider mt-3">
            SYNCING CHAT CHANNELS...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="p-8 mx-4 rounded-2xl bg-[#141518]/25 border border-white/[0.08] items-center justify-center">
            <View className="w-14 h-14 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 items-center justify-center mb-3">
              <Ionicons name="alert-circle-outline" size={26} color="#F59E0B" />
            </View>
            <Text className="text-[#FFFFFF] text-base font-bold uppercase tracking-tight text-center">
              CHANNELS UNAVAILABLE
            </Text>
            <Text className="text-[#A0A5AD] text-xs text-center mt-1.5 max-w-[260px] leading-4">
              {error}
            </Text>
            <Pressable
              onPress={() => loadRooms()}
              className="mt-4 px-4 py-2 rounded-lg bg-[#E85D26] active:opacity-90"
            >
              <Text className="text-[#0C0D0E] text-xs font-black uppercase tracking-wider">
                RETRY
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 32,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadRooms(true)}
              tintColor="#E85D26"
            />
          }
          ListEmptyComponent={
            <View className="p-8 mt-6 rounded-2xl bg-[#141518]/25 border border-white/[0.08] items-center justify-center">
              <View className="w-14 h-14 rounded-full bg-[#1B1D22] border border-white/[0.08] items-center justify-center mb-3">
                <Ionicons
                  name="chatbubbles-outline"
                  size={26}
                  color="#E85D26"
                />
              </View>
              <Text className="text-[#FFFFFF] text-base font-bold uppercase tracking-tight text-center">
                NO ACTIVE CHANNELS
              </Text>
              <Text className="text-[#A0A5AD] text-xs text-center mt-1.5 max-w-[260px] leading-4">
                Match squad chats and direct messages will appear here when you
                join fixtures or connect with captains.
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/discover")}
                accessibilityRole="button"
                accessibilityLabel="Discover Matches"
                className="mt-5 px-5 py-2.5 rounded-xl bg-[#E85D26] active:opacity-90 shadow-sm"
              >
                <Text className="text-[#0C0D0E] text-xs font-black uppercase tracking-wider">
                  DISCOVER MATCHES
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const isDirect =
              item.type === "DIRECT" || item.type === ("direct" as any);
            const memberCount = item.members?.length || 0;

            return (
              <Pressable
                onPress={() => handleOpenRoom(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${
                  isDirect ? "direct channel" : "match squad"
                }. Latest message: ${item.lastMessage || "No messages yet"}`}
                className="w-full p-4 rounded-2xl border mb-3 active:scale-[0.99] bg-[#141518]/25 border-white/[0.08] shadow-sm"
              >
                <View className="flex-row items-start">
                  {/* Identity Well */}
                  <View className="mr-3.5 pt-0.5">
                    {isDirect ? (
                      <View className="w-12 h-12 rounded-xl bg-[#1B1D22] border border-white/[0.08] items-center justify-center relative">
                        <MaterialCommunityIcons
                          name="account"
                          size={24}
                          color="#E85D26"
                        />
                      </View>
                    ) : (
                      <View className="w-12 h-12 rounded-xl bg-[#E85D26]/15 border border-[#E85D26]/30 items-center justify-center relative">
                        <Ionicons name="people" size={22} color="#E85D26" />
                      </View>
                    )}
                  </View>

                  {/* Main Channel Information */}
                  <View className="flex-1">
                    {/* Top Header: Channel Tag + Timestamp */}
                    <View className="flex-row items-center justify-between mb-1">
                      <View className="flex-row items-center space-x-1.5 flex-1 mr-2">
                        <ArenaBadge
                          label={isDirect ? "DIRECT" : "MATCH SQUAD"}
                          variant={isDirect ? "stone" : "olive"}
                        />
                      </View>

                      {item.lastMessageAt && (
                        <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider">
                          {formatTime(item.lastMessageAt)}
                        </Text>
                      )}
                    </View>

                    {/* Room Title */}
                    <Text
                      numberOfLines={1}
                      className="text-sm font-bold uppercase tracking-tight text-white flex-1 mr-2"
                    >
                      {item.title}
                    </Text>

                    {/* Member Count info */}
                    <View className="flex-row items-center mt-0.5 mb-1.5">
                      <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider">
                        {isDirect
                          ? "1-ON-1 CONVERSATION"
                          : `${memberCount} CONFIRMED MEMBERS`}
                      </Text>
                    </View>

                    {/* Latest Message Preview */}
                    <View className="flex-row items-center">
                      <Text
                        numberOfLines={1}
                        className="text-xs leading-4 flex-1 text-[#A0A5AD] font-normal"
                      >
                        {item.lastMessage
                          ? item.lastMessage
                          : "Channel opened. Send the first message."}
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#E85D26"
                        style={{ marginLeft: 6 }}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </ThemedScreen>
  );
}
