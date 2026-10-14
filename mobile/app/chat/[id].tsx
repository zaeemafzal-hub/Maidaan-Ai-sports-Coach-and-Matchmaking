import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { chatService, ChatMessage, ChatRoom } from '../../services/chatService';
import { socketService } from '../../services/socketService';

const formatMessageTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string; type?: string }>();
  const { currentUser } = useAuthStore();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const roomId = typeof id === 'string' ? id : '';

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<'FORBIDDEN' | 'NOT_FOUND' | 'ERROR' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const currentUserId = currentUser?.id || '';

  const loadChannelData = async () => {
    if (!roomId) {
      setAuthError('NOT_FOUND');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setAuthError(null);

      // Load room metadata and messages concurrently
      const [allRooms, fetchedMessages] = await Promise.all([
        chatService.getRooms().catch(() => [] as ChatRoom[]),
        chatService.getMessages(roomId),
      ]);

      const matchedRoom = allRooms.find((r) => r.id === roomId);
      if (matchedRoom) {
        setRoom(matchedRoom);
      } else {
        // Construct fallback placeholder with room title if room metadata wasn't loaded
        setRoom((prev) => prev || {
          id: roomId,
          type: 'GROUP',
          title: 'Squad Channel',
          members: [],
        });
      }

      setMessages(fetchedMessages);
    } catch (err: any) {
      console.warn('[ChatRoom] Failed to load messages for room:', roomId, err);
      if (err?.status === 403) {
        setAuthError('FORBIDDEN');
        setErrorMessage('Access denied: You are not an authorized member of this chat room.');
      } else if (err?.status === 404) {
        setAuthError('NOT_FOUND');
        setErrorMessage('This chat channel does not exist or has been closed.');
      } else {
        setAuthError('ERROR');
        setErrorMessage(err?.message || 'Failed to load channel messages.');
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChannelData();

      if (roomId) {
        socketService.joinRoom(roomId);
      }

      const unsubscribeMessage = socketService.onMessage((incoming: ChatMessage) => {
        if (incoming.roomId === roomId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) {
              return prev;
            }
            return [...prev, incoming];
          });
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      });

      const unsubscribeError = socketService.onError((err: any) => {
        if (err?.code === 'ROOM_ACCESS_DENIED') {
          setAuthError('FORBIDDEN');
          setErrorMessage('Access denied: You are not an authorized member of this chat room.');
        }
      });

      return () => {
        unsubscribeMessage();
        unsubscribeError();
        if (roomId) {
          socketService.leaveRoom(roomId);
        }
      };
    }, [roomId])
  );

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    if (trimmed.length > 500) {
      setSendError('Message exceeds maximum limit of 500 characters.');
      return;
    }

    try {
      setSending(true);
      setSendError(null);

      const created = await chatService.sendMessage(roomId, trimmed);

      // Clear input only upon successful persist
      setInputText('');
      setMessages((prev) => {
        if (prev.some((m) => m.id === created.id)) {
          return prev;
        }
        return [...prev, created];
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      console.warn('[ChatRoom] Send message failed:', err);
      setSendError(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    router.replace('/(tabs)/chat');
  };

  const handleViewMatch = () => {
    if (room?.matchId) {
      router.push(`/match/${room.matchId}`);
    }
  };

  // Guard: Unauthorized or Not Found States
  if (!loading && authError) {
    const isForbidden = authError === 'FORBIDDEN';
    return (
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="w-full px-4 py-3.5 bg-graphite border-b border-surface-border-dark flex-row items-center">
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back to chat channels"
            className="w-10 h-10 rounded-lg items-center justify-center mr-3 bg-surface-card-dark border border-surface-border-dark active:scale-95"
          >
            <Ionicons name="chevron-back" size={20} color="#F4F1EA" />
          </Pressable>
          <Text className="text-warm-white text-base font-black uppercase tracking-tight">
            CHAT CHANNEL
          </Text>
        </View>

        {/* Access Denied / Not Found View */}
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-stone/30 border border-stone items-center justify-center mb-4">
            <Ionicons
              name={isForbidden ? 'lock-closed-outline' : 'alert-circle-outline'}
              size={32}
              color="#666B60"
            />
          </View>
          <Text className="text-graphite text-xl font-black uppercase tracking-tight text-center">
            {isForbidden ? 'CHANNEL ACCESS DENIED' : 'CHANNEL NOT FOUND'}
          </Text>
          <Text className="text-stone-muted text-xs font-medium text-center mt-2 max-w-[280px] leading-5">
            {errorMessage}
          </Text>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back to chat inbox"
            className="mt-6 py-3.5 px-6 rounded-xl bg-olive border-b-[3px] border-olive-dark items-center justify-center active:opacity-90"
          >
            <Text className="text-warm-white text-xs font-black uppercase tracking-wider">
              BACK TO CHAT
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isGroup = room?.type === 'GROUP' || room?.type === ('group' as any);

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    // Non-user system notification line
    if (item.senderId === 'system') {
      return (
        <View className="w-full my-3 items-center">
          <View className="px-3.5 py-1.5 rounded-sm bg-olive/15 border border-olive/30 flex-row items-center">
            <Ionicons name="shield-checkmark" size={13} color="#3D4438" />
            <Text className="text-olive text-[10px] font-black uppercase tracking-wider ml-1.5">
              {item.body}
            </Text>
          </View>
        </View>
      );
    }

    const isOutgoing = item.senderId === currentUserId;
    const isCaptain = item.senderRole === 'TEAM_CAPTAIN';

    return (
      <View
        className={`w-full my-1.5 flex-row ${
          isOutgoing ? 'justify-end' : 'justify-start'
        }`}
      >
        <View
          style={{ maxWidth: '82%' }}
          className={`p-3.5 rounded-2xl ${
            isOutgoing
              ? 'bg-olive border border-olive-dark border-b-[2px] rounded-tr-sm'
              : 'bg-warm-white border border-stone border-b-[2px] border-b-stone-muted/70 rounded-tl-sm shadow-xs'
          }`}
        >
          {/* In Group Chat: Show Sender Name and Role Distinction for incoming messages */}
          {!isOutgoing && isGroup && (
            <View className="flex-row items-center mb-1 flex-wrap">
              <Text className="text-graphite text-[11px] font-black uppercase tracking-wide mr-1.5">
                {item.senderName}
              </Text>
              {isCaptain ? (
                <View className="bg-olive/15 border border-olive px-1.5 py-0.2 rounded-xs">
                  <Text className="text-olive text-[8px] font-black uppercase tracking-wider">
                    TEAM CAPTAIN
                  </Text>
                </View>
              ) : (
                <Text className="text-stone-muted text-[9px] font-bold uppercase tracking-wider">
                  • PLAYER
                </Text>
              )}
            </View>
          )}

          {/* Message Text Body */}
          <Text
            className={`text-sm leading-relaxed ${
              isOutgoing ? 'text-warm-white font-medium' : 'text-graphite font-medium'
            }`}
          >
            {item.body}
          </Text>

          {/* Timestamp Footer */}
          <Text
            className={`text-[10px] font-bold mt-1 text-right ${
              isOutgoing ? 'text-warm-white/70' : 'text-stone-muted'
            }`}
          >
            {formatMessageTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
      {/* Concrete Arena Match Comms Top Header */}
      <View className="w-full px-4 py-3 bg-graphite border-b border-surface-border-dark flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          {/* Back Action */}
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-10 h-10 rounded-lg items-center justify-center mr-2.5 bg-surface-card-dark border border-surface-border-dark active:scale-95"
          >
            <Ionicons name="chevron-back" size={20} color="#F4F1EA" />
          </Pressable>

          {/* Room Identity Avatar Well */}
          <View
            className={`w-10 h-10 rounded-lg items-center justify-center mr-3 border ${
              isGroup
                ? 'bg-olive/20 border-olive/50'
                : 'bg-graphite border-surface-border-dark'
            }`}
          >
            <Ionicons
              name={isGroup ? 'people' : 'person'}
              size={19}
              color="#F4F1EA"
            />
          </View>

          {/* Room Title and Kicker Info */}
          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="text-warm-white text-base font-black uppercase tracking-tight"
            >
              {room?.title || 'MATCH CHANNEL'}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Text className="text-stone-muted text-[10px] font-black uppercase tracking-wider">
                {isGroup ? 'MATCH SQUAD' : 'DIRECT CHANNEL'}
              </Text>
              <Text className="text-surface-border-dark text-[10px] font-bold mx-1">
                //
              </Text>
              <Text
                numberOfLines={1}
                className="text-stone text-[10px] font-semibold tracking-tight"
              >
                {room?.members ? `${room.members.length} PARTICIPANTS` : 'CONFIRMED LINEUP'}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Indicator */}
        <View className="px-2.5 py-1 rounded-sm bg-surface-card-dark border border-surface-border-dark">
          <Text className="text-stone text-[9px] font-black uppercase tracking-wider">
            {isGroup ? 'SQUAD' : 'DIRECT'}
          </Text>
        </View>
      </View>

      {/* Associated Match Context Strip (If room has match reference) */}
      {room?.matchId && (
        <View className="w-full px-4 py-2.5 bg-stone-light border-b border-stone flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-0.5">
              <Text className="text-rust text-[9px] font-black uppercase tracking-widest mr-1.5">
                FIXTURE CONTEXT
              </Text>
            </View>
            <Text
              numberOfLines={1}
              className="text-graphite text-xs font-black uppercase tracking-tight"
            >
              {room.title}
            </Text>
          </View>

          <Pressable
            onPress={handleViewMatch}
            accessibilityRole="button"
            accessibilityLabel="View associated match fixture"
            className="py-1.5 px-3 rounded-lg bg-warm-white border border-stone border-b-[2px] border-b-stone-muted active:scale-95"
          >
            <Text className="text-graphite text-[10px] font-black uppercase tracking-wider">
              VIEW FIXTURE →
            </Text>
          </Pressable>
        </View>
      )}

      {/* Main Messages FlatList Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center p-8">
            <ActivityIndicator size="large" color="#3D4438" />
            <Text className="text-graphite text-xs font-black uppercase tracking-wider mt-3">
              LOADING CHANNEL MESSAGES...
            </Text>
          </View>
        ) : messages.length === 0 ? (
          /* Empty Channel State */
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-14 h-14 rounded-2xl bg-stone-light border border-stone items-center justify-center mb-3">
              <Ionicons
                name={isGroup ? 'people-outline' : 'chatbubble-ellipses-outline'}
                size={26}
                color="#3D4438"
              />
            </View>
            <Text className="text-graphite text-base font-black uppercase tracking-tight text-center">
              {isGroup ? 'SQUAD CHANNEL OPEN' : 'DIRECT CHANNEL OPEN'}
            </Text>
            <Text className="text-stone-muted text-xs font-semibold uppercase tracking-wider text-center mt-1 max-w-xs leading-relaxed">
              {isGroup
                ? 'Coordinate arrival, equipment and match-day details here.'
                : 'Direct player-captain communication open for this fixture.'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 16,
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Message Send Error Alert */}
        {sendError && (
          <View className="px-4 py-1.5 bg-rust/10 border-t border-rust/30 flex-row items-center justify-between">
            <Text className="text-rust text-xs font-semibold flex-1 mr-2">
              {sendError}
            </Text>
            <Pressable onPress={() => setSendError(null)}>
              <Ionicons name="close" size={16} color="#875646" />
            </Pressable>
          </View>
        )}

        {/* Message Composer Strip */}
        <View className="p-3 bg-warm-white border-t border-stone flex-row items-center space-x-2">
          <View className="flex-1 flex-row items-center px-3.5 py-2 rounded-xl bg-stone-light/60 border border-stone mr-2">
            <TextInput
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (sendError) setSendError(null);
              }}
              placeholder={isGroup ? 'Message squad...' : 'Message captain...'}
              placeholderTextColor="#75796F"
              multiline
              maxLength={500}
              editable={!sending}
              className="flex-1 text-graphite text-sm p-0 max-h-24"
              accessibilityLabel={isGroup ? 'Message squad' : 'Message captain'}
            />
          </View>

          {/* Tactile Send Button */}
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            className={`w-11 h-11 rounded-xl items-center justify-center transition-all ${
              inputText.trim() && !sending
                ? 'bg-olive border border-olive-dark border-b-[3px] active:scale-95'
                : 'bg-stone/30 border border-stone/50 opacity-40'
            }`}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#F4F1EA" />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={inputText.trim() ? '#F4F1EA' : '#75796F'}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
