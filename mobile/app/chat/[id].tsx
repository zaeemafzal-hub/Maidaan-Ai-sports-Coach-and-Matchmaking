import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "../../components/theme/Primitives";

import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "../../components/theme/Icons";
import { useAuthStore } from "../../store/useAuthStore";
import { chatService, ChatMessage, ChatRoom } from "../../services/chatService";
import { socketService } from "../../services/socketService";
import { ConnectionBanner } from "../../components/chat/ConnectionBanner";
import {
  MessageBubble,
  OptimisticChatMessage,
} from "../../components/chat/MessageBubble";
import { ChatComposer } from "../../components/chat/ChatComposer";
import { ChatEmptyState } from "../../components/chat/ChatEmptyState";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string; type?: string }>();
  const { currentUser } = useAuthStore();
  const flatListRef = useRef<FlatList<OptimisticChatMessage>>(null);

  const roomId = typeof id === "string" ? id : "";

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<OptimisticChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<
    "FORBIDDEN" | "NOT_FOUND" | "ERROR" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<'joining' | 'joined' | 'failed' | 'retrying'>('joining');

  const currentUserId = currentUser?.id || "";

  const loadChannelData = async () => {
    if (!roomId) {
      setAuthError("NOT_FOUND");
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
        setRoom(
          (prev) =>
            prev || {
              id: roomId,
              type: "GROUP",
              title: "Squad Channel",
              members: [],
            },
        );
      }

      setMessages(fetchedMessages.map((m) => ({ ...m, status: "SENT" })));
    } catch (err: any) {
      console.warn("[ChatRoom] Failed to load messages for room:", roomId, err);
      if (err?.status === 403) {
        setAuthError("FORBIDDEN");
        setErrorMessage(
          "Access denied: You are not an authorized member of this chat room.",
        );
      } else if (err?.status === 404) {
        setAuthError("NOT_FOUND");
        setErrorMessage("This chat channel does not exist or has been closed.");
      } else {
        setAuthError("ERROR");
        setErrorMessage(err?.message || "Failed to load channel messages.");
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChannelData();

      const unsubscribeRoomState = socketService.onRoomStateChange((id, state) => {
        if (id === roomId) setRoomState(state);
      });

      if (roomId) {
        socketService.joinRoom(roomId);
      }

      // Live incoming messages listener
      const unsubscribeMessage = socketService.onMessage(
        (incoming: ChatMessage) => {
          if (incoming.roomId === roomId) {
            setMessages((prev) => {
              // Check for match by server id or clientMessageId
              const index = prev.findIndex(
                (m) =>
                  m.id === incoming.id ||
                  (incoming.clientMessageId &&
                    m.clientMessageId === incoming.clientMessageId) ||
                  (incoming.clientMessageId &&
                    m.id === incoming.clientMessageId),
              );

              if (index !== -1) {
                const updated = [...prev];
                updated[index] = { ...incoming, status: "SENT" };
                return updated;
              }

              return [...prev, { ...incoming, status: "SENT" }];
            });

            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        },
      );

      // Typing event listener
      const unsubscribeTyping = socketService.onTyping((typingData) => {
        if (
          typingData.roomId === roomId &&
          typingData.userId !== currentUserId
        ) {
          if (typingData.isTyping) {
            setTypingUser(typingData.userName || "Someone");
          } else {
            setTypingUser(null);
          }
        }
      });

      // Live error listener
      const unsubscribeError = socketService.onError((err: any) => {
        if (err?.code === "ROOM_ACCESS_DENIED") {
          setAuthError("FORBIDDEN");
          setErrorMessage(
            "Access denied: You are not an authorized member of this chat room.",
          );
        } else if (err?.code === "RATE_LIMITED") {
          setSendError(
            "You are sending messages too quickly. Please wait a moment.",
          );
        }
      });

      return () => {
        unsubscribeRoomState();
        unsubscribeMessage();
        unsubscribeTyping();
        unsubscribeError();
        if (roomId) {
          socketService.stopTyping(roomId);
          socketService.leaveRoom(roomId);
        }
      };
    }, [roomId, currentUserId]),
  );

  const sendMessageAttempt = async (
    trimmedBody: string,
    targetClientMessageId: string,
  ): Promise<boolean> => {
    // Attempt send via Socket.IO first
    const socketRes = await socketService.sendMessage(
      roomId,
      trimmedBody,
      targetClientMessageId,
    );

    if (socketRes.success && socketRes.message) {
      const persisted = socketRes.message;
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === targetClientMessageId ||
          m.id === targetClientMessageId
            ? { ...persisted, status: "SENT" }
            : m,
        ),
      );
      return true;
    }

    // If socket failed due to connection or timeout, fallback to HTTP REST
    try {
      const httpRes = await chatService.sendMessage(roomId, trimmedBody, targetClientMessageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === targetClientMessageId ||
          m.id === targetClientMessageId
            ? { ...httpRes, status: "SENT" }
            : m,
        ),
      );
      return true;
    } catch (httpErr: any) {
      console.warn("[ChatRoom] Both socket and HTTP sends failed:", httpErr);
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === targetClientMessageId ||
          m.id === targetClientMessageId
            ? { ...m, status: "FAILED" }
            : m,
        ),
      );
      setSendError(
        httpErr?.message || socketRes.error || "Failed to send message.",
      );
      return false;
    }
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    if (trimmed.length > 500) {
      setSendError("Message exceeds maximum limit of 500 characters.");
      return;
    }

    const clientMessageId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const optimisticMsg: OptimisticChatMessage = {
      id: clientMessageId,
      clientMessageId,
      roomId,
      senderId: currentUserId,
      senderName: currentUser?.name || "Athlete",
      senderRole: (currentUser?.role || "PLAYER") as any,
      body: trimmed,
      createdAt: new Date().toISOString(),
      status: "SENDING",
    };

    try {
      setSending(true);
      setSendError(null);
      setInputText("");

      // Add optimistic message to list
      setMessages((prev) => [...prev, optimisticMsg]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);

      await sendMessageAttempt(trimmed, clientMessageId);
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (failedMsg: OptimisticChatMessage) => {
    if (!failedMsg.clientMessageId && !failedMsg.id) return;
    const msgId = failedMsg.clientMessageId || failedMsg.id;

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, status: "SENDING" } : m)),
    );

    await sendMessageAttempt(failedMsg.body, msgId);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/chat");
    }
  };

  const handleViewMatch = () => {
    if (room?.matchId) {
      router.push(`/match/${room.matchId}`);
    }
  };

  // Guard: Unauthorized or Not Found States
  if (!loading && authError) {
    const isForbidden = authError === "FORBIDDEN";
    return (
      <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
        {/* Header */}
        <View className="w-full px-4 py-3.5 bg-[#141518]/25 border-b border-white/[0.08] flex-row items-center">
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back to chat channels"
            className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-[#1B1D22] border border-white/[0.08] active:scale-95"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white text-base font-bold uppercase tracking-tight">
            CHAT CHANNEL
          </Text>
        </View>

        {/* Access Denied / Not Found View */}
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-[#1B1D22] border border-white/[0.08] items-center justify-center mb-4">
            <Ionicons
              name={
                isForbidden ? "lock-closed-outline" : "alert-circle-outline"
              }
              size={32}
              color="#F59E0B"
            />
          </View>
          <Text className="text-white text-xl font-black uppercase tracking-tight text-center">
            {isForbidden ? "CHANNEL ACCESS DENIED" : "CHANNEL NOT FOUND"}
          </Text>
          <Text className="text-[#A0A5AD] text-xs font-medium text-center mt-2 max-w-[280px] leading-5">
            {errorMessage}
          </Text>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back to chat inbox"
            className="mt-6 py-3.5 px-6 rounded-xl bg-[#E85D26] items-center justify-center active:opacity-90 shadow-sm"
          >
            <Text className="text-[#0C0D0E] text-xs font-black uppercase tracking-wider">
              BACK TO CHAT
            </Text>
          </Pressable>
        </View>
      </ThemedScreen>
    );
  }

  const isGroup = room?.type === "GROUP" || room?.type === ("group" as any);

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      {/* Top Header */}
      <View className="w-full px-4 py-3 bg-[#141518]/25 border-b border-white/[0.08] flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          {/* Back Action */}
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-10 h-10 rounded-xl items-center justify-center mr-2.5 bg-[#1B1D22] border border-white/[0.08] active:scale-95"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>

          {/* Room Identity Avatar Well */}
          <View
            className={`w-10 h-10 rounded-xl items-center justify-center mr-3 border ${
              isGroup
                ? "bg-[#E85D26]/15 border-[#E85D26]/40"
                : "bg-[#1B1D22] border-white/[0.08]"
            }`}
          >
            <Ionicons
              name={isGroup ? "people" : "person"}
              size={19}
              color="#E85D26"
            />
          </View>

          {/* Room Title and Kicker Info */}
          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="text-white text-base font-bold uppercase tracking-tight"
            >
              {room?.title || "MATCH CHANNEL"}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Text className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider">
                {isGroup ? "MATCH SQUAD" : "DIRECT"}
              </Text>
              <Text className="text-[#5C616A] text-[10px] font-bold mx-1">
                ·
              </Text>
              <Text
                numberOfLines={1}
                className="text-[#A0A5AD] text-[10px] font-medium tracking-tight"
              >
                {room?.members
                  ? `${room.members.length} PARTICIPANTS`
                  : "CONFIRMED LINEUP"}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Indicator */}
        <View className="px-2.5 py-1 rounded-full bg-[#1B1D22] border border-white/[0.08]">
          <Text className="text-[#E85D26] text-[9px] font-bold uppercase tracking-wider">
            {isGroup ? "SQUAD" : "DIRECT"}
          </Text>
        </View>
      </View>

      {/* Socket Live Connection Banner */}
      <ConnectionBanner roomState={roomState} />

      {/* Associated Match Context Strip */}
      {room?.matchId && (
        <View className="w-full px-4 py-2.5 bg-[#1B1D22] border-b border-white/[0.08] flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-0.5">
              <Text className="text-[#E85D26] text-[9px] font-bold uppercase tracking-widest mr-1.5">
                FIXTURE
              </Text>
            </View>
            <Text
              numberOfLines={1}
              className="text-white text-xs font-bold uppercase tracking-tight"
            >
              {room.title}
            </Text>
          </View>

          <Pressable
            onPress={handleViewMatch}
            accessibilityRole="button"
            accessibilityLabel="View associated match fixture"
            className="py-1.5 px-3 rounded-lg bg-[#141518]/25 border border-white/[0.08] active:scale-95"
          >
            <Text className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider">
              VIEW FIXTURE →
            </Text>
          </Pressable>
        </View>
      )}

      {/* Main Messages FlatList Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center p-8">
            <ActivityIndicator size="large" color="#E85D26" />
            <Text className="text-[#A0A5AD] text-xs font-bold uppercase tracking-wider mt-3">
              LOADING MESSAGES...
            </Text>
          </View>
        ) : messages.length === 0 ? (
          <ChatEmptyState
            title={isGroup ? "SQUAD CHANNEL OPEN" : "DIRECT CHANNEL OPEN"}
            description={
              isGroup
                ? "Coordinate arrival, equipment and match-day details here."
                : "Direct player-captain communication open for this fixture."
            }
            icon={isGroup ? "people-outline" : "chatbubble-ellipses-outline"}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                currentUserId={currentUserId}
                isGroup={isGroup}
                onRetry={handleRetry}
              />
            )}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 16,
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        {/* Typing Notification Strip */}
        {typingUser && (
          <View className="px-4 py-1 bg-[#141518]/25 border-t border-white/[0.08] flex-row items-center">
            <ActivityIndicator
              size="small"
              color="#E85D26"
              style={{ transform: [{ scale: 0.6 }] }}
            />
            <Text className="text-[#A0A5AD] text-[11px] font-medium ml-1">
              {typingUser} is typing...
            </Text>
          </View>
        )}

        {/* Message Send Error Alert */}
        {sendError && (
          <View className="px-4 py-1.5 bg-[#F4A261]/10 border-t border-[#F4A261]/30 flex-row items-center justify-between">
            <Text className="text-[#F4A261] text-xs font-semibold flex-1 mr-2">
              {sendError}
            </Text>
            <Pressable onPress={() => setSendError(null)}>
              <Ionicons name="close" size={16} color="#F4A261" />
            </Pressable>
          </View>
        )}

        {/* Upgraded Composer */}
        <ChatComposer
          value={inputText}
          onChangeText={(text) => {
            setInputText(text);
            if (sendError) setSendError(null);
          }}
          onSend={handleSend}
          onTypingStart={() => socketService.startTyping(roomId)}
          onTypingStop={() => socketService.stopTyping(roomId)}
          sending={sending}
          placeholder={isGroup ? "Message squad..." : "Message captain..."}
          maxLength={500}
        />
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}
