import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { useAuthStore } from '../../store/useAuthStore';
import { coachService } from '../../services/coachService';
import { CoachSport, CoachConversationMessage } from '../../types';

type DrillCategory = 'ALL' | 'TECHNIQUE' | 'TACTICS' | 'DRILLS' | 'PREP';

interface CoachMessage {
  id: string;
  sender: 'COACH' | 'PLAYER';
  sport: CoachSport;
  text: string;
  timestamp: string;
  drillPlan?: {
    title: string;
    objective: string;
    cues: string[];
    routine: {
      sets: string;
      reps: string;
      duration: string;
      setup: string;
    };
    proTip: string;
  };
  disclaimer?: string;
}

interface SportPromptSuggestion {
  id: string;
  sport: CoachSport;
  category: 'TECHNIQUE' | 'TACTICS' | 'DRILLS' | 'PREP';
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
    label: 'CRICKET',
    icon: 'cricket',
    courtType: 'Tape-Ball & Nets',
    circuitFocus: 'Death Overs & Powerplay Execution',
    color: '#875646',
  },
  badminton: {
    label: 'BADMINTON',
    icon: 'badminton',
    courtType: 'Wooden & Synthetic Courts',
    circuitFocus: 'Doubles Rotations & Net Kills',
    color: '#525C4B',
  },
  padel: {
    label: 'PADEL',
    icon: 'tennis',
    courtType: 'Enclosed Glass & Mesh',
    circuitFocus: 'Bandeja Depth & Rebound Reads',
    color: '#6E5B4B',
  },
  football: {
    label: 'FOOTBALL',
    icon: 'soccer',
    courtType: '7v7 Floodlit Turf',
    circuitFocus: 'Press Resistance & Half-Turn Passes',
    color: '#3D4438',
  },
};

const SUGGESTED_PROMPTS: SportPromptSuggestion[] = [
  // Cricket
  {
    id: 'cricket-01',
    sport: 'cricket',
    category: 'TECHNIQUE',
    title: 'Tape-Ball Yorker Drill',
    prompt: 'How do I nail toe-crushing yorkers in death overs with a taped tennis ball?',
    badge: 'BOWLING FORM',
  },
  {
    id: 'cricket-02',
    sport: 'cricket',
    category: 'TACTICS',
    title: 'Death Overs Field Setup',
    prompt: 'What field placement protects the leg-side boundary in the last 2 overs?',
    badge: 'TACTICAL SHAPE',
  },
  {
    id: 'cricket-03',
    sport: 'cricket',
    category: 'TECHNIQUE',
    title: 'Playing In-Swinging Pace',
    prompt: 'How do I prevent getting trapped LBW or bowled by late swing under lights?',
    badge: 'BATTING CUES',
  },
  {
    id: 'cricket-04',
    sport: 'cricket',
    category: 'DRILLS',
    title: 'Powerplay Lofted Drive Drill',
    prompt: 'Give me a 15-minute netting drill to clear the 30-yard circle safely.',
    badge: 'NET ROUTINE',
  },

  // Badminton
  {
    id: 'badminton-01',
    sport: 'badminton',
    category: 'TECHNIQUE',
    title: 'Rear-Court Jump Smash',
    prompt: 'How can I increase the steepness and speed of my rear-court jump smash?',
    badge: 'STEEP ANGLE',
  },
  {
    id: 'badminton-02',
    sport: 'badminton',
    category: 'TACTICS',
    title: 'Doubles Net Pinch Rotation',
    prompt: 'When should the front player pinch the T-line versus sliding to defend wide?',
    badge: 'DOUBLES SYNERGY',
  },
  {
    id: 'badminton-03',
    sport: 'badminton',
    category: 'DRILLS',
    title: 'Split-Step Reaction Drill',
    prompt: 'How do I time my split-step so I am not caught flat-footed on fast lifts?',
    badge: 'FOOTWORK AGILITY',
  },
  {
    id: 'badminton-04',
    sport: 'badminton',
    category: 'PREP',
    title: 'Forehand Net Drop Spin',
    prompt: 'What wrist action produces maximum tumbling spin on tight net drops?',
    badge: 'TOUCH & FEEL',
  },

  // Padel
  {
    id: 'padel-01',
    sport: 'padel',
    category: 'TECHNIQUE',
    title: 'Bandeja Depth & Control',
    prompt: 'What are the exact mechanical cues to hit a deep bandeja without giving up the net?',
    badge: 'OVERHEAD SHAPE',
  },
  {
    id: 'padel-02',
    sport: 'padel',
    category: 'TACTICS',
    title: 'Double-Glass Defense Reads',
    prompt: 'How do I read whether the ball will rebound off side glass first or back glass first?',
    badge: 'WALL POSITIONING',
  },
  {
    id: 'padel-03',
    sport: 'padel',
    category: 'TECHNIQUE',
    title: 'Víbora Aggressive Slice',
    prompt: 'How does the racket angle differ between a neutral bandeja and a venomous víbora?',
    badge: 'ATTACKING OVERHEAD',
  },
  {
    id: 'padel-04',
    sport: 'padel',
    category: 'DRILLS',
    title: 'Chiquita Transition Routine',
    prompt: 'What drill helps me drop a soft chiquita to opponent feet and sprint to the net?',
    badge: 'NET APPROACH',
  },

  // Football
  {
    id: 'football-01',
    sport: 'football',
    category: 'TACTICS',
    title: '7v7 Midfield Counter-Press',
    prompt: 'How should our central midfield trio trigger an immediate trap on turf turnovers?',
    badge: 'TURF PRESSING',
  },
  {
    id: 'football-02',
    sport: 'football',
    category: 'TECHNIQUE',
    title: 'First-Touch On The Half-Turn',
    prompt: 'How do I open my body shape when receiving back-to-goal under tight defender marking?',
    badge: 'FIRST TOUCH',
  },
  {
    id: 'football-03',
    sport: 'football',
    category: 'DRILLS',
    title: 'Low Driven Instep Finishing',
    prompt: 'What technique ensures crisp, grounded strikes across the keeper on small turf goals?',
    badge: 'CLINICAL FINISH',
  },
  {
    id: 'football-04',
    sport: 'football',
    category: 'PREP',
    title: 'Pre-Match 7v7 Activation',
    prompt: 'Give me a 10-minute dynamic warm-up checklist before an 8:30 PM floodlit match.',
    badge: 'MATCH READINESS',
  },
];

