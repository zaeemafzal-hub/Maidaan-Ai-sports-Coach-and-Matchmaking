import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "../../components/theme/Primitives";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "../../components/theme/Icons";
import { ArenaBadge } from "../../components/ui/ArenaBadge";
import { AmbientGlowOverlay } from "../../components/ui/AmbientCanvas";
import { useAuthStore } from "../../store/useAuthStore";
import { useStore } from "zustand";
import { assistantHistory, useAssistantThread } from "../../store/useAssistantHistory";
import type { CoachMessage } from "../../types/assistantHistory";
import { CoachSport } from "../../types";

type DrillCategory = "ALL" | "TECHNIQUE" | "TACTICS" | "DRILLS" | "PREP";

interface SportPromptSuggestion {
  id: string;
  sport: CoachSport;
  category: "TECHNIQUE" | "TACTICS" | "DRILLS" | "PREP";
  title: string;
  prompt: string;
  badge: string;
}

const SPORT_CONFIG: Record<
  CoachSport,
  {
    label: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    courtType: string;
    circuitFocus: string;
    color: string;
  }
> = {
  cricket: {
    label: "CRICKET",
    icon: "cricket",
    courtType: "Tape-Ball & Nets",
    circuitFocus: "Death Overs & Powerplay Execution",
    color: "#F4A261",
  },
  badminton: {
    label: "BADMINTON",
    icon: "badminton",
    courtType: "Wooden & Synthetic Courts",
    circuitFocus: "Doubles Rotations & Net Kills",
    color: "#7FD1AE",
  },
  padel: {
    label: "PADEL",
    icon: "tennis",
    courtType: "Enclosed Glass & Mesh",
    circuitFocus: "Bandeja Depth & Rebound Reads",
    color: "#64B5F6",
  },
  football: {
    label: "FOOTBALL",
    icon: "soccer",
    courtType: "7v7 Floodlit Turf",
    circuitFocus: "Press Resistance & Half-Turn Passes",
    color: "#22C55E",
  },
};

