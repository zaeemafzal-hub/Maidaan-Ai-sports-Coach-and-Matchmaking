import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { chatService, ChatRoom } from '../../services/chatService';

type ChannelFilter = 'ALL' | 'DIRECT' | 'SQUADS';

const formatTime = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function ChatScreen() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeFilter, setActiveFilter] = useState<ChannelFilter>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await chatService.getRooms();
      setRooms(data);
    } catch (err: any) {
      console.warn('[ChatScreen] Failed to load chat rooms:', err);
      setError(err?.message || 'Could not load chat channels.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [])
  );

  const filteredRooms = rooms.filter((room) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'DIRECT') return room.type === 'DIRECT' || room.type === ('direct' as any);
    if (activeFilter === 'SQUADS') return room.type === 'GROUP' || room.type === ('group' as any);
    return true;
  });

  const handleOpenRoom = (room: ChatRoom) => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: room.id,
        type: room.type,
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
      {/* Concrete Arena Header */}
      <ArenaHeader
        title="MAIDAAN"
        subtitle="MATCH COMMS // ACTIVE CHANNELS"
        locationBadge="LAHORE CIRCUIT"
        rightAction={
          <Pressable
            onPress={() => router.push('/notifications')}
            className="w-10 h-10 rounded-xl bg-warm-white border border-stone items-center justify-center active:bg-stone-light"
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={19} color="#242522" />
          </Pressable>
        }
      />

      {/* Channel Filters Strip */}
      <View className="px-4 py-3 bg-warm-white border-b border-stone">
        <View className="flex-row items-center justify-between">
          <View className="flex-row space-x-1.5">
            {(
              [
                { key: 'ALL', label: 'All Channels' },
                { key: 'DIRECT', label: 'Direct' },
                { key: 'SQUADS', label: 'Match Squads' },
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
                  className={`px-3 py-1.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-olive border-olive-dark'
                      : 'bg-warm-white border-stone active:bg-stone-light'
                  }`}
                >
                  <Text
                    className={`text-xs font-black uppercase tracking-wider ${
                      isSelected ? 'text-warm-white' : 'text-graphite'
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
            <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider">
              {rooms.length} {rooms.length === 1 ? 'CHANNEL' : 'CHANNELS'}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Conversation Feed */}
      {loading ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#3D4438" />
          <Text className="text-graphite text-xs font-black uppercase tracking-wider mt-3">
            SYNCING CHAT CHANNELS...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="p-8 mx-4 rounded-xl bg-stone-light/40 border border-stone items-center justify-center">
            <View className="w-14 h-14 rounded-full bg-rust/10 border border-rust/40 items-center justify-center mb-3">
              <Ionicons name="alert-circle-outline" size={26} color="#875646" />
            </View>
            <Text className="text-graphite text-base font-black uppercase tracking-tight text-center">
              CHANNELS UNAVAILABLE
            </Text>
            <Text className="text-stone-muted text-xs text-center mt-1.5 max-w-[260px] leading-4">
              {error}
            </Text>
            <Pressable
              onPress={() => loadRooms()}
              className="mt-4 px-4 py-2 rounded-lg bg-olive active:opacity-90"
            >
              <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadRooms(true)}
              tintColor="#3D4438"
            />
          }
          ListEmptyComponent={
            /* Concrete Arena Empty State */
            <View className="p-8 mt-6 rounded-xl bg-stone-light/40 border border-stone items-center justify-center">
              <View className="w-14 h-14 rounded-full bg-stone/30 border border-stone items-center justify-center mb-3">
                <Ionicons name="chatbubbles-outline" size={26} color="#666B60" />
              </View>
              <Text className="text-graphite text-base font-black uppercase tracking-tight text-center">
                NO ACTIVE CHANNELS
              </Text>
              <Text className="text-stone-muted text-xs text-center mt-1.5 max-w-[260px] leading-4">
                Match squad chats and direct messages will appear here when you join fixtures or connect with captains.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/discover')}
                accessibilityRole="button"
                accessibilityLabel="Discover Matches"
                className="mt-5 px-5 py-2.5 rounded-lg bg-olive active:opacity-90"
              >
                <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
                  DISCOVER MATCHES
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const isDirect = item.type === 'DIRECT' || item.type === ('direct' as any);
            const memberCount = item.members?.length || 0;

            return (
              <Pressable
                onPress={() => handleOpenRoom(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${
                  isDirect ? 'direct channel' : 'match squad'
                }. Latest message: ${item.lastMessage || 'No messages yet'}`}
                className="w-full p-4 rounded-xl border mb-3 transition-all active:scale-[0.99] bg-warm-white border-stone shadow-xs"
              >
                <View className="flex-row items-start">
                  {/* Identity Well */}
                  <View className="mr-3.5 pt-0.5">
                    {isDirect ? (
                      <View className="w-12 h-12 rounded-xl bg-graphite border border-stone items-center justify-center relative">
                        <MaterialCommunityIcons name="account" size={24} color="#F4F1EA" />
                      </View>
                    ) : (
                      <View className="w-12 h-12 rounded-xl bg-olive/15 border border-olive/40 items-center justify-center relative">
                        <Ionicons name="people" size={22} color="#3D4438" />
                      </View>
                    )}
                  </View>

                  {/* Main Channel Information */}
                  <View className="flex-1">
                    {/* Top Header: Channel Tag + Timestamp */}
                    <View className="flex-row items-center justify-between mb-1">
                      <View className="flex-row items-center space-x-1.5 flex-1 mr-2">
                        <ArenaBadge
                          label={isDirect ? 'DIRECT' : 'MATCH SQUAD'}
                          variant={isDirect ? 'stone' : 'olive'}
                        />
                      </View>

                      {item.lastMessageAt && (
                        <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider">
                          {formatTime(item.lastMessageAt)}
                        </Text>
                      )}
                    </View>

                    {/* Room Title */}
                    <Text
                      numberOfLines={1}
                      className="text-sm font-black uppercase tracking-tight text-graphite flex-1 mr-2"
                    >
                      {item.title}
                    </Text>

                    {/* Member Count info */}
                    <View className="flex-row items-center mt-0.5 mb-1.5">
                      <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider">
                        {isDirect
                          ? '1-ON-1 CONVERSATION'
                          : `${memberCount} CONFIRMED MEMBERS`}
                      </Text>
                    </View>

                    {/* Latest Message Preview */}
                    <View className="flex-row items-center">
                      <Text
                        numberOfLines={1}
                        className="text-xs leading-4 flex-1 text-stone-muted font-normal"
                      >
                        {item.lastMessage ? item.lastMessage : 'Channel opened. Send the first message.'}
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#3D4438"
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
    </SafeAreaView>
  );
}