const INITIAL_COACH_MESSAGES: Record<CoachSport, CoachMessage[]> = {
  cricket: [
    {
      id: 'm-cricket-init',
      sender: 'COACH',
      sport: 'cricket',
      text: 'Salaam Athlete. I am your Maidaan AI Tactical Coach. Whether you are prepping for tape-ball death overs under Gulberg floodlights or fine-tuning turf netting sessions, I provide structured mechanical breakdowns, field placements, and pressure routines.',
      timestamp: 'TACTICAL LAB · ONLINE',
      drillPlan: {
        title: 'TAPE-BALL FOUNDATION // THE BLOCKHOLE SPELL',
        objective: 'Zero in on the 6-inch corridor at the batsman toes to shut down late-innings boundaries.',
        cues: [
          'LOCK WRIST: Taped tennis balls whip with air pressure; firm wrist prevents floating full tosses.',
          'COLLAPSE FRONT KNEE SLIGHTLY: Lower your release height by 2 inches to ensure skidding trajectory.',
          'AIM AT BASE OF STUMPS: Never look at the batsman eyes during release; focus on the crease line.',
        ],
        routine: {
          sets: '4 spells',
          reps: '6 deliveries per spell',
          duration: '15 mins',
          setup: 'Place a shoe or chalk target 6 inches inside the batting crease.',
        },
        proTip: 'In Lahore floodlit games, moisture on turf makes the tape skid faster. Aim 3 inches fuller than usual.',
      },
    },
  ],
  badminton: [
    {
      id: 'm-badminton-init',
      sender: 'COACH',
      sport: 'badminton',
      text: 'Welcome to the court. I am calibrated for both doubles fast-paced flat exchanges and singles court-coverage stamina. Select a drill below or ask about jump smashes, net spinning, or split-step footwork timing.',
      timestamp: 'TACTICAL LAB · ONLINE',
      drillPlan: {
        title: 'DOUBLES AGILITY // THE T-LINE PINCH',
        objective: 'Intercept loose midcourt returns before they cross the service line.',
        cues: [
          'RACKET NOSE HIGH: Keep racket head at eyebrow level; never drop hands below waist.',
          'SPLIT-STEP TIMING: Bounce lightly onto the balls of your feet the exact millisecond the opponent racket strikes the shuttle.',
          'SHORT COMPACT TAP: Do not take a full backswing at the net; use finger squeeze for sharp downward punch.',
        ],
        routine: {
          sets: '5 rounds',
          reps: '20 rapid shuttle feeds',
          duration: '12 mins',
          setup: 'Partner feeds flat shuttles from rear court; front player intercepts on the volley.',
        },
        proTip: 'In doubles, 70% of points are won or lost in the first 3 strokes (Serve, Return, Third Shot). Master the push.',
      },
    },
  ],
  padel: [
    {
      id: 'm-padel-init',
      sender: 'COACH',
      sport: 'padel',
      text: 'Welcome to the 20x10 cage. Padel is a game of angles, patience, and net control. Power loses to positioning. Ask me about bandeja mechanics, reading double-glass rebounds, or lob management under pressure.',
      timestamp: 'TACTICAL LAB · ONLINE',
      drillPlan: {
        title: 'NET DOMINANCE // THE DEFENSIVE BANDEJA',
        objective: 'Handle deep defensive lobs without giving up your net position to the opposition.',
        cues: [
          'EARLY SHOULDER TURN: Turn sideways immediately upon lob contact; take racket back at head height.',
          'CONTACT AT 2 O\'CLOCK: Strike the ball slightly out in front with an open face to impart heavy backspin.',
          'REBOUND CONTROL: Direct the ball deep into the side glass corner so it dies low off the wall.',
        ],
        routine: {
          sets: '4 series',
          reps: '12 overhead feeds',
          duration: '15 mins',
          setup: 'Start at net position; backpedal diagonally on partner lob feed; recover immediately forward.',
        },
        proTip: 'Never smash a deep lob from behind the service line. A clean bandeja maintains net dominance with zero risk.',
      },
    },
  ],
  football: [
    {
      id: 'm-football-init',
      sender: 'COACH',
      sport: 'football',
      text: 'Good evening. For 7v7 turf matches, tactical discipline, high-tempo pressing, and rapid transitions dictate the scoreline. I can break down midfield shape, first touch under pressure, or goalkeeping distribution.',
      timestamp: 'TACTICAL LAB · ONLINE',
      drillPlan: {
        title: 'TURF TRANSITION // HALF-TURN RECEIVING',
        objective: 'Break defensive lines by receiving ground passes on the front foot to attack space immediately.',
        cues: [
          'SCAN OVER SHOULDER: Check the blind spot 1 second before the ball leaves teammate boot.',
          'OPEN HIPS 45 DEGREES: Do not face directly backwards; open your body towards the offensive goal.',
          'CUSHION WITH BACK FOOT: Take the first touch with the far-side instep into open running space.',
        ],
        routine: {
          sets: '3 sets',
          reps: '15 pass-and-turn reps',
          duration: '12 mins',
          setup: '2 passing cones 15 yards apart with a shadow defender dummy in the center.',
        },
        proTip: 'On synthetic grass, wet turf speeds up the ball roll by 20%. Soften your ankle joint upon initial touch.',
      },
    },
  ],
};