const SUGGESTED_PROMPTS: SportPromptSuggestion[] = [
  // Cricket
  {
    id: "cricket-01",
    sport: "cricket",
    category: "TECHNIQUE",
    title: "Tape-Ball Yorker Drill",
    prompt:
      "How do I nail toe-crushing yorkers in death overs with a taped tennis ball?",
    badge: "BOWLING FORM",
  },
  {
    id: "cricket-02",
    sport: "cricket",
    category: "TACTICS",
    title: "Death Overs Field Setup",
    prompt:
      "What field placement protects the leg-side boundary in the last 2 overs?",
    badge: "TACTICAL SHAPE",
  },
  {
    id: "cricket-03",
    sport: "cricket",
    category: "TECHNIQUE",
    title: "Playing In-Swinging Pace",
    prompt:
      "How do I prevent getting trapped LBW or bowled by late swing under lights?",
    badge: "BATTING CUES",
  },
  {
    id: "cricket-04",
    sport: "cricket",
    category: "DRILLS",
    title: "Powerplay Lofted Drive Drill",
    prompt:
      "Give me a 15-minute netting drill to clear the 30-yard circle safely.",
    badge: "NET ROUTINE",
  },

  // Badminton
  {
    id: "badminton-01",
    sport: "badminton",
    category: "TECHNIQUE",
    title: "Rear-Court Jump Smash",
    prompt:
      "How can I increase the steepness and speed of my rear-court jump smash?",
    badge: "STEEP ANGLE",
  },
  {
    id: "badminton-02",
    sport: "badminton",
    category: "TACTICS",
    title: "Doubles Net Pinch Rotation",
    prompt:
      "When should the front player pinch the T-line versus sliding to defend wide?",
    badge: "DOUBLES SYNERGY",
  },
  {
    id: "badminton-03",
    sport: "badminton",
    category: "DRILLS",
    title: "Split-Step Reaction Drill",
    prompt:
      "How do I time my split-step so I am not caught flat-footed on fast lifts?",
    badge: "FOOTWORK AGILITY",
  },
  {
    id: "badminton-04",
    sport: "badminton",
    category: "PREP",
    title: "Forehand Net Drop Spin",
    prompt:
      "What wrist action produces maximum tumbling spin on tight net drops?",
    badge: "TOUCH & FEEL",
  },

  // Padel
  {
    id: "padel-01",
    sport: "padel",
    category: "TECHNIQUE",
    title: "Bandeja Depth & Control",
    prompt:
      "What are the exact mechanical cues to hit a deep bandeja without giving up the net?",
    badge: "OVERHEAD SHAPE",
  },
  {
    id: "padel-02",
    sport: "padel",
    category: "TACTICS",
    title: "Double-Glass Defense Reads",
    prompt:
      "How do I read whether the ball will rebound off side glass first or back glass first?",
    badge: "WALL POSITIONING",
  },
  {
    id: "padel-03",
    sport: "padel",
    category: "TECHNIQUE",
    title: "Víbora Aggressive Slice",
    prompt:
      "How does the racket angle differ between a neutral bandeja and a venomous víbora?",
    badge: "ATTACKING OVERHEAD",
  },
  {
    id: "padel-04",
    sport: "padel",
    category: "DRILLS",
    title: "Chiquita Transition Routine",
    prompt:
      "What drill helps me drop a soft chiquita to opponent feet and sprint to the net?",
    badge: "NET APPROACH",
  },

  // Football
  {
    id: "football-01",
    sport: "football",
    category: "TACTICS",
    title: "7v7 Midfield Counter-Press",
    prompt:
      "How should our central midfield trio trigger an immediate trap on turf turnovers?",
    badge: "TURF PRESSING",
  },
  {
    id: "football-02",
    sport: "football",
    category: "TECHNIQUE",
    title: "First-Touch On The Half-Turn",
    prompt:
      "How do I open my body shape when receiving back-to-goal under tight defender marking?",
    badge: "FIRST TOUCH",
  },
  {
    id: "football-03",
    sport: "football",
    category: "DRILLS",
    title: "Low Driven Instep Finishing",
    prompt:
      "What technique ensures crisp, grounded strikes across the keeper on small turf goals?",
    badge: "CLINICAL FINISH",
  },
  {
    id: "football-04",
    sport: "football",
    category: "PREP",
    title: "Pre-Match 7v7 Activation",
    prompt:
      "Give me a 10-minute dynamic warm-up checklist before an 8:30 PM floodlit match.",
    badge: "MATCH READINESS",
  },
];

