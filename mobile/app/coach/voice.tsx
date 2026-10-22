import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator } from "../../components/theme/Primitives";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "../../components/theme/Icons";
import * as Speech from "expo-speech";
import { ArenaBadge } from "../../components/ui/ArenaBadge";
import { useAuthStore } from "../../store/useAuthStore";
import { coachService } from "../../services/coachService";
import { speechRecognitionService } from "../../services/speechRecognitionService";
import { CoachSport, CoachConversationMessage } from "../../types";
import { SPORT_CONFIG } from "../../utils/coachMock";
import { AmbientGlowOverlay } from "../../components/ui/AmbientCanvas";

type VoiceSessionState =
  "idle" | "listening" | "processing" | "speaking" | "responding" | "error";

interface SampleVoiceQuery {
  id: string;
  sport: CoachSport;
  title: string;
  query: string;
  category: string;
  isSafetySample?: boolean;
}

const SAMPLE_VOICE_QUERIES: Record<CoachSport, SampleVoiceQuery[]> = {
  cricket: [
    {
      id: "cricket-v1",
      sport: "cricket",
      title: "Death-Overs Yorker",
      query: "How can I bowl better yorkers at the death under floodlights?",
      category: "BOWLING",
    },
    {
      id: "cricket-v2",
      sport: "cricket",
      title: "In-Swinging Pace",
      query: "How do I prevent getting trapped LBW by late in-swinging pace?",
      category: "BATTING",
    },
    {
      id: "cricket-safety",
      sport: "cricket",
      title: "Shoulder Pain Check",
      query:
        "My shoulder hurts after bowling fast spells, can I push through it?",
      category: "SAFETY AUDIT",
      isSafetySample: true,
    },
  ],
  badminton: [
    {
      id: "badminton-v1",
      sport: "badminton",
      title: "Rear-Court Footwork",
      query: "How do I improve my rear court footwork and jump smash?",
      category: "FOOTWORK",
    },
    {
      id: "badminton-v2",
      sport: "badminton",
      title: "Doubles Net Pinch",
      query:
        "When should I pinch the T-line in doubles rather than defending wide?",
      category: "DOUBLES",
    },
    {
      id: "badminton-safety",
      sport: "badminton",
      title: "Ankle Strain Check",
      query:
        "I rolled my ankle on a rear lunging step and it is swollen, what medicine helps?",
      category: "SAFETY AUDIT",
      isSafetySample: true,
    },
  ],
  padel: [
    {
      id: "padel-v1",
      sport: "padel",
      title: "Bandeja Positioning",
      query:
        "How should I position after hitting a bandeja to maintain the net?",
      category: "OVERHEAD",
    },
    {
      id: "padel-v2",
      sport: "padel",
      title: "Double-Glass Rebound",
      query:
        "How do I read whether the ball rebounds off side glass first or back glass first?",
      category: "DEFENSE",
    },
    {
      id: "padel-safety",
      sport: "padel",
      title: "Elbow Tendon Pain",
      query:
        "I have severe elbow pain after off-center hits, what treatment do I take?",
      category: "SAFETY AUDIT",
      isSafetySample: true,
    },
  ],
  football: [
    {
      id: "football-v1",
      sport: "football",
      title: "First-Touch Under Press",
      query:
        "How can I improve my first touch under pressure on synthetic turf?",
      category: "TOUCH",
    },
    {
      id: "football-v2",
      sport: "football",
      title: "7v7 Midfield Traps",
      query:
        "How should our central midfield trio trigger an immediate trap on turf turnovers?",
      category: "PRESSING",
    },
    {
      id: "football-safety",
      sport: "football",
      title: "Hamstring Pull Check",
      query:
        "I felt a sharp tear in my hamstring during a sprint, how do I cure it?",
      category: "SAFETY AUDIT",
      isSafetySample: true,
    },
  ],
};

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/[-_]{3,}/g, "")
    .replace(/[`~]/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[|]/g, " ")
    .trim();
}

const WAVEFORM_BAR_BASE_HEIGHTS = [
  14, 20, 30, 42, 54, 64, 76, 84, 88, 80, 72, 82, 86, 76, 62, 50, 52, 66, 82,
  88, 80, 66, 56, 72, 80, 64, 48, 36, 26, 18, 14, 10,
];

export default function VoiceCoachScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ sport?: string }>();
  const { playerProfile } = useAuthStore();

  const [selectedSport, setSelectedSport] = useState<CoachSport>(() => {
    if (
      params.sport &&
      ["cricket", "badminton", "padel", "football"].includes(params.sport)
    ) {
      return params.sport as CoachSport;
    }
    if (
      playerProfile?.preferredSports &&
      playerProfile.preferredSports.length > 0
    ) {
      const pref = playerProfile.preferredSports[0] as CoachSport;
      if (["cricket", "badminton", "padel", "football"].includes(pref)) {
        return pref;
      }
    }
    return "padel";
  });

  const [sessionState, setSessionState] = useState<VoiceSessionState>("idle");
  const [activeQuery, setActiveQuery] = useState<string>(
    SPORT_CONFIG[selectedSport].defaultVoiceQuery,
  );
  const [partialTranscript, setPartialTranscript] = useState<string>("");
  const [coachResponse, setCoachResponse] = useState<{
    text: string;
    timestamp: string;
  } | null>({
    text: "Your footwork on the backhand needs to be quicker. Try the lateral shuffle drill for 3 minutes.",
    timestamp: "JUST NOW",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    CoachConversationMessage[]
  >([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [autoSpeakEnabled] = useState<boolean>(true);

  const [meterLevel, setMeterLevel] = useState<number>(1);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch {}
      speechRecognitionService.cancelListening();
      if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    };
  }, []);

  const handleSelectSport = (sport: CoachSport) => {
    if (sessionState === "listening" || sessionState === "processing") return;
    try {
      Speech.stop();
    } catch {}
    setIsSpeaking(false);
    setSelectedSport(sport);
    setActiveQuery(SPORT_CONFIG[sport].defaultVoiceQuery);
    setCoachResponse(null);
    setErrorMessage(null);
    setPartialTranscript("");
    setConversationHistory([]);
    setSessionState("idle");
  };

  const handleStartListening = async () => {
    try {
      await Speech.stop();
    } catch {}
    setIsSpeaking(false);
    setErrorMessage(null);

    const perm = await speechRecognitionService.requestPermission();
    if (!perm.granted) {
      setSessionState("error");
      setErrorMessage(
        perm.status === "unavailable"
          ? "Voice input is unavailable here. Open Text Coach and type your question or use your keyboard’s microphone."
          : "Microphone permission was denied.",
      );
      return;
    }

    setSessionState("listening");
    setPartialTranscript("");
    setActiveQuery("");

    setMeterLevel(1);
    if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    meterIntervalRef.current = setInterval(() => {
      setMeterLevel((prev) => (prev % 5) + 1);
    }, 180);

    await speechRecognitionService.startListening({
      onStart: () => {
        setSessionState("listening");
      },
      onPartialResult: (transcript) => {
        setPartialTranscript(transcript);
        setActiveQuery(transcript);
      },
      onFinalResult: (transcript) => {
        if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
        const trimmed = transcript.trim();
        setActiveQuery(trimmed);
        setPartialTranscript("");
        if (trimmed) {
          handleSendTranscript(trimmed);
        } else {
          setSessionState("idle");
        }
      },
      onError: (err) => {
        if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
        setSessionState("error");
        setErrorMessage(err);
      },
      onEnd: () => {
        if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
        setSessionState((current) =>
          current === "listening" ? "idle" : current,
        );
      },
    });
  };

  const handleFinishListening = async () => {
    if (sessionState !== "listening") return;
    if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    await speechRecognitionService.stopListening();

    if (partialTranscript.trim()) {
      const text = partialTranscript.trim();
      setActiveQuery(text);
      setPartialTranscript("");
      handleSendTranscript(text);
    }
  };

  const handleCancelListening = async () => {
    if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    await speechRecognitionService.cancelListening();
    setSessionState("idle");
    setPartialTranscript("");
  };

  const handleSendTranscript = async (transcriptText: string) => {
    const trimmed = transcriptText.trim();
    if (!trimmed) {
      setSessionState("idle");
      return;
    }

    setSessionState("processing");
    setErrorMessage(null);

    try {
      const response = await coachService.sendCoachMessage({
        sport: selectedSport,
        message: trimmed,
        conversation: conversationHistory.slice(-10),
      });

      if (response.data?.message) {
        const answer = response.data.message;
        setCoachResponse({
          text: answer,
          timestamp: "JUST NOW",
        });

        setConversationHistory((prev) => [
          ...prev.slice(-8),
          { role: "user", content: trimmed.slice(0, 1500) },
          { role: "assistant", content: answer.slice(0, 1500) },
        ]);

        if (autoSpeakEnabled) {
          setSessionState("speaking");
          setIsSpeaking(true);
          const spokenText = cleanTextForSpeech(answer);
          Speech.speak(spokenText, {
            language: "en-US",
            onDone: () => {
              setIsSpeaking(false);
              setSessionState("responding");
            },
            onStopped: () => {
              setIsSpeaking(false);
              setSessionState("responding");
            },
            onError: () => {
              setIsSpeaking(false);
              setSessionState("responding");
            },
          });
        } else {
          setSessionState("responding");
        }
      } else {
        setSessionState("error");
        setErrorMessage(
          response.error || "AI Coach is temporarily unavailable.",
        );
      }
    } catch (err: any) {
      setSessionState("error");
      setErrorMessage(
        err?.message || "Network error connecting to Maidaan Coach.",
      );
    }
  };

  const handleSpeakResponse = () => {
    if (!coachResponse?.text) return;
    try {
      Speech.stop();
    } catch {}
    setSessionState("speaking");
    setIsSpeaking(true);
    const spokenText = cleanTextForSpeech(coachResponse.text);
    Speech.speak(spokenText, {
      language: "en-US",
      onDone: () => {
        setIsSpeaking(false);
        setSessionState("responding");
      },
      onStopped: () => {
        setIsSpeaking(false);
        setSessionState("responding");
      },
      onError: () => {
        setIsSpeaking(false);
        setSessionState("responding");
      },
    });
  };

  const handleStopSpeaking = () => {
    try {
      Speech.stop();
    } catch {}
    setIsSpeaking(false);
    setSessionState("responding");
  };

  const handleResetSession = () => {
    try {
      Speech.stop();
    } catch {}
    speechRecognitionService.cancelListening();
    if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    setSessionState("idle");
    setCoachResponse(null);
    setErrorMessage(null);
    setPartialTranscript("");
    setIsSpeaking(false);
  };

  const sampleQueries = SAMPLE_VOICE_QUERIES[selectedSport] || [];

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
      {/* Top Header Row (Phone 3 Benchmark) */}
      <View className="px-5 py-3 flex-row items-center justify-between z-20">
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/coach");
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="w-10 h-10 rounded-full bg-[#1B1D22] border border-white/[0.08] items-center justify-center active:bg-[#22252B]"
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>

        <View className="items-center">
          <Text
            style={{ color: "#FFFFFF" }}
            className="text-white text-base font-bold tracking-tight uppercase"
          >
            Maidaan AI Coach
          </Text>
          <Text
            style={{ color: "#E85D26" }}
            className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider mt-0.5"
          >
            Voice Session • {selectedSport.toUpperCase()}
          </Text>
        </View>

        <Pressable
          onPress={() => router.replace("/(tabs)/coach")}
          accessibilityRole="button"
          accessibilityLabel="Text Coach"
          className="w-10 h-10 rounded-full bg-[#1B1D22] border border-white/[0.08] items-center justify-center active:bg-[#22252B]"
        >
          <Ionicons name="chatbox-ellipses-outline" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <ThemedScroll
        kind="profile"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 32,
        }}
        className="flex-1 px-5"
      >
        {/* Subtle Warm Stadium Orange Bloom */}
        <AmbientGlowOverlay top={60} size={280} opacity={0.16} />

        {/* PROMINENT BENCHMARK ELEMENT: Audio Waveform Visualizer */}
        <View className="items-center justify-center pt-8 pb-4 relative min-h-[170px]">
          {/* Radial Ambient Orange Glow Behind Waveform */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: 240,
              height: 110,
              borderRadius: 60,
              backgroundColor: "rgba(232, 93, 38, 0.24)",
              zIndex: 0,
            }}
          />

          {/* Waveform Bars Row */}
          <View
            className="flex-row items-center justify-center z-10"
            style={{ gap: 4 }}
          >
            {WAVEFORM_BAR_BASE_HEIGHTS.map((baseH, idx) => {
              const isOrange = idx % 2 === 0;
              let height = baseH;

              if (sessionState === "listening") {
                const dynamicMultiplier = 0.5 + ((meterLevel + idx) % 5) * 0.25;
                height = Math.max(8, Math.min(96, baseH * dynamicMultiplier));
              } else if (sessionState === "speaking") {
                const waveMultiplier =
                  0.6 + Math.sin(idx * 0.4 + Date.now() / 300) * 0.4;
                height = Math.max(8, Math.min(90, baseH * waveMultiplier));
              } else if (sessionState === "processing") {
                height = Math.max(12, baseH * 0.4);
              }

              return (
                <View
                  key={idx}
                  style={{
                    width: 3.5,
                    height,
                    borderRadius: 2,
                    backgroundColor: isOrange ? "#E85D26" : "#FFFFFF",
                    opacity: isOrange ? 0.95 : 0.85,
                  }}
                />
              );
            })}
          </View>

          {/* Status Label Under Waveform */}
          <View className="mt-5 items-center">
            <Text
              style={{
                color: sessionState === "listening" ? "#E85D26" : "#FFFFFF",
              }}
              className="text-base font-bold tracking-wide uppercase"
            >
              {sessionState === "listening" && "Listening..."}
              {sessionState === "processing" && "Analyzing..."}
              {sessionState === "speaking" && "Coach Speaking..."}
              {sessionState === "responding" && "Response Ready"}
              {sessionState === "error" && "Session Notice"}
              {sessionState === "idle" && "Ready to Listen"}
            </Text>

            <Text
              style={{ color: "#5C616A" }}
              className="text-xs font-normal mt-0.5"
            >
              {sessionState === "listening"
                ? "Speak clearly into the microphone"
                : sessionState === "speaking"
                  ? "Reading technical tactical advice"
                  : "Tap microphone to start inquiry"}
            </Text>
          </View>
        </View>

        {/* BENCHMARK ELEMENT: Translucent Transcript Panel (Phone 3) */}
        <View className="bg-[#141518]/90 border border-white/[0.08] rounded-2xl p-5 my-3 shadow-md">
          <View className="flex-row items-center justify-between mb-2">
            <Text
              style={{ color: "#A0A5AD" }}
              className="text-[#A0A5AD] text-xs font-bold uppercase tracking-wider"
            >
              Transcript
            </Text>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-[#E85D26] mr-1.5" />
              <Text
                style={{ color: "#E85D26" }}
                className="text-[#E85D26] text-[10px] font-bold uppercase tracking-wider"
              >
                {selectedSport}
              </Text>
            </View>
          </View>

          <Text
            style={{ color: "#FFFFFF" }}
            className="text-white text-sm font-medium leading-relaxed"
          >
            {coachResponse?.text ||
              (activeQuery
                ? `“${activeQuery}”`
                : "Your inquiry transcript and AI coaching recommendations will appear here.")}
          </Text>

          {errorMessage && (
            <View className="mt-3 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30">
              <Text
                style={{ color: "#EF4444" }}
                className="text-[#EF4444] text-xs"
              >
                {errorMessage}
              </Text>
            </View>
          )}
        </View>

        {/* BENCHMARK ELEMENT: Premium Circular Controls Row (Phone 3) */}
        <View
          className="flex-row items-center justify-center my-4"
          style={{ gap: 24 }}
        >
          {/* Left Control: Reset / Replay */}
          <Pressable
            onPress={handleResetSession}
            accessibilityRole="button"
            accessibilityLabel="Reset voice session"
            className="w-12 h-12 rounded-full bg-[#1B1D22] border border-white/[0.12] items-center justify-center active:bg-[#20232A] active:scale-95 shadow-md"
          >
            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
          </Pressable>

          {/* Central Control: Glowing Solar Orange Microphone / Play */}
          <Pressable
            onPress={
              sessionState === "idle"
                ? handleStartListening
                : sessionState === "listening"
                  ? handleFinishListening
                  : sessionState === "speaking"
                    ? handleStopSpeaking
                    : sessionState === "responding"
                      ? handleSpeakResponse
                      : handleStartListening
            }
            accessibilityRole="button"
            accessibilityLabel="Microphone action"
            className="w-16 h-16 rounded-full bg-[#E85D26] items-center justify-center active:scale-95 active:bg-[#FF723A] shadow-xl shadow-[#E85D26]/40"
          >
            {sessionState === "listening" ? (
              <Ionicons name="mic" size={28} color="#FFFFFF" />
            ) : sessionState === "processing" ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : sessionState === "speaking" ? (
              <Ionicons name="volume-high" size={26} color="#FFFFFF" />
            ) : (
              <Ionicons name="mic-outline" size={28} color="#FFFFFF" />
            )}
          </Pressable>

          {/* Right Control: Speak or Switch to Text Coach */}
          <Pressable
            onPress={() => {
              if (coachResponse?.text) {
                if (isSpeaking) {
                  handleStopSpeaking();
                } else {
                  handleSpeakResponse();
                }
              } else {
                router.replace("/(tabs)/coach");
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Audio or Text Coach"
            className="w-12 h-12 rounded-full bg-[#1B1D22] border border-white/[0.12] items-center justify-center active:bg-[#20232A] active:scale-95 shadow-md"
          >
            <Ionicons
              name={isSpeaking ? "pause" : "play-skip-forward"}
              size={18}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        {/* Sport Discipline Selector Pills */}
        <View className="mt-2 mb-4">
          <Text
            style={{ color: "#5C616A" }}
            className="text-[#5C616A] text-xs font-bold uppercase tracking-wider mb-2"
          >
            Select Sport Discipline
          </Text>
          <View className="flex-row space-x-2">
            {(
              ["cricket", "badminton", "padel", "football"] as CoachSport[]
            ).map((sport) => {
              const isSelected = selectedSport === sport;
              const config = SPORT_CONFIG[sport];
              return (
                <Pressable
                  key={sport}
                  onPress={() => handleSelectSport(sport)}
                  className={`flex-1 py-2 px-1 rounded-xl border items-center justify-center mr-1.5 ${
                    isSelected
                      ? "bg-[#1B1D22] border-2 border-[#E85D26]"
                      : "bg-[#141518]/25 border-white/[0.08]"
                  }`}
                >
                  <MaterialCommunityIcons
                    name={config.icon}
                    size={16}
                    color={isSelected ? "#E85D26" : "#A0A5AD"}
                  />
                  <Text
                    style={{
                      color: isSelected ? "#FFFFFF" : "#A0A5AD",
                    }}
                    className={`text-[10px] font-bold uppercase tracking-tight mt-1 ${
                      isSelected ? "text-white" : "text-[#A0A5AD]"
                    }`}
                  >
                    {config.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sample Voice Query Prompts */}
        <View className="mt-2">
          <Text
            style={{ color: "#5C616A" }}
            className="text-[#5C616A] text-xs font-bold uppercase tracking-wider mb-2"
          >
            Sample Voice Queries
          </Text>
          {sampleQueries.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                if (
                  sessionState === "listening" ||
                  sessionState === "processing"
                )
                  return;
                setActiveQuery(item.query);
                handleSendTranscript(item.query);
              }}
              accessibilityRole="button"
              className="p-3.5 rounded-xl bg-[#141518]/25 border border-white/[0.08] mb-2 flex-row items-center justify-between active:bg-[#1B1D22]"
            >
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1">
                  <ArenaBadge
                    label={item.category}
                    variant={item.isSafetySample ? "warm" : "neutral"}
                    size="sm"
                  />
                  <Text
                    style={{ color: "#FFFFFF" }}
                    className="text-white text-xs font-bold ml-2"
                  >
                    {item.title}
                  </Text>
                </View>
                <Text
                  style={{ color: "#A0A5AD" }}
                  className="text-[#A0A5AD] text-xs font-normal"
                  numberOfLines={2}
                >
                  &ldquo;{item.query}&rdquo;
                </Text>
              </View>
              <Ionicons name="play-circle" size={20} color="#E85D26" />
            </Pressable>
          ))}
        </View>

        {/* Safety & Protocol Footer */}
        <View className="mt-4 pt-3 border-t border-white/[0.08] flex-row items-center justify-center">
          <Ionicons name="shield-checkmark" size={12} color="#E85D26" />
          <Text
            style={{ color: "#5C616A" }}
            className="text-[#5C616A] text-[10px] font-semibold tracking-wider uppercase ml-1.5"
          >
            Athletic Guidance • Fair Play • Not Medical Advice
          </Text>
        </View>
      </ThemedScroll>
    </ThemedScreen>
  );
}