export default function AICoachScreen() {
  const { currentUser, playerProfile } = useAuthStore();

  // Personalize initial sport based strictly on playerProfile when available
  const [selectedSport, setSelectedSport] = useState<CoachSport>(() => {
    if (playerProfile?.preferredSports && playerProfile.preferredSports.length > 0) {
      const pref = playerProfile.preferredSports[0] as CoachSport;
      if (['cricket', 'badminton', 'padel', 'football'].includes(pref)) {
        return pref;
      }
    }
    return 'cricket';
  });

  const [activeCategory, setActiveCategory] = useState<DrillCategory>('ALL');
  const [messages, setMessages] = useState<Record<CoachSport, CoachMessage[]>>(
    INITIAL_COACH_MESSAGES
  );
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [failedPrompt, setFailedPrompt] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Auto scroll on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, selectedSport, isTyping, errorBanner]);

  const currentSportMessages = messages[selectedSport] || [];

  const filteredPrompts = SUGGESTED_PROMPTS.filter((p) => {
    if (p.sport !== selectedSport) return false;
    if (activeCategory === 'ALL') return true;
    return p.category === activeCategory;
  });

  const buildHistory = (msgs: CoachMessage[]): CoachConversationMessage[] => {
    return msgs.slice(-10).map((m) => ({
      role: m.sender === 'PLAYER' ? ('user' as const) : ('assistant' as const),
      content: m.text.slice(0, 1500),
    }));
  };

  const handleSelectSport = (sport: CoachSport) => {
    setSelectedSport(sport);
    setActiveCategory('ALL');
    setErrorBanner(null);
    setFailedPrompt(null);
  };

  const handleSendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isTyping) return;

    if (trimmed.length > 1500) {
      setErrorBanner('Prompt exceeds 1500 characters. Please shorten your question.');
      return;
    }

    const userMsg: CoachMessage = {
      id: `usr-${Date.now()}`,
      sender: 'PLAYER',
      sport: selectedSport,
      text: trimmed,
      timestamp: 'JUST NOW',
    };

    // Grab previous history before appending the current prompt
    const previousMsgs = messages[selectedSport] || [];
    const conversationHistory = buildHistory(previousMsgs);

    // Append player message immediately to chat stream
    setMessages((prev) => ({
      ...prev,
      [selectedSport]: [...(prev[selectedSport] || []), userMsg],
    }));

    setInputText('');
    setErrorBanner(null);
    setFailedPrompt(null);
    setIsTyping(true);

    try {
      const response = await coachService.sendCoachMessage({
        sport: selectedSport,
        message: trimmed,
        conversation: conversationHistory,
      });

      if (response.data?.message) {
        const coachMsg: CoachMessage = {
          id: `ai-${Date.now()}`,
          sender: 'COACH',
          sport: selectedSport,
          text: response.data.message,
          timestamp: 'JUST NOW',
        };
        setMessages((prev) => ({
          ...prev,
          [selectedSport]: [...(prev[selectedSport] || []), coachMsg],
        }));
        setFailedPrompt(null);
        setErrorBanner(null);
      } else {
        const errMessage = response.error || 'Tactical Coach is temporarily unavailable. Please retry.';
        setErrorBanner(errMessage);
        setFailedPrompt(trimmed);
      }
    } catch (err: any) {
      const errMessage = err?.message || 'Network error connecting to Maidaan Coach. Please retry.';
      setErrorBanner(errMessage);
      setFailedPrompt(trimmed);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = async () => {
    if (!failedPrompt || isTyping) return;

    setErrorBanner(null);
    setIsTyping(true);

    try {
      // The failed message was already appended to messages[selectedSport].
      // History should only contain messages before this failed message.
      const currentMsgs = messages[selectedSport] || [];
      const previousMsgs = currentMsgs.slice(0, -1);
      const conversationHistory = buildHistory(previousMsgs);

      const response = await coachService.sendCoachMessage({
        sport: selectedSport,
        message: failedPrompt,
        conversation: conversationHistory,
      });

      if (response.data?.message) {
        const coachMsg: CoachMessage = {
          id: `ai-${Date.now()}`,
          sender: 'COACH',
          sport: selectedSport,
          text: response.data.message,
          timestamp: 'JUST NOW',
        };
        setMessages((prev) => ({
          ...prev,
          [selectedSport]: [...(prev[selectedSport] || []), coachMsg],
        }));
        setFailedPrompt(null);
        setErrorBanner(null);
      } else {
        const errMessage = response.error || 'Tactical Coach is temporarily unavailable. Please retry.';
        setErrorBanner(errMessage);
      }
    } catch (err: any) {
      const errMessage = err?.message || 'Network error connecting to Maidaan Coach. Please retry.';
      setErrorBanner(errMessage);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetSession = () => {
    setMessages((prev) => ({
      ...prev,
      [selectedSport]: INITIAL_COACH_MESSAGES[selectedSport],
    }));
    setErrorBanner(null);
    setFailedPrompt(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
      {/* Concrete Arena Header */}
      <ArenaHeader
        title="MAIDAAN COACH"
        subtitle="TACTICAL ASSISTANT // SCREEN 13"
        locationBadge="AI SPORTS LAB"
        rightAction={
          <View className="flex-row items-center space-x-2">
            <Pressable
              onPress={() => router.push('/coach/voice')}
              className="px-2.5 py-1.5 rounded-xl bg-warm-white border border-stone flex-row items-center active:bg-stone-light"
              accessibilityRole="button"
              accessibilityLabel="Open Voice Coach"
            >
              <Ionicons name="mic-outline" size={14} color="#3D4438" />
              <Text className="text-graphite text-[10px] font-mono font-bold ml-1 uppercase">
                VOICE
              </Text>
            </Pressable>
            <Pressable
              onPress={handleResetSession}
              className="w-9 h-9 rounded-xl bg-warm-white border border-stone items-center justify-center active:bg-stone-light"
              accessibilityRole="button"
              accessibilityLabel="Reset Session"
            >
              <Ionicons name="refresh-outline" size={16} color="#242522" />
            </Pressable>
          </View>
        }
      />

      {/* Safety & Domain Boundary Banner with strictly non-fabricated profile display */}
      <View className="px-4 py-2 bg-stone/20 border-b border-stone flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <Ionicons name="shield-checkmark-outline" size={14} color="#3D4438" />
          <Text className="text-graphite text-[10px] font-mono font-bold tracking-tight ml-1.5 uppercase">
            COACHING PROTOCOL · TECHNIQUE & TACTICS ONLY · NO CLINICAL DIAGNOSIS
          </Text>
        </View>
        {playerProfile?.skillLevel ? (
          <ArenaBadge
            label={playerProfile.skillLevel.toUpperCase()}
            variant="olive"
            size="sm"
          />
        ) : currentUser?.role ? (
          <ArenaBadge
            label={currentUser.role.replace('_', ' ')}
            variant="stone"
            size="sm"
          />
        ) : (
          <ArenaBadge
            label="TACTICAL LAB"
            variant="stone"
            size="sm"
          />
        )}
      </View>

      {/* Sport Selector Bar */}
      <View className="px-4 py-3 bg-warm-white border-b border-stone">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-graphite text-xs font-mono font-bold tracking-wider uppercase">
            SELECT DISCIPLINE
          </Text>
          <Text className="text-stone-muted text-[11px] font-mono">
            {SPORT_CONFIG[selectedSport].courtType}
          </Text>
        </View>

        <View className="flex-row space-x-2">
          {(['cricket', 'badminton', 'padel', 'football'] as CoachSport[]).map((sport) => {
            const isSelected = selectedSport === sport;
            const config = SPORT_CONFIG[sport];
            return (
              <Pressable
                key={sport}
                onPress={() => handleSelectSport(sport)}
                className={`flex-1 py-2.5 px-2 rounded-xl border flex-row items-center justify-center ${
                  isSelected
                    ? 'bg-graphite border-graphite'
                    : 'bg-warm-white border-stone active:bg-stone-light'
                }`}
              >
                <MaterialCommunityIcons
                  name={config.icon}
                  size={16}
                  color={isSelected ? '#F4F1EA' : '#242522'}
                />
                <Text
                  className={`text-[11px] font-mono font-bold ml-1.5 tracking-tight ${
                    isSelected ? 'text-warm-white' : 'text-graphite'
                  }`}
                  numberOfLines={1}
                >
                  {config.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Category Pills & Tactical Matrix Header */}
      <View className="px-4 py-2 bg-warm-white border-b border-stone/60">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
          className="flex-row"
        >
          {(['ALL', 'TECHNIQUE', 'TACTICS', 'DRILLS', 'PREP'] as DrillCategory[]).map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`mr-2 px-3 py-1.5 rounded-lg border ${
                  isActive
                    ? 'bg-olive border-olive-dark'
                    : 'bg-stone/20 border-stone active:bg-stone/40'
                }`}
              >
                <Text
                  className={`text-[10px] font-mono font-bold tracking-wider uppercase ${
                    isActive ? 'text-warm-white' : 'text-graphite'
                  }`}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Conversation & Tactical Playbook Canvas */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        className="flex-1"
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          className="flex-1"
          keyboardShouldPersistTaps="handled"
        >
          {/* Quick Tactical Prompt Chips */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-stone-muted text-[11px] font-mono font-bold tracking-wider uppercase">
                RECOMMENDED PLAYBOOK DRILLS
              </Text>
              <Text className="text-olive text-[10px] font-mono font-bold">
                TAP TO LOAD BREAKDOWN
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
                  className="mr-3 w-56 p-3 rounded-xl bg-warm-white border border-stone active:border-olive shadow-sm"
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <ArenaBadge label={item.badge} variant="stone" size="sm" />
                    <MaterialCommunityIcons
                      name="arrow-top-right"
                      size={14}
                      color="#3D4438"
                    />
                  </View>
                  <Text className="text-graphite text-xs font-bold leading-tight" numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text className="text-stone-muted text-[10px] mt-1 font-mono" numberOfLines={1}>
                    {item.prompt}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Conversation Stream */}
          {currentSportMessages.map((msg) => {
            const isCoach = msg.sender === 'COACH';

            return (
              <View
                key={msg.id}
                className={`mb-4 ${isCoach ? 'items-start' : 'items-end'}`}
              >
                {/* Sender Attribution */}
                <View className="flex-row items-center mb-1 px-1">
                  {isCoach ? (
                    <>
                      <View className="w-4 h-4 rounded-full bg-olive items-center justify-center mr-1.5">
                        <Ionicons name="fitness" size={10} color="#F4F1EA" />
                      </View>
                      <Text className="text-graphite text-[10px] font-mono font-bold uppercase tracking-wider">
                        MAIDAAN TACTICAL ENGINE
                      </Text>
                      <Text className="text-stone-muted text-[9px] font-mono ml-2">
                        {msg.timestamp}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text className="text-stone-muted text-[9px] font-mono mr-2">
                        {msg.timestamp}
                      </Text>
                      <Text className="text-graphite text-[10px] font-mono font-bold uppercase tracking-wider">
                        {currentUser?.name || 'ATHLETE'}
                      </Text>
                    </>
                  )}
                </View>

                {/* Message Body */}
                <View
                  className={`max-w-[92%] rounded-2xl p-4 border ${
                    isCoach
                      ? 'bg-warm-white border-stone shadow-sm'
                      : 'bg-graphite border-surface-border-dark'
                  }`}
                >
                  <Text
                    className={`text-sm leading-relaxed ${
                      isCoach ? 'text-graphite' : 'text-warm-white font-medium'
                    }`}
                  >
                    {msg.text}
                  </Text>

                  {/* Structured Tactical Drill Breakdown Card */}
                  {msg.drillPlan && (
                    <View className="mt-4 pt-3.5 border-t border-stone/60">
                      {/* Drill Header */}
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-1 mr-2">
                          <Text className="text-olive text-[11px] font-mono font-black uppercase tracking-wider">
                            {msg.drillPlan.title}
                          </Text>
                          <Text className="text-graphite text-xs font-bold mt-0.5">
                            {msg.drillPlan.objective}
                          </Text>
                        </View>
                        <ArenaBadge label="TACTICAL PLAN" variant="olive" size="sm" />
                      </View>

                      {/* Technical Cues */}
                      <View className="my-2.5 p-3 rounded-xl bg-stone/20 border border-stone">
                        <Text className="text-graphite text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5">
                          KEY MECHANICAL CUES
                        </Text>
                        {msg.drillPlan.cues.map((cue, idx) => (
                          <View key={idx} className="flex-row items-start mb-1.5 last:mb-0">
                            <Text className="text-olive font-bold text-xs mr-1.5">•</Text>
                            <Text className="text-graphite text-xs leading-tight flex-1">
                              {cue}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Training Routine Specifications */}
                      <View className="p-3 rounded-xl bg-warm-white border border-stone mb-2.5">
                        <View className="flex-row items-center justify-between border-b border-stone/50 pb-2 mb-2">
                          <View>
                            <Text className="text-stone-muted text-[9px] font-mono font-bold">
                              SETS & VOLUME
                            </Text>
                            <Text className="text-graphite text-xs font-bold">
                              {msg.drillPlan.routine.sets} · {msg.drillPlan.routine.reps}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text className="text-stone-muted text-[9px] font-mono font-bold">
                              TARGET DURATION
                            </Text>
                            <Text className="text-olive text-xs font-bold">
                              {msg.drillPlan.routine.duration}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-graphite text-[11px] leading-snug">
                          <Text className="font-bold text-stone-muted font-mono">SETUP: </Text>
                          {msg.drillPlan.routine.setup}
                        </Text>
                      </View>

                      {/* Pro Tip / Rule of Thumb */}
                      <View className="p-3 rounded-xl bg-olive/10 border-l-4 border-olive">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="bulb-outline" size={14} color="#3D4438" />
                          <Text className="text-olive text-[10px] font-mono font-black ml-1 uppercase">
                            MATCH CIRCUIT RULE OF THUMB
                          </Text>
                        </View>
                        <Text className="text-graphite text-xs font-medium leading-relaxed">
                          {msg.drillPlan.proTip}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Safety Boundary Notice if triggered */}
                  {msg.disclaimer && (
                    <View className="mt-3 p-3 rounded-xl bg-rust/10 border border-rust/40 flex-row items-start">
                      <Ionicons name="warning-outline" size={16} color="#875646" />
                      <Text className="text-rust text-xs font-medium leading-tight ml-2 flex-1">
                        {msg.disclaimer}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <View className="mb-4 items-start">
              <View className="px-4 py-3 rounded-2xl bg-warm-white border border-stone flex-row items-center shadow-sm">
                <View className="w-2 h-2 rounded-full bg-olive animate-pulse mr-1.5" />
                <View className="w-2 h-2 rounded-full bg-olive animate-pulse mr-1.5" />
                <View className="w-2 h-2 rounded-full bg-olive animate-pulse mr-2" />
                <Text className="text-stone-muted text-xs font-mono font-bold uppercase tracking-wider">
                  COACH IS ANALYZING...
                </Text>
              </View>
            </View>
          )}

          {/* Error State Banner with Retry */}
          {errorBanner && (
            <View className="mb-4 p-3.5 rounded-2xl bg-rust/10 border border-rust/40 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <Ionicons name="alert-circle-outline" size={18} color="#875646" />
                <Text className="text-rust text-xs font-medium ml-2 flex-1">
                  {errorBanner}
                </Text>
              </View>
              {failedPrompt && (
                <Pressable
                  onPress={handleRetry}
                  disabled={isTyping}
                  className="px-3 py-1.5 rounded-xl bg-rust active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Retry sending question"
                >
                  <Text className="text-warm-white text-[11px] font-mono font-bold uppercase tracking-wider">
                    RETRY
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View className="p-3 bg-warm-white border-t border-stone flex-row items-center">
          <View className="flex-1 flex-row items-center bg-stone/20 rounded-xl px-3 border border-stone mr-2">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={`Ask Coach about ${SPORT_CONFIG[selectedSport].label.toLowerCase()} drills, tactics...`}
              placeholderTextColor="#8D9287"
              className="flex-1 py-3 text-graphite text-sm font-medium"
              onSubmitEditing={() => handleSendPrompt(inputText)}
              returnKeyType="send"
            />
            {inputText.length > 0 && (
              <Pressable
                onPress={() => setInputText('')}
                className="p-1 active:opacity-60"
              >
                <Ionicons name="close-circle" size={16} color="#8D9287" />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => handleSendPrompt(inputText)}
            disabled={!inputText.trim() || isTyping}
            className={`w-11 h-11 rounded-xl items-center justify-center ${
              inputText.trim() && !isTyping
                ? 'bg-olive active:bg-olive-dark'
                : 'bg-stone/40'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Send Question"
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={inputText.trim() && !isTyping ? '#F4F1EA' : '#8D9287'}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