const INITIAL_COACH_MESSAGES: Record<CoachSport, CoachMessage[]> = {
  cricket: [
    {
      id: "m-cricket-init",
      sender: "COACH",
      sport: "cricket",
      text: "Salaam Athlete. I am your Maidaan AI Tactical Coach. Whether you are prepping for tape-ball death overs under Gulberg floodlights or fine-tuning turf netting sessions, I provide structured mechanical breakdowns, field placements, and pressure routines.",
      timestamp: "STATIC DRILL EXAMPLE",
      drillPlan: {
        title: "TAPE-BALL FOUNDATION // THE BLOCKHOLE SPELL",
        objective:
          "Zero in on the 6-inch corridor at the batsman toes to shut down late-innings boundaries.",
        cues: [
          "LOCK WRIST: Taped tennis balls whip with air pressure; firm wrist prevents floating full tosses.",
          "COLLAPSE FRONT KNEE SLIGHTLY: Lower your release height by 2 inches to ensure skidding trajectory.",
          "AIM AT BASE OF STUMPS: Never look at the batsman eyes during release; focus on the crease line.",
        ],
        routine: {
          sets: "4 spells",
          reps: "6 deliveries per spell",
          duration: "15 mins",
          setup:
            "Place a shoe or chalk target 6 inches inside the batting crease.",
        },
        proTip:
          "In Lahore floodlit games, moisture on turf makes the tape skid faster. Aim 3 inches fuller than usual.",
      },
    },
  ],
  badminton: [
    {
      id: "m-badminton-init",
      sender: "COACH",
      sport: "badminton",
      text: "Welcome to the court. I am calibrated for both doubles fast-paced flat exchanges and singles court-coverage stamina. Select a drill below or ask about jump smashes, net spinning, or split-step footwork timing.",
      timestamp: "STATIC DRILL EXAMPLE",
      drillPlan: {
        title: "DOUBLES AGILITY // THE T-LINE PINCH",
        objective:
          "Intercept loose midcourt returns before they cross the service line.",
        cues: [
          "RACKET NOSE HIGH: Keep racket head at eyebrow level; never drop hands below waist.",
          "SPLIT-STEP TIMING: Bounce lightly onto the balls of your feet the exact millisecond the opponent racket strikes the shuttle.",
          "SHORT COMPACT TAP: Do not take a full backswing at the net; use finger squeeze for sharp downward punch.",
        ],
        routine: {
          sets: "5 rounds",
          reps: "20 rapid shuttle feeds",
          duration: "12 mins",
          setup:
            "Partner feeds flat shuttles from rear court; front player intercepts on the volley.",
        },
        proTip:
          "In doubles, 70% of points are won or lost in the first 3 strokes (Serve, Return, Third Shot). Master the push.",
      },
    },
  ],
  padel: [
    {
      id: "m-padel-init",
      sender: "COACH",
      sport: "padel",
      text: "Welcome to the 20x10 cage. Padel is a game of angles, patience, and net control. Power loses to positioning. Ask me about bandeja mechanics, reading double-glass rebounds, or lob management under pressure.",
      timestamp: "STATIC DRILL EXAMPLE",
      drillPlan: {
        title: "NET DOMINANCE // THE DEFENSIVE BANDEJA",
        objective:
          "Handle deep defensive lobs without giving up your net position to the opposition.",
        cues: [
          "EARLY SHOULDER TURN: Turn sideways immediately upon lob contact; take racket back at head height.",
          "CONTACT AT 2 O'CLOCK: Strike the ball slightly out in front with an open face to impart heavy backspin.",
          "REBOUND CONTROL: Direct the ball deep into the side glass corner so it dies low off the wall.",
        ],
        routine: {
          sets: "4 series",
          reps: "12 overhead feeds",
          duration: "15 mins",
          setup:
            "Start at net position; backpedal diagonally on partner lob feed; recover immediately forward.",
        },
        proTip:
          "Never smash a deep lob from behind the service line. A clean bandeja maintains net dominance with zero risk.",
      },
    },
  ],
  football: [
    {
      id: "m-football-init",
      sender: "COACH",
      sport: "football",
      text: "Good evening. For 7v7 turf matches, tactical discipline, high-tempo pressing, and rapid transitions dictate the scoreline. I can break down midfield shape, first touch under pressure, or goalkeeping distribution.",
      timestamp: "STATIC DRILL EXAMPLE",
      drillPlan: {
        title: "TURF TRANSITION // HALF-TURN RECEIVING",
        objective:
          "Break defensive lines by receiving ground passes on the front foot to attack space immediately.",
        cues: [
          "SCAN OVER SHOULDER: Check the blind spot 1 second before the ball leaves teammate boot.",
          "OPEN HIPS 45 DEGREES: Do not face directly backwards; open your body towards the offensive goal.",
          "CUSHION WITH BACK FOOT: Take the first touch with the far-side instep into open running space.",
        ],
        routine: {
          sets: "3 sets",
          reps: "15 pass-and-turn reps",
          duration: "12 mins",
          setup:
            "2 passing cones 15 yards apart with a shadow defender dummy in the center.",
        },
        proTip:
          "On synthetic grass, wet turf speeds up the ball roll by 20%. Soften your ankle joint upon initial touch.",
      },
    },
  ],
};

