import { ArtworkScrollView as ThemedScroll } from "../components/ui/Artwork";
import { ThemedScreen } from "../components/ui/ThemedScreen";
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/useAuthStore";
import {
  agentService,
  AgentIntent,
  CaptainActionSummary,
  SourceMetadata,
  AgentMatchData,
  AgentHubData,
  AgentWeatherData,
  AgentJoinRequestData,
} from "../services/agentService";
import { MatchResultCards } from "../components/concierge/MatchResultCards";
import { HubResultCards } from "../components/concierge/HubResultCards";
import { WeatherResultCard } from "../components/concierge/WeatherResultCard";
import { CaptainConfirmationCard } from "../components/concierge/CaptainConfirmationCard";
import { CaptainRequestCard } from "../components/concierge/CaptainRequestCard";
import { SourceChips } from "../components/concierge/SourceChips";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  intent?: AgentIntent;
  toolResult?: Record<string, unknown> | null;
  action?: CaptainActionSummary | null;
  sources?: SourceMetadata[] | null;
  timestamp: string;
}

const PLAYER_PROMPT_SUGGESTIONS = [
  "Find me a football match",
  "Find a verified Padel hub near DHA",
  "Should I play cricket outside tomorrow?",
  "What does verified hub mean?",
  "How do join requests work?",
];

const CAPTAIN_PROMPT_SUGGESTIONS = [
  "Show my matches with open slots",
  "Show pending join requests",
  "Create a 7v7 football match tomorrow at 8pm",
  "Should I host an outdoor match tomorrow?",
  "What does verified hub mean?",
];

