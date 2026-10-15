import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ArenaHeader } from '../components/ui/ArenaHeader';
import { ArenaBadge } from '../components/ui/ArenaBadge';
import {
  notificationService,
  InAppNotification,
  NotificationType,
} from '../services/notificationService';

type NotificationFilter = 'ALL' | 'REQUESTS' | 'MATCHES' | 'CHAT';

const formatTimestamp = (dateStr: string): string => {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'JUST NOW';
    if (minutes < 60) return `${minutes} MIN AGO`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} HR AGO`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'YESTERDAY';
    if (days < 7) return `${days} DAYS AGO`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
};

const getNotificationKicker = (type: NotificationType | string): string => {
  switch (type) {
    case 'JOIN_REQUEST_RECEIVED':
      return 'CAPTAIN DESK';
    case 'JOIN_REQUEST_ACCEPTED':
    case 'JOIN_REQUEST_REJECTED':
      return 'MATCHMAKING';
    default:
      return 'CIRCUIT BULLETIN';
  }
};

const getNotificationIcon = (type: NotificationType | string) => {
  switch (type) {
    case 'JOIN_REQUEST_RECEIVED':
      return <Ionicons name="person-add" size={18} color="#3D4438" />;
    case 'JOIN_REQUEST_ACCEPTED':
      return <Ionicons name="checkmark-done-circle" size={18} color="#3D4438" />;
    case 'JOIN_REQUEST_REJECTED':
      return <Ionicons name="close-circle" size={18} color="#875646" />;
    default:
      return <MaterialCommunityIcons name="shield-check" size={18} color="#666B60" />;
  }
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);

  const loadNotifications = async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const items = await notificationService.getNotifications();
      if (isMountedRef.current) {
        setNotifications(items || []);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn('[Notifications] Failed to load notifications:', err);
        setError(err?.message || 'Could not load notifications from server.');
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
      loadNotifications();
      return () => {
        isMountedRef.current = false;
      };
    }, [])
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationService.markAllAsRead();
    } catch (err: any) {
      console.warn('[Notifications] Failed to mark all read:', err);
    }
  };

  const handleNotificationPress = async (notification: InAppNotification) => {
    // Optimistic read update
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      try {
        await notificationService.markAsRead(notification.id);
      } catch (err: any) {
        console.warn('[Notifications] Failed to mark read:', err);
      }
    }

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Deterministic route navigation based on notification event
    switch (notification.type) {
      case 'JOIN_REQUEST_RECEIVED':
        if (notification.matchId) {
          router.push(`/captain/join-requests?matchId=${notification.matchId}`);
        } else {
          router.push('/captain/dashboard');
        }
        break;

      case 'JOIN_REQUEST_ACCEPTED':
        if (notification.matchId) {
          router.push(`/match/confirmed?matchId=${notification.matchId}`);
        }
        break;

      case 'JOIN_REQUEST_REJECTED':
        if (notification.matchId) {
          router.push(`/match/request-sent?matchId=${notification.matchId}`);
        }
        break;

      default:
        if (notification.matchId) {
          router.push(`/match/${notification.matchId}`);
        }
        break;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'REQUESTS') {
      return (
        n.type === 'JOIN_REQUEST_RECEIVED' ||
        n.type === 'JOIN_REQUEST_ACCEPTED' ||
        n.type === 'JOIN_REQUEST_REJECTED'
      );
    }
    if (activeFilter === 'MATCHES') {
      return false;
    }
    if (activeFilter === 'CHAT') {
      return false;
    }
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-[#171A1D]" edges={['top', 'bottom']}>
      {/* Modern Header */}
      <ArenaHeader
        title="Notifications"
        subtitle="Activity feed"
        showBack
        fallbackRoute="/(tabs)/discover"
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/discover');
          }
        }}
        rightAction={
          unreadCount > 0 ? (
            <Pressable
              onPress={handleMarkAllRead}
              accessibilityRole="button"
              accessibilityLabel="Mark all notices as read"
              className="px-3 py-1.5 rounded-lg bg-[#272C31] border border-white/10 active:bg-white/10"
            >
              <Text className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider">
                MARK ALL READ
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* Control Strip: Activity Category Filters */}
      <View className="px-4 py-3 bg-[#171A1D] border-b border-white/5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row space-x-1.5">
            {(
              [
                { key: 'ALL', label: 'All Notices' },
                { key: 'REQUESTS', label: 'Requests' },
                { key: 'MATCHES', label: 'Matches' },
                { key: 'CHAT', label: 'Chat' },
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
                      ? 'bg-[#E85D26] border-[#E85D26]'
                      : 'bg-[#1F2327] border-white/10 active:bg-[#272C31]'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isSelected ? 'text-[#171A1D]' : 'text-[#A0A5AD]'
                    }`}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Unread Counter Pill */}
          <View className="flex-row items-center">
            {unreadCount > 0 ? (
              <View className="flex-row items-center bg-[#E85D26]/15 border border-[#E85D26]/40 px-2 py-0.5 rounded-full">
                <View className="w-1.5 h-1.5 rounded-full bg-[#E85D26] mr-1.5" />
                <Text className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider">
                  {unreadCount} NEW
                </Text>
              </View>
            ) : (
              <Text className="text-[#7F8993] text-[10px] font-bold uppercase tracking-wider">
                ALL CAUGHT UP
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Main Notification Bulletin Feed */}
      {loading ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#E85D26" />
          <Text className="text-[#A0A5AD] text-xs font-bold uppercase tracking-wider mt-3">
            SYNCING NOTIFICATION FEED...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="p-8 mx-4 rounded-2xl bg-[#1F2327] border border-white/10 items-center justify-center">
            <View className="w-14 h-14 rounded-full bg-[#F4A261]/10 border border-[#F4A261]/30 items-center justify-center mb-3">
              <Ionicons name="alert-circle-outline" size={26} color="#F4A261" />
            </View>
            <Text className="text-[#F4F6F7] text-base font-bold uppercase tracking-tight text-center">
              FEED UNAVAILABLE
            </Text>
            <Text className="text-[#A0A5AD] text-xs text-center mt-1.5 max-w-[260px] leading-4">
              {error}
            </Text>
            <Pressable
              onPress={() => loadNotifications()}
              className="mt-4 px-4 py-2 rounded-lg bg-[#E85D26] active:opacity-90"
            >
              <Text className="text-[#171A1D] text-xs font-black uppercase tracking-wider">
                RETRY SYNC
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              tintColor="#E85D26"
            />
          }
        >
          {filteredNotifications.length === 0 ? (
            /* Empty State */
            <View className="p-8 mx-4 mt-8 rounded-2xl bg-[#1F2327] border border-white/10 items-center justify-center">
              <View className="w-14 h-14 rounded-full bg-[#272C31] border border-white/10 items-center justify-center mb-3">
                <Ionicons name="notifications-off-outline" size={26} color="#E85D26" />
              </View>
              <Text className="text-[#F4F6F7] text-base font-bold uppercase tracking-tight text-center">
                NO NEW NOTICES
              </Text>
              <Text className="text-[#A0A5AD] text-xs text-center mt-1.5 max-w-[260px] leading-4">
                Match requests, captain decisions and activity updates will appear here.
              </Text>
              {activeFilter !== 'ALL' && (
                <Pressable
                  onPress={() => setActiveFilter('ALL')}
                  className="mt-4 px-4 py-2 rounded-lg bg-[#E85D26] active:opacity-90"
                >
                  <Text className="text-[#171A1D] text-xs font-black uppercase tracking-wider">
                    VIEW ALL NOTICES
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            /* Notice Slips List */
            <View className="px-4 pt-4 space-y-2.5">
              {filteredNotifications.map((notif) => {
                const isActionable = Boolean(notif.matchId);

                return (
                  <Pressable
                    key={notif.id}
                    onPress={() => handleNotificationPress(notif)}
                    accessibilityRole="button"
                    accessibilityLabel={`${notif.isRead ? 'Read' : 'Unread'} notice: ${notif.title}. ${notif.message}. ${formatTimestamp(notif.createdAt)}`}
                    className={`w-full p-4 rounded-2xl border mb-2.5 transition-all active:scale-[0.99] ${
                      notif.isRead
                        ? 'bg-[#1F2327]/60 border-white/5'
                        : 'bg-[#1F2327] border-white/10 shadow-sm'
                    }`}
                  >
                    {/* Top Header Row: Category Kicker + Timestamp + Unread Indicator */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <View className="mr-2">{getNotificationIcon(notif.type)}</View>
                        <Text className="text-[#7F8993] text-[10px] font-bold uppercase tracking-widest">
                          {getNotificationKicker(notif.type)}
                        </Text>
                      </View>

                      <View className="flex-row items-center">
                        <Text className="text-[#7F8993] text-[10px] font-bold uppercase tracking-wider mr-2">
                          {formatTimestamp(notif.createdAt)}
                        </Text>
                        {!notif.isRead && (
                          <View className="w-2 h-2 rounded-full bg-[#E85D26]" />
                        )}
                      </View>
                    </View>

                    {/* Notice Title */}
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`text-sm font-bold uppercase tracking-tight ${
                          notif.isRead ? 'text-[#A0A5AD]' : 'text-[#F4F6F7]'
                        }`}
                      >
                        {notif.title}
                      </Text>

                      {/* Specific Action Tags */}
                      {notif.type === 'JOIN_REQUEST_RECEIVED' && (
                        <ArenaBadge label="NEW REQUEST" variant="olive" />
                      )}
                      {notif.type === 'JOIN_REQUEST_ACCEPTED' && (
                        <ArenaBadge label="SPOT CONFIRMED" variant="olive" />
                      )}
                      {notif.type === 'JOIN_REQUEST_REJECTED' && (
                        <ArenaBadge label="NOT ACCEPTED" variant="rust" />
                      )}
                    </View>

                    {/* Notice Body Copy */}
                    <Text
                      className={`text-xs mt-1.5 leading-5 ${
                        notif.isRead ? 'text-[#7F8993]' : 'text-[#A0A5AD] font-medium'
                      }`}
                    >
                      {notif.message}
                    </Text>

                    {/* Action Link Footer (Only If Actionable) */}
                    {isActionable && (
                      <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-white/5">
                        <Text className="text-[#E85D26] text-[11px] font-bold uppercase tracking-wider">
                          {notif.type === 'JOIN_REQUEST_RECEIVED'
                            ? 'REVIEW REQUEST →'
                            : notif.type === 'JOIN_REQUEST_ACCEPTED'
                            ? 'VIEW CONFIRMED SPOT →'
                            : notif.type === 'JOIN_REQUEST_REJECTED'
                            ? 'VIEW FIXTURE STATUS →'
                            : 'VIEW DETAILS →'}
                        </Text>

                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={notif.isRead ? '#7F8993' : '#E85D26'}
                        />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