export default function AICoachScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, playerProfile } = useAuthStore();

  const userId = currentUser?.id;
  const preferredSport = playerProfile?.preferredSports?.[0];
  const fallbackSport: CoachSport = preferredSport && ["cricket", "badminton", "padel", "football"].includes(preferredSport) ? preferredSport : "cricket";
  const selectedSport = useStore(assistantHistory.store, state => userId ? state.sports[userId] || fallbackSport : fallbackSport);
  const history = useAssistantThread(userId, "coach", selectedSport);
  const [activeCategory, setActiveCategory] = useState<DrillCategory>("ALL");
  const inputText = history.draft;
  const setInputText = (text: string) => { if (userId) assistantHistory.setDraft(userId, "coach", selectedSport, text); };
  const isTyping = history.sending;
  const isHistoryBusy = history.loading || history.clearing || !history.conversationId;
  const errorBanner = history.error || (history.failedTurn ? "Your previous request did not finish. You can retry it." : null);
  const failedPrompt = history.failedTurn?.text;
  const currentSportMessages: CoachMessage[] = [
    ...INITIAL_COACH_MESSAGES[selectedSport],
    ...history.messages.filter(message => !message.details.error).map(message => ({
      id: message.id, sender: message.role === "user" ? "PLAYER" as const : "COACH" as const,
      sport: selectedSport, text: message.text,
      timestamp: new Date(message.createdAt).toLocaleString([], {month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"}),
    })),
  ];
  useEffect(() => { if (userId) void assistantHistory.loadSport(userId, fallbackSport); }, [userId, fallbackSport]);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [history.messages, selectedSport, isTyping, errorBanner]);


  const filteredPrompts = SUGGESTED_PROMPTS.filter((p) => {
    if (p.sport !== selectedSport) return false;
    if (activeCategory === "ALL") return true;
    return p.category === activeCategory;
  });

  const handleSelectSport = (sport: CoachSport) => {
    if (userId) assistantHistory.setSport(userId, sport);
    setActiveCategory("ALL");
  };
  const handleSendPrompt = (promptText: string) => {
    if (userId) void assistantHistory.send(userId, "coach", selectedSport, promptText);
  };
  const handleRetry = () => {
    if (userId && history.failedTurn) void assistantHistory.send(userId, "coach", selectedSport, history.failedTurn.text, history.failedTurn.clientMessageId);
  };
  const handleResetSession = () => {
    if (userId) void assistantHistory.reset(userId, "coach", selectedSport);
  };

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
      <AmbientGlowOverlay top={-40} left={-30} size={280} opacity={0.14} />

      {/* TOP SECTION: AI COACH IDENTITY & VOICE TRIGGER */}
      <View className="px-5 pt-3 pb-3 border-b border-white/[0.08] flex-col lg:flex-row items-start lg:items-center justify-between gap-3 z-20">
        <View>
          <View className="flex-row items-center">
            <Text
              style={{ color: "#E85D26" }}
              className="text-[#E85D26] text-[10px] font-black uppercase tracking-widest mr-1.5"
            >
              AI PERFORMANCE
            </Text>
            <View className="w-1.5 h-1.5 rounded-full bg-[#E85D26]" />
          </View>
          <Text
            style={{ color: "#FFFFFF" }}
            className="text-white text-xl font-black uppercase tracking-tight"
          >
            Train Smarter
          </Text>
        </View>

        <View className="flex-row flex-wrap items-center gap-2">
          {/* Sports Concierge Entry Point */}
          <Pressable
            onPress={() => router.push("/concierge")}
            accessibilityRole="button"
            accessibilityLabel="Open Your Assistant"
            className="min-h-[44px] px-3.5 py-2 rounded-full bg-[#E85D26]/15 border border-[#E85D26]/40 flex-row items-center active:bg-[#E85D26]/30 mr-2 shadow-sm"
          >
            <Ionicons name="sparkles" size={14} color="#E85D26" />
            <Text
              style={{ color: "#E85D26" }}
              className="text-[#E85D26] text-xs font-bold uppercase tracking-wider ml-1.5"
            >
              Assistant
            </Text>
          </Pressable>

          {/* Quick Trigger to Voice Mode (Phone 3 Benchmark) */}
          <Pressable
            onPress={() => router.push("/coach/voice")}
            accessibilityRole="button"
            accessibilityLabel="Switch to Voice Coach"
            className="min-h-[44px] px-3.5 py-2 rounded-full bg-[#141518]/25 border border-[#E85D26]/40 flex-row items-center active:bg-[#1B1D22] mr-2 shadow-sm"
          >
            <Ionicons name="mic" size={15} color="#E85D26" />
            <Text
              style={{ color: "#FFFFFF" }}
              className="text-white text-xs font-bold uppercase tracking-wider ml-1.5"
            >
              Voice
            </Text>
          </Pressable>

          {/* Reset Session Button (44x44px touch target) */}
          <Pressable
            onPress={handleResetSession}
            disabled={isTyping || isHistoryBusy}
            accessibilityRole="button"
            accessibilityLabel="Reset Coaching Session"
            className="w-11 h-11 rounded-full bg-[#141518]/25 border border-white/[0.08] items-center justify-center active:bg-[#1B1D22]"
          >
            <Ionicons name="refresh-outline" size={18} color="#A0A5AD" />
          </Pressable>
        </View>
      </View>

      {/* Safety Protocol Banner */}
      <View className="px-5 py-2 bg-[#101214] border-b border-white/[0.06] flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <Ionicons name="shield-checkmark" size={13} color="#E85D26" />
          <Text
            style={{ color: "#A0A5AD" }}
            className="text-[#A0A5AD] text-[10px] font-semibold tracking-wider ml-1.5 uppercase"
          >
            Technique & Tactics • No Clinical Advice
          </Text>
        </View>
        <ArenaBadge
          label={
            playerProfile?.skillLevel
              ? playerProfile.skillLevel.toUpperCase()
              : "TIER 2"
          }
          variant="accent"
          size="sm"
        />
      </View>

      {/* Sport Discipline Selector Bar */}
      <View className="px-5 py-3 bg-[#0C0D0E] border-b border-white/[0.06]">
        <View className="flex-row items-center justify-between mb-2">
          <Text
            style={{ color: "#5C616A" }}
            className="text-[#5C616A] text-[11px] font-bold uppercase tracking-wider"
          >
            Active Discipline
          </Text>
          <Text
            style={{ color: "#A0A5AD" }}
            className="text-[#A0A5AD] text-xs font-medium"
          >
            {SPORT_CONFIG[selectedSport].courtType}
          </Text>
        </View>

        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {(["cricket", "badminton", "padel", "football"] as CoachSport[]).map(
            (sport) => {
              const isSelected = selectedSport === sport;
              const config = SPORT_CONFIG[sport];
              return (
                <Pressable
                  key={sport}
                  onPress={() => handleSelectSport(sport)}
                  style={{ minWidth: 118 }}
                  className={`flex-1 py-2.5 px-2 rounded-2xl border flex-row items-center justify-center ${
                    isSelected
                      ? "bg-[#1B1D22] border-2 border-[#E85D26] shadow-sm shadow-[#E85D26]/20"
                      : "bg-[#141518]/25 border border-white/[0.08]"
                  }`}
                >
                  <MaterialCommunityIcons
                    name={config.icon}
                    size={15}
                    color={isSelected ? "#E85D26" : "#A0A5AD"}
                  />
                  <Text
                    style={{
                      color: isSelected ? "#FFFFFF" : "#A0A5AD",
                    }}
                    className={`text-[11px] ml-1.5 font-bold uppercase tracking-tight ${
                      isSelected
                        ? "text-white font-extrabold"
                        : "text-[#A0A5AD]"
                    }`}
                    numberOfLines={1}
                  >
                    {config.label}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>
      </View>

      {/* Category Pills Strip */}
      <View className="px-5 py-2.5 bg-[#0C0D0E] border-b border-white/[0.06]">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 10 }}
          className="flex-row"
        >
          {(
            ["ALL", "TECHNIQUE", "TACTICS", "DRILLS", "PREP"] as DrillCategory[]
          ).map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`mr-2 px-3.5 py-1.5 rounded-full border ${
                  isActive
                    ? "bg-[#E85D26] border-[#E85D26]"
                    : "bg-[#141518]/25 border border-white/[0.08]"
                }`}
              >
                <Text
                  style={{ color: isActive ? "#FFFFFF" : "#A0A5AD" }}
                  className={`text-[10px] font-bold tracking-wider uppercase ${
                    isActive ? "text-white font-extrabold" : "text-[#A0A5AD]"
                  }`}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Conversation Canvas with Keyboard Support */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        className="flex-1"
      >
        <ThemedScroll
          kind="profile"
          ref={scrollViewRef}
          contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
          className="flex-1"
          keyboardShouldPersistTaps="handled"
        >
          {/* Recommended Tactical Drills Carousel */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text
                style={{ color: "#5C616A" }}
                className="text-[#5C616A] text-xs font-bold tracking-wider uppercase"
              >
                Recommended Drills
              </Text>
              <Text
                style={{ color: "#E85D26" }}
                className="text-[#E85D26] text-[11px] font-semibold"
              >
                Tap to load breakdown
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 8 }}
              className="flex-row"
            >
              {filteredPrompts.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleSendPrompt(item.prompt)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ask drill: ${item.title}`}
                  className="mr-3 w-64 p-3.5 rounded-2xl bg-[#141518]/25 border border-white/[0.08] active:border-[#E85D26] shadow-sm"
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <ArenaBadge
                      label={item.badge}
                      variant="neutral"
                      size="sm"
                    />
                    <MaterialCommunityIcons
                      name="arrow-top-right"
                      size={15}
                      color="#E85D26"
                    />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={{ color: "#FFFFFF" }}
                    className="text-white text-xs font-bold leading-tight"
                  >
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ color: "#A0A5AD" }}
                    className="text-[#A0A5AD] text-[11px] mt-1 font-normal"
                  >
                    {item.prompt}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {history.loading && <Text className="text-[#A0A5AD] text-xs mb-3">Syncing your coaching history...</Text>}
          {history.nextBefore && (
            <Pressable accessibilityRole="button" accessibilityLabel="Load earlier coaching messages" disabled={history.loading} onPress={() => { if (userId) void assistantHistory.load(userId, "coach", selectedSport, true); }} className="min-h-[44px] items-center justify-center mb-3">
              <Text className="text-[#E85D26] text-xs font-bold">Load earlier messages</Text>
            </Pressable>
          )}
          {/* Conversation Stream */}
          {currentSportMessages.map((msg) => {
            const isCoach = msg.sender === "COACH";

            return (
              <View
                key={msg.id}
                className={`mb-4 ${isCoach ? "items-start" : "items-end"}`}
              >
                {/* Sender Attribution */}
                <View className="flex-row items-center mb-1.5 px-1">
                  {isCoach ? (
                    <>
                      <View className="w-5 h-5 rounded-full bg-[#E85D26] items-center justify-center mr-1.5">
                        <Ionicons name="fitness" size={11} color="#FFFFFF" />
                      </View>
                      <Text
                        style={{ color: "#E85D26" }}
                        className="text-[#E85D26] text-[11px] font-bold uppercase tracking-wider"
                      >
                        Maidaan Coach
                      </Text>
                      <Text
                        style={{ color: "#5C616A" }}
                        className="text-[#5C616A] text-[10px] ml-2"
                      >
                        {msg.timestamp}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={{ color: "#5C616A" }}
                        className="text-[#5C616A] text-[10px] mr-2"
                      >
                        {msg.timestamp}
                      </Text>
                      <Text
                        style={{ color: "#FFFFFF" }}
                        className="text-white text-[11px] font-bold uppercase tracking-wider"
                      >
                        {currentUser?.name || "Athlete"}
                      </Text>
                    </>
                  )}
                </View>

                {/* Message Body Bubble */}
                <View
                  className={`max-w-[92%] rounded-2xl p-4 border ${
                    isCoach
                      ? "bg-[#141518]/25 border-white/[0.08] shadow-sm"
                      : "bg-[#1B1D22] border-[#E85D26]/30"
                  }`}
                >
                  <Text
                    style={{ color: "#FFFFFF" }}
                    className={`text-sm leading-relaxed ${
                      isCoach ? "text-white" : "text-white font-medium"
                    }`}
                  >
                    {msg.text}
                  </Text>

                  {/* Structured Tactical Drill Breakdown Card */}
                  {msg.drillPlan && (
                    <View className="mt-4 pt-3.5 border-t border-white/[0.08]">
                      {/* Drill Header */}
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-1 mr-2">
                          <Text
                            style={{ color: "#E85D26" }}
                            className="text-[#E85D26] text-xs font-bold uppercase tracking-wider"
                          >
                            {msg.drillPlan.title}
                          </Text>
                          <Text
                            style={{ color: "#FFFFFF" }}
                            className="text-white text-xs font-semibold mt-0.5"
                          >
                            {msg.drillPlan.objective}
                          </Text>
                        </View>
                        <ArenaBadge
                          label="Tactical Plan"
                          variant="accent"
                          size="sm"
                        />
                      </View>

                      {/* Technical Cues */}
                      <View className="my-2.5 p-3 rounded-xl bg-[#101214] border border-white/[0.06]">
                        <Text
                          style={{ color: "#A0A5AD" }}
                          className="text-[#A0A5AD] text-[10px] font-bold uppercase tracking-wider mb-1.5"
                        >
                          Key Mechanical Cues
                        </Text>
                        {msg.drillPlan.cues.map((cue, idx) => (
                          <View
                            key={idx}
                            className="flex-row items-start mb-1.5 last:mb-0"
                          >
                            <Text
                              style={{ color: "#E85D26" }}
                              className="text-[#E85D26] font-bold text-xs mr-1.5"
                            >
                              •
                            </Text>
                            <Text
                              style={{ color: "#A0A5AD" }}
                              className="text-[#A0A5AD] text-xs leading-relaxed flex-1 font-normal"
                            >
                              {cue}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Training Routine Specifications */}
                      <View className="p-3 rounded-xl bg-[#141518]/25 border border-white/[0.06] mb-2.5">
                        <View className="flex-row items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
                          <View>
                            <Text
                              style={{ color: "#5C616A" }}
                              className="text-[#5C616A] text-[10px] font-semibold"
                            >
                              Sets & Volume
                            </Text>
                            <Text
                              style={{ color: "#FFFFFF" }}
                              className="text-white text-xs font-bold"
                            >
                              {msg.drillPlan.routine.sets} •{" "}
                              {msg.drillPlan.routine.reps}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text
                              style={{ color: "#5C616A" }}
                              className="text-[#5C616A] text-[10px] font-semibold"
                            >
                              Target Duration
                            </Text>
                            <Text
                              style={{ color: "#E85D26" }}
                              className="text-[#E85D26] text-xs font-bold"
                            >
                              {msg.drillPlan.routine.duration}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={{ color: "#A0A5AD" }}
                          className="text-[#A0A5AD] text-[11px] leading-snug"
                        >
                          <Text
                            style={{ color: "#FFFFFF" }}
                            className="font-bold text-white"
                          >
                            Setup:{" "}
                          </Text>
                          {msg.drillPlan.routine.setup}
                        </Text>
                      </View>

                      {/* Pro Tip */}
                      <View className="p-3 rounded-xl bg-[#E85D26]/10 border-l-4 border-[#E85D26]">
                        <View className="flex-row items-center mb-1">
                          <Ionicons
                            name="bulb-outline"
                            size={14}
                            color="#E85D26"
                          />
                          <Text
                            style={{ color: "#E85D26" }}
                            className="text-[#E85D26] text-[10px] font-bold ml-1 uppercase"
                          >
                            Pro Tip
                          </Text>
                        </View>
                        <Text
                          style={{ color: "#FFFFFF" }}
                          className="text-white text-xs font-medium leading-relaxed"
                        >
                          {msg.drillPlan.proTip}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <View className="mb-4 items-start">
              <View className="px-4 py-3 rounded-2xl bg-[#141518]/25 border border-white/[0.08] flex-row items-center shadow-sm">
                <View className="w-2 h-2 rounded-full bg-[#E85D26] mr-1.5" />
                <View className="w-2 h-2 rounded-full bg-[#E85D26] mr-1.5" />
                <View className="w-2 h-2 rounded-full bg-[#E85D26] mr-2" />
                <Text
                  style={{ color: "#A0A5AD" }}
                  className="text-[#A0A5AD] text-xs font-semibold uppercase tracking-wider"
                >
                  Coach is analyzing...
                </Text>
              </View>
            </View>
          )}

          {/* Error Banner with Retry */}
          {errorBanner && (
            <View className="mb-4 p-3.5 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#EF4444"
                />
                <Text
                  style={{ color: "#EF4444" }}
                  className="text-[#EF4444] text-xs font-medium ml-2 flex-1"
                >
                  {errorBanner}
                </Text>
              </View>
              {failedPrompt ? (
                <Pressable
                  onPress={handleRetry}
                  disabled={isTyping || isHistoryBusy}
                  className="px-3 py-1.5 rounded-xl bg-[#EF4444] active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Retry question"
                >
                  <Text
                    style={{ color: "#FFFFFF" }}
                    className="text-white text-xs font-bold uppercase tracking-wider"
                  >
                    Retry
                  </Text>
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel="Retry Coach history sync" disabled={history.loading} onPress={() => { if (userId) void assistantHistory.load(userId, 'coach', selectedSport); }} className="min-h-[44px] px-3 justify-center">
                  <Text className="text-[#E85D26] text-xs font-bold">Retry sync</Text>
                </Pressable>
              )}
            </View>
          )}
        </ThemedScroll>

        {/* PREMIUM PROMPT COMPOSER BAR */}
        <View
          className="p-3 bg-[#101214] border-t border-white/[0.08] flex-row items-center"
          style={{
            paddingBottom: Math.max(insets.bottom, 8) + 4,
          }}
        >
          <View className="flex-1 flex-row items-center bg-[#141518]/25 rounded-2xl px-3.5 border border-white/[0.08] mr-2 min-h-[46px]">
            <TextInput
              value={inputText}
              editable={!isHistoryBusy}
              onChangeText={setInputText}
              placeholder={`Ask Coach about ${SPORT_CONFIG[selectedSport].label.toLowerCase()} drills, tactics...`}
              placeholderTextColor="#5C616A"
              style={{ color: "#FFFFFF" }}
              className="flex-1 py-3 text-white text-sm font-medium"
              onSubmitEditing={() => handleSendPrompt(inputText)}
              returnKeyType="send"
            />
            {inputText.length > 0 && (
              <Pressable
                onPress={() => setInputText("")}
                accessibilityRole="button"
                accessibilityLabel="Clear input"
                className="p-1.5"
              >
                <Ionicons name="close-circle" size={16} color="#A0A5AD" />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => handleSendPrompt(inputText)}
            disabled={!inputText.trim() || isTyping || isHistoryBusy}
            className={`w-11 h-11 rounded-2xl items-center justify-center ${
              inputText.trim() && !isTyping && !isHistoryBusy
                ? "bg-[#E85D26] active:bg-[#FF723A] shadow-md shadow-[#E85D26]/30"
                : "bg-[#1B1D22]"
            }`}
            accessibilityRole="button"
            accessibilityLabel="Send Question"
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={inputText.trim() && !isTyping && !isHistoryBusy ? "#FFFFFF" : "#5C616A"}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}