export default function ConciergeScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, roles, activeMode } = useAuthStore();
  const userRole = roles.includes(activeMode) ? activeMode : "PLAYER";
  const isCaptain = userRole === "TEAM_CAPTAIN";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll on new message or typing state change
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  const promptSuggestions = isCaptain
    ? CAPTAIN_PROMPT_SUGGESTIONS
    : PLAYER_PROMPT_SUGGESTIONS;

  const handleSendMessage = async (textToSend?: string) => {
    const raw = textToSend !== undefined ? textToSend : inputText;
    const message = raw.trim();
    if (!message || isLoading) return;

    setInputText("");
    setSessionError(null);

    const userMsgId = `usr_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: message,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await agentService.chat(message);

      if (!response || response.status !== 200 || !response.data) {
        let errorFallback = "Maidaan Concierge is temporarily unavailable.";
        if (response?.status === 401) {
          errorFallback =
            "Authentication required. Please sign in to consult your Concierge.";
        } else if (response?.status === 400) {
          errorFallback =
            "Invalid request. Please provide more detail about your match or game.";
        } else if (response?.error) {
          errorFallback = response.error;
        }

        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          role: "assistant",
          text: errorFallback,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      const agentData = response.data;
      const assistantMsg: ChatMessage = {
        id: agentData.requestId || `ast_${Date.now()}`,
        role: "assistant",
        text: agentData.message,
        intent: agentData.intent,
        toolResult: agentData.data || agentData.toolResult,
        action: agentData.action,
        sources: agentData.sources,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        text: "Maidaan Concierge is temporarily unavailable. Please check your connection and try again.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionComplete = (
    msgId: string,
    updatedAction: CaptainActionSummary,
  ) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, action: updatedAction } : m)),
    );
  };

  return (
    <ThemedScreen
      className="flex-1 bg-transparent"
      edges={["top", "left", "right"]}
    >
      {/* Header (44px min touch target on back button) */}
      <View className="px-5 py-3.5 border-b border-white/[0.08] bg-[#0C0D0E] flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to previous screen"
            className="w-11 h-11 rounded-full bg-[#141518]/25 border border-white/[0.08] items-center justify-center mr-3 active:bg-[#1B1D22]"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>

          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-white text-base font-black uppercase tracking-tight mr-1.5">
                Maidaan Concierge
              </Text>
              <View className="w-2 h-2 rounded-full bg-[#E85D26]" />
            </View>
            <Text className="text-[#A0A5AD] text-xs font-normal">
              Your game-day assistant
            </Text>
          </View>
        </View>

        {/* Role Pill */}
        <View className="px-2.5 py-1 rounded-full bg-[#141518]/25 border border-white/[0.08]">
          <Text className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider">
            {isCaptain ? "Team Captain" : "Player"}
          </Text>
        </View>
      </View>

      {/* Main Conversation Stream */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        className="flex-1"
      >
        <ThemedScroll
          kind="profile"
          ref={scrollViewRef}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 24,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome / Empty State */}
          {messages.length === 0 ? (
            <View className="my-auto py-6">
              <View className="w-12 h-12 rounded-2xl bg-[#E85D26]/10 border border-[#E85D26]/20 items-center justify-center mb-4">
                <Ionicons name="sparkles" size={24} color="#E85D26" />
              </View>

              <Text className="text-white text-xl font-black uppercase tracking-tight mb-2">
                Game-Day Operations, Simplified
              </Text>
              <Text className="text-[#A0A5AD] text-sm leading-5 mb-6">
                Ask about open matches, verified sports hubs, outdoor weather
                conditions, or platform rules.
                {isCaptain
                  ? " As Team Captain, you can also draft fixtures and review squad applicants."
                  : ""}
              </Text>

              {/* Role-Aware Suggestion Chips */}
              <Text className="text-[#5C616A] text-xs font-bold uppercase tracking-wider mb-2.5">
                Suggested Questions
              </Text>
              <View className="space-y-2">
                {promptSuggestions.map((prompt, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleSendMessage(prompt)}
                    accessibilityRole="button"
                    accessibilityLabel={`Suggested question: ${prompt}`}
                    className="w-full min-h-[44px] p-3 rounded-xl bg-[#141518]/25 border border-white/[0.08] active:bg-[#1B1D22] flex-row items-center justify-between"
                  >
                    <Text className="text-[#A0A5AD] text-xs font-medium flex-1 mr-2">
                      {prompt}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color="#E85D26" />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";

              // Extract structured data from toolResult if present
              const matchesList: AgentMatchData[] =
                (msg.toolResult?.matches as AgentMatchData[]) || [];
              const hubsList: AgentHubData[] =
                (msg.toolResult?.hubs as AgentHubData[]) || [];
              const weatherObj: AgentWeatherData | null =
                msg.intent === "WEATHER" && msg.toolResult
                  ? (msg.toolResult as unknown as AgentWeatherData)
                  : null;
              const pendingRequests: AgentJoinRequestData[] =
                (msg.toolResult?.requests as AgentJoinRequestData[]) || [];

              return (
                <View
                  key={msg.id}
                  className={`w-full mb-4 flex-row ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <View
                    className={`max-w-[88%] rounded-2xl p-4 ${
                      isUser
                        ? "bg-[#20232A] border border-[#E85D26]/30 rounded-tr-sm"
                        : "bg-[#141518]/25 border border-white/[0.08] rounded-tl-sm"
                    }`}
                  >
                    {/* Role header for assistant */}
                    {!isUser ? (
                      <View className="flex-row items-center justify-between mb-1.5 pb-1 border-b border-white/[0.06]">
                        <View className="flex-row items-center">
                          <Ionicons name="sparkles" size={12} color="#E85D26" />
                          <Text className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider ml-1">
                            Maidaan Concierge
                          </Text>
                        </View>
                        <Text className="text-[#5C616A] text-[10px] font-normal">
                          {msg.timestamp}
                        </Text>
                      </View>
                    ) : null}

                    {/* Message Body Text */}
                    <Text className="text-white text-sm font-normal leading-5">
                      {msg.text}
                    </Text>

                    {/* Coaching Navigation CTA */}
                    {msg.intent === "COACHING" ? (
                      <Pressable
                        onPress={() => router.push("/(tabs)/coach")}
                        accessibilityRole="button"
                        accessibilityLabel="Open dedicated AI Tactical Coach screen"
                        className="mt-3 p-2.5 rounded-lg bg-[#E85D26]/10 border border-[#E85D26]/30 flex-row items-center justify-between active:bg-[#E85D26]/20 min-h-[44px]"
                      >
                        <View className="flex-row items-center">
                          <Ionicons name="fitness" size={16} color="#E85D26" />
                          <Text className="text-white text-xs font-bold ml-1.5">
                            Open AI Tactical Coach
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color="#E85D26"
                        />
                      </Pressable>
                    ) : null}

                    {/* Matchmaking Structured Cards */}
                    {matchesList.length > 0 ? (
                      <MatchResultCards matches={matchesList} />
                    ) : null}

                    {/* Hub Discovery Structured Cards */}
                    {hubsList.length > 0 ? (
                      <HubResultCards hubs={hubsList} />
                    ) : null}

                    {/* Weather Suitability Card */}
                    {weatherObj ? (
                      <WeatherResultCard weather={weatherObj} />
                    ) : null}

                    {/* Captain Pending Requests */}
                    {pendingRequests.length > 0 ? (
                      <CaptainRequestCard requests={pendingRequests} />
                    ) : null}

                    {/* Captain Action Confirmation Card */}
                    {msg.action ? (
                      <CaptainConfirmationCard
                        action={msg.action}
                        onActionComplete={(updated) =>
                          handleActionComplete(msg.id, updated)
                        }
                      />
                    ) : null}

                    {/* Knowledge Sources Attribution Chips */}
                    {msg.sources && msg.sources.length > 0 ? (
                      <SourceChips sources={msg.sources} />
                    ) : null}

                    {/* User timestamp */}
                    {isUser ? (
                      <Text className="text-[#5C616A] text-[10px] font-normal text-right mt-1.5">
                        {msg.timestamp}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}

          {/* Loading Indicator */}
          {isLoading ? (
            <View className="flex-row items-center p-3 rounded-xl bg-[#141518]/25 border border-white/[0.08] max-w-[80%] mb-3">
              <ActivityIndicator size="small" color="#E85D26" />
              <Text className="text-[#A0A5AD] text-xs font-medium ml-2.5">
                Consulting fixtures and conditions...
              </Text>
            </View>
          ) : null}
        </ThemedScroll>

        {/* Composer (44px min touch target on send button) */}
        <View className="px-5 py-3 bg-[#0C0D0E] border-t border-white/[0.08]">
          <View className="flex-row items-center space-x-2">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about fixtures, hubs, weather..."
              placeholderTextColor="#5C616A"
              returnKeyType="send"
              onSubmitEditing={() => handleSendMessage()}
              editable={!isLoading}
              className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#141518]/25 border border-white/[0.08] text-white text-sm focus:border-[#E85D26]"
            />

            <Pressable
              onPress={() => handleSendMessage()}
              disabled={isLoading || !inputText.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send message to Maidaan Concierge"
              className={`w-11 h-11 rounded-xl items-center justify-center ${
                inputText.trim() && !isLoading
                  ? "bg-[#E85D26] active:bg-[#D04E1B]"
                  : "bg-[#141518]/25 border border-white/[0.08] opacity-50"
              }`}
            >
              <Ionicons
                name="send"
                size={18}
                color={inputText.trim() && !isLoading ? "#FFFFFF" : "#5C616A"}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}
