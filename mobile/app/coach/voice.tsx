import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { IMAGES } from '../../constants/images';
import { coachService } from '../../services/coachService';
import { speechRecognitionService } from '../../services/speechRecognitionService';
import { CoachSport, CoachConversationMessage } from '../../types';
import { SPORT_CONFIG } from '../../utils/coachMock';

/**
 * SCREEN 14 — AI VOICE (PHASE 7C REAL INTEGRATION)
 * Approved route: mobile/app/coach/voice.tsx
 *
 * State Machine:
 * idle -> listening -> processing -> speaking / responding | error
 *
 * Architecture:
 * User Voice -> Device Speech Recognition -> Transcript -> Coach API (Express) -> NVIDIA NIM -> Coach Response -> expo-speech (Device TTS)
 */
type VoiceSessionState = 'idle' | 'listening' | 'processing' | 'speaking' | 'responding' | 'error';

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
      id: 'cricket-v1',
      sport: 'cricket',
      title: 'Death-Overs Yorker',
      query: 'How can I bowl better yorkers at the death under floodlights?',
      category: 'BOWLING',
    },
    {
      id: 'cricket-v2',
      sport: 'cricket',
      title: 'In-Swinging Pace',
      query: 'How do I prevent getting trapped LBW by late in-swinging pace?',
      category: 'BATTING',
    },
    {
      id: 'cricket-v3',
      sport: 'cricket',
      title: 'Powerplay Circle Clears',
      query: 'What batting cues help me clear the 30-yard ring in the powerplay?',
      category: 'TACTICS',
    },
    {
      id: 'cricket-safety',
      sport: 'cricket',
      title: 'Shoulder Pain Check',
      query: 'My shoulder hurts after bowling fast spells, can I push through it?',
      category: 'SAFETY AUDIT',
      isSafetySample: true,
    },
  ],
  badminton: [
    {
      id: 'badminton-v1',
      sport: 'badminton',
      title: 'Rear-Court Footwork',
      query: 'How do I improve my rear court footwork and jump smash?',
      category: 'FOOTWORK',
    },
    {
      id: 'badminton-v2',
      sport: 'badminton',
      title: 'Doubles Net Pinch',
      query: 'When should I pinch the T-line in doubles rather than defending wide?',
      category: 'DOUBLES',
    },
    {
      id: 'badminton-v3',
      sport: 'badminton',
      title: 'Tumbling Net Drops',
      query: 'What wrist action gives the shuttle maximum tumbling spin at the net?',
      category: 'TECHNIQUE',
    },
    {
      id: 'badminton-safety',
      sport: 'badminton',
      title: 'Ankle Strain Check',
      query: 'I rolled my ankle on a rear lunging step and it is swollen, what medicine helps?',
      category: 'SAFETY AUDIT',
      isSafetySample: true,
    },
  ],
  padel: [
    {
      id: 'padel-v1',
      sport: 'padel',
      title: 'Bandeja Positioning',
      query: 'How should I position after hitting a bandeja to maintain the net?',
      category: 'OVERHEAD',
    },
    {
      id: 'padel-v2',
      sport: 'padel',
      title: 'Double-Glass Rebound',
      query: 'How do I read whether the ball rebounds off side glass first or back glass first?',
      category: 'DEFENSE',
    },
    {
      id: 'padel-v3',
      sport: 'padel',
      title: 'Chiquita Transition',
      query: 'How do I drop a soft chiquita to opponent feet and sprint to net?',
      category: 'TRANSITION',
    },
    {
      id: 'padel-safety',
      sport: 'padel',
      title: 'Elbow Tendon Pain',
      query: 'I have severe elbow pain after off-center hits, what treatment do I take?',
      category: 'SAFETY AUDIT',
      isSafetySample: true,
    },
  ],
  football: [
    {
      id: 'football-v1',
      sport: 'football',
      title: 'First-Touch Under Press',
      query: 'How can I improve my first touch under pressure on synthetic turf?',
      category: 'TOUCH',
    },
    {
      id: 'football-v2',
      sport: 'football',
      title: '7v7 Midfield Traps',
      query: 'How should our central midfield trio trigger an immediate trap on turf turnovers?',
      category: 'PRESSING',
    },
    {
      id: 'football-v3',
      sport: 'football',
      title: 'Low Driven Finishing',
      query: 'What technique ensures crisp grounded strikes across the keeper on small goals?',
      category: 'FINISHING',
    },
    {
      id: 'football-safety',
      sport: 'football',
      title: 'Hamstring Pull Check',
      query: 'I felt a sharp tear in my hamstring during a sprint, how do I cure it?',
      category: 'SAFETY AUDIT',
      isSafetySample: true,
    },
  ],
};

/**
 * Strips markdown symbols for natural speech synthesis.
 */
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/[-_]{3,}/g, '')
    .replace(/[`~]/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/[|]/g, ' ')
    .trim();
}

export default function VoiceCoachScreen() {
  const params = useLocalSearchParams<{ sport?: string }>();
  const { currentUser, playerProfile } = useAuthStore();

  // Resolve initial sport context from navigation params, player profile, or fallback
  const [selectedSport, setSelectedSport] = useState<CoachSport>(() => {
    if (params.sport && ['cricket', 'badminton', 'padel', 'football'].includes(params.sport)) {
      return params.sport as CoachSport;
    }
    if (playerProfile?.preferredSports && playerProfile.preferredSports.length > 0) {
      const pref = playerProfile.preferredSports[0] as CoachSport;
      if (['cricket', 'badminton', 'padel', 'football'].includes(pref)) {
        return pref;
      }
    }
    return 'cricket';
  });

  // Explicit session state machine
  const [sessionState, setSessionState] = useState<VoiceSessionState>('idle');
  const [activeQuery, setActiveQuery] = useState<string>(
    SPORT_CONFIG[selectedSport].defaultVoiceQuery
  );
  const [partialTranscript, setPartialTranscript] = useState<string>('');
  const [coachResponse, setCoachResponse] = useState<{ text: string; timestamp: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<CoachConversationMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState<boolean>(true);

  // Decorative audio indicator level (during listening only)
  const [meterLevel, setMeterLevel] = useState<number>(1);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up speech recognition & TTS on unmount
  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch {}
      speechRecognitionService.cancelListening();
      if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    };
  }, []);

  // Handle sport switching in idle or completed state
  const handleSelectSport = (sport: CoachSport) => {
    if (sessionState === 'listening' || sessionState === 'processing') return;
    try {
      Speech.stop();
    } catch {}
    setIsSpeaking(false);
    setSelectedSport(sport);
    setActiveQuery(SPORT_CONFIG[sport].defaultVoiceQuery);
    setCoachResponse(null);
    setErrorMessage(null);
    setPartialTranscript('');
    setConversationHistory([]); // Strict sport isolation
    setSessionState('idle');
  };

  // Start real microphone speech recognition session
  const handleStartListening = async () => {
    // 1. Interrupt active TTS before capturing audio
    try {
      await Speech.stop();
    } catch {}
    setIsSpeaking(false);
    setErrorMessage(null);

    // 2. Microphone & Speech Recognition Permission Check
    const perm = await speechRecognitionService.requestPermission();
    if (!perm.granted) {
      setSessionState('error');
      setErrorMessage(
        perm.status === 'unavailable'
          ? 'Speech recognition is not available in this runtime (Expo Development Build required for native speech recognition).'
          : 'Microphone permission was denied. Please allow microphone access to talk to Coach.'
      );
      return;
    }

    setSessionState('listening');
    setPartialTranscript('');
    setActiveQuery('');

    // Decorative listening activity animation
    setMeterLevel(1);
    if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    meterIntervalRef.current = setInterval(() => {
      setMeterLevel((prev) => ((prev % 5) + 1));
    }, 280);

    // 3. Initiate native recognition
    await speechRecognitionService.startListening({
      onStart: () => {
        setSessionState('listening');
      },
      onPartialResult: (transcript) => {
        setPartialTranscript(transcript);
        setActiveQuery(transcript);
      },
      onFinalResult: (transcript) => {
        if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
        const trimmed = transcript.trim();
        setActiveQuery(trimmed);
        setPartialTranscript('');
        if (trimmed) {
          handleSendTranscript(trimmed);
        } else {
          setSessionState('idle');
        }
      },
      onError: (err) => {
        if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
        setSessionState('error');
        setErrorMessage(err);
      },
      onEnd: () => {
        if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
        setSessionState((current) => (current === 'listening' ? 'idle' : current));
      },
    });
  };

  // Stop listening and finalize transcript
  const handleFinishListening = async () => {
    if (sessionState !== 'listening') return;
    if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    await speechRecognitionService.stopListening();

    if (partialTranscript.trim()) {
      const text = partialTranscript.trim();
      setActiveQuery(text);
      setPartialTranscript('');
      handleSendTranscript(text);
    }
  };

  // Cancel listening immediately without calling Coach
  const handleCancelListening = async () => {
    if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    await speechRecognitionService.cancelListening();
    setSessionState('idle');
    setPartialTranscript('');
  };

  // Dispatch transcript to live Maidaan Coach backend
  const handleSendTranscript = async (transcriptText: string) => {
    const trimmed = transcriptText.trim();
    if (!trimmed) {
      setSessionState('idle');
      return;
    }

    setSessionState('processing');
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
          timestamp: 'JUST NOW',
        });

        // Maintain conversation sliding window (up to 10 previous turns, clamped)
        setConversationHistory((prev) => [
          ...prev.slice(-8),
          { role: 'user', content: trimmed.slice(0, 1500) },
          { role: 'assistant', content: answer.slice(0, 1500) },
        ]);

        // Auto-speak response if enabled
        if (autoSpeakEnabled) {
          setSessionState('speaking');
          setIsSpeaking(true);
          const spokenText = cleanTextForSpeech(answer);
          Speech.speak(spokenText, {
            language: 'en-US',
            onDone: () => {
              setIsSpeaking(false);
              setSessionState('responding');
            },
            onStopped: () => {
              setIsSpeaking(false);
              setSessionState('responding');
            },
            onError: () => {
              setIsSpeaking(false);
              setSessionState('responding');
            },
          });
        } else {
          setSessionState('responding');
        }
      } else {
        setSessionState('error');
        setErrorMessage(response.error || 'AI Coach is temporarily unavailable. Please retry.');
      }
    } catch (err: any) {
      setSessionState('error');
      setErrorMessage(err?.message || 'Network error connecting to Maidaan Coach. Please retry.');
    }
  };

  // Speak response on demand
  const handleSpeakResponse = () => {
    if (!coachResponse?.text) return;
    try {
      Speech.stop();
    } catch {}
    setSessionState('speaking');
    setIsSpeaking(true);
    const spokenText = cleanTextForSpeech(coachResponse.text);
    Speech.speak(spokenText, {
      language: 'en-US',
      onDone: () => {
        setIsSpeaking(false);
        setSessionState('responding');
      },
      onStopped: () => {
        setIsSpeaking(false);
        setSessionState('responding');
      },
      onError: () => {
        setIsSpeaking(false);
        setSessionState('responding');
      },
    });
  };

  // Stop active speech playback
  const handleStopSpeaking = () => {
    try {
      Speech.stop();
    } catch {}
    setIsSpeaking(false);
    setSessionState('responding');
  };

  // Retry query with existing transcript
  const handleRetry = () => {
    if (activeQuery.trim()) {
      handleSendTranscript(activeQuery.trim());
    }
  };

  // Reset to clean idle state
  const handleResetSession = () => {
    try {
      Speech.stop();
    } catch {}
    speechRecognitionService.cancelListening();
    if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    setSessionState('idle');
    setCoachResponse(null);
    setErrorMessage(null);
    setPartialTranscript('');
    setIsSpeaking(false);
  };

  const currentSportConfig = SPORT_CONFIG[selectedSport];
  const sampleQueries = SAMPLE_VOICE_QUERIES[selectedSport] || [];

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top']}>
      {/* Concrete Arena Header */}
      <ArenaHeader
        title="VOICE COACH"
        subtitle="TRAINING DESK // VOICE SESSION"
        locationBadge="TACTICAL AUDIO DESK"
        showBack={true}
        onBack={() => router.back()}
        rightAction={
          <Pressable
            onPress={() => router.replace('/(tabs)/coach')}
            className="px-3 py-2 rounded-xl bg-warm-white border border-stone flex-row items-center active:bg-stone-light"
            accessibilityRole="button"
            accessibilityLabel="Open Text Coach"
          >
            <Ionicons name="chatbox-ellipses-outline" size={14} color="#242522" />
            <Text className="text-graphite text-[10px] font-mono font-bold uppercase ml-1">
              TEXT COACH
            </Text>
          </Pressable>
        }
      />

      {/* Safety & Protocol Banner */}
      <View className="px-4 py-2 bg-stone/20 border-b border-stone flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <Ionicons name="shield-checkmark-outline" size={13} color="#3D4438" />
          <Text className="text-graphite text-[10px] font-mono font-bold tracking-tight ml-1.5 uppercase">
            AUDIO DESK · ATHLETIC CUES ONLY · NOT MEDICAL ADVICE
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
          <ArenaBadge label="TACTICAL LAB" variant="stone" size="sm" />
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
      >
        {/* Sport Discipline Selector Bar */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-graphite text-xs font-mono font-bold tracking-wider uppercase">
              ACTIVE DISCIPLINE
            </Text>
            <Text className="text-stone-muted text-[11px] font-mono">
              {currentSportConfig.courtType}
            </Text>
          </View>

          <View className="flex-row space-x-2">
            {(['cricket', 'badminton', 'padel', 'football'] as CoachSport[]).map((sport) => {
              const isSelected = selectedSport === sport;
              const config = SPORT_CONFIG[sport];
              const isDisabled = sessionState === 'listening' || sessionState === 'processing';
              return (
                <Pressable
                  key={sport}
                  onPress={() => handleSelectSport(sport)}
                  disabled={isDisabled}
                  className={`flex-1 py-2 px-1.5 rounded-xl border flex-row items-center justify-center ${
                    isSelected
                      ? 'bg-graphite border-graphite'
                      : 'bg-warm-white border-stone active:bg-stone-light'
                  } ${isDisabled ? 'opacity-50' : 'opacity-100'}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${config.label}`}
                >
                  <MaterialCommunityIcons
                    name={config.icon}
                    size={15}
                    color={isSelected ? '#F4F1EA' : '#242522'}
                  />
                  <Text
                    className={`text-[10px] font-mono font-bold ml-1 tracking-tight ${
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

        {/* DOMINANT ELEMENT: Voice Coach Session Card */}
        <View className="w-full rounded-2xl bg-warm-white border border-stone p-5 mb-4 shadow-sm">
          {/* Header & Status Indicator */}
          <View className="flex-row items-center justify-between pb-3 border-b border-stone/60 mb-4">
            <View className="flex-row items-center">
              <View
                className={`w-2.5 h-2.5 rounded-full mr-2 ${
                  sessionState === 'listening'
                    ? 'bg-olive animate-pulse'
                    : sessionState === 'processing'
                    ? 'bg-rust animate-pulse'
                    : sessionState === 'speaking'
                    ? 'bg-olive'
                    : sessionState === 'responding'
                    ? 'bg-olive'
                    : sessionState === 'error'
                    ? 'bg-rust'
                    : 'bg-stone-muted'
                }`}
              />
              <Text className="text-graphite text-xs font-mono font-black uppercase tracking-wider">
                SESSION: {sessionState.toUpperCase()}
              </Text>
            </View>

            <ArenaBadge
              label={
                sessionState === 'idle'
                  ? 'READY'
                  : sessionState === 'listening'
                  ? 'LISTENING'
                  : sessionState === 'processing'
                  ? 'ANALYZING'
                  : sessionState === 'speaking'
                  ? 'SPEAKING ALOUD'
                  : sessionState === 'responding'
                  ? 'RESPONSE READY'
                  : 'ATTENTION'
              }
              variant={
                sessionState === 'speaking' || sessionState === 'responding'
                  ? 'olive'
                  : sessionState === 'error'
                  ? 'rust'
                  : 'stone'
              }
              size="sm"
            />
          </View>

          {/* Central Tactical Microphone Well & Session Controller */}
          <View className="items-center py-4">
            <Pressable
              onPress={
                sessionState === 'idle'
                  ? handleStartListening
                  : sessionState === 'listening'
                  ? handleFinishListening
                  : sessionState === 'speaking'
                  ? handleStopSpeaking
                  : sessionState === 'responding'
                  ? handleResetSession
                  : sessionState === 'error'
                  ? handleRetry
                  : undefined
              }
              accessibilityRole="button"
              accessibilityLabel={
                sessionState === 'idle'
                  ? 'Start Microphone Listening'
                  : sessionState === 'listening'
                  ? 'Finish Asking Question'
                  : sessionState === 'speaking'
                  ? 'Stop Voice Playback'
                  : sessionState === 'responding'
                  ? 'Start New Question'
                  : 'Retry Question'
              }
              className={`w-28 h-28 rounded-full items-center justify-center border-4 ${
                sessionState === 'listening'
                  ? 'bg-olive border-graphite shadow-md'
                  : sessionState === 'processing'
                  ? 'bg-stone/40 border-stone'
                  : sessionState === 'speaking'
                  ? 'bg-olive border-olive-dark shadow-md'
                  : sessionState === 'responding'
                  ? 'bg-warm-white border-olive'
                  : sessionState === 'error'
                  ? 'bg-rust/20 border-rust'
                  : 'bg-warm-white border-stone active:border-olive active:bg-stone-light'
              }`}
            >
              {sessionState === 'listening' ? (
                <Ionicons name="mic" size={44} color="#F4F1EA" />
              ) : sessionState === 'processing' ? (
                <MaterialCommunityIcons name="clipboard-clock-outline" size={42} color="#3D4438" />
              ) : sessionState === 'speaking' ? (
                <Ionicons name="volume-high" size={44} color="#F4F1EA" />
              ) : sessionState === 'responding' ? (
                <Ionicons name="checkmark-sharp" size={44} color="#3D4438" />
              ) : sessionState === 'error' ? (
                <Ionicons name="refresh" size={42} color="#875646" />
              ) : (
                <Ionicons name="mic-outline" size={44} color="#3D4438" />
              )}
            </Pressable>

            {/* Decorative Segmented Activity Indicator (During listening only) */}
            {sessionState === 'listening' ? (
              <View className="items-center mt-4">
                <View className="flex-row items-center space-x-1.5">
                  {[1, 2, 3, 4, 5].map((bar) => (
                    <View
                      key={bar}
                      className={`w-3.5 h-2 rounded-sm ${
                        bar <= meterLevel ? 'bg-olive' : 'bg-stone'
                      }`}
                    />
                  ))}
                </View>
                <Text className="text-stone-muted text-[9px] font-mono mt-1 uppercase tracking-wider">
                  AUDIO ACTIVITY INDICATOR
                </Text>
              </View>
            ) : null}

            {/* Primary State Title & Supporting Guidance */}
            <Text className="text-graphite text-base font-black uppercase tracking-tight mt-3 text-center">
              {sessionState === 'idle' && 'READY FOR VOICE SESSION'}
              {sessionState === 'listening' && 'LISTENING TO QUERY...'}
              {sessionState === 'processing' && 'COACH IS ANALYZING...'}
              {sessionState === 'speaking' && 'COACH IS SPEAKING...'}
              {sessionState === 'responding' && 'COACH RESPONSE READY'}
              {sessionState === 'error' && 'VOICE SESSION NOTICE'}
            </Text>

            <Text className="text-stone-muted text-xs font-mono text-center mt-1 px-4 leading-relaxed">
              {sessionState === 'idle' &&
                'Tap microphone to speak your question about technique, tactics, or drills.'}
              {sessionState === 'listening' &&
                'Speak clearly. Tap microphone when finished or tap Cancel.'}
              {sessionState === 'processing' &&
                'NVIDIA-backed Tactical Engine is generating sport-specific cues.'}
              {sessionState === 'speaking' &&
                'Reading Coach briefing aloud. Tap microphone or Stop to pause audio.'}
              {sessionState === 'responding' &&
                'Review tactical advice below or tap Read Aloud to listen again.'}
              {sessionState === 'error' &&
                (errorMessage || 'An error occurred during voice interaction. Please retry.')}
            </Text>
          </View>

          {/* Captured / Active Voice Query Box */}
          <View className="mt-2 p-3.5 rounded-xl bg-stone/20 border border-stone">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-stone-muted text-[10px] font-mono font-bold uppercase tracking-wider">
                {sessionState === 'listening' ? 'CAPTURING TRANSCRIPT' : 'QUERY TRANSCRIPT'}
              </Text>
              <Text className="text-olive text-[10px] font-mono font-bold">
                {sessionState === 'listening'
                  ? 'SPEAKING NOW'
                  : sessionState === 'idle'
                  ? 'READY'
                  : 'TRANSCRIPTION'}
              </Text>
            </View>
            <Text className="text-graphite text-xs font-bold leading-snug">
              {activeQuery ? `“${activeQuery}”` : 'Listening for your voice input...'}
            </Text>
          </View>

          {/* Error Banner with Retry */}
          {sessionState === 'error' && errorMessage && (
            <View className="mt-3 p-3.5 rounded-xl bg-rust/10 border border-rust/40 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <Ionicons name="alert-circle-outline" size={18} color="#875646" />
                <Text className="text-rust text-xs font-medium ml-2 flex-1">
                  {errorMessage}
                </Text>
              </View>
              {activeQuery.trim() ? (
                <Pressable
                  onPress={handleRetry}
                  className="px-3 py-1.5 rounded-xl bg-rust active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Retry Query"
                >
                  <Text className="text-warm-white text-[11px] font-mono font-bold uppercase tracking-wider">
                    RETRY
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Primary Action Controls */}
          <View className="mt-4">
            {sessionState === 'idle' && (
              <PrimaryButton
                title="START VOICE SESSION"
                onPress={handleStartListening}
              />
            )}

            {sessionState === 'listening' && (
              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <PrimaryButton
                    title="FINISH ASKING"
                    onPress={handleFinishListening}
                  />
                </View>
                <Pressable
                  onPress={handleCancelListening}
                  className="px-4 py-3.5 rounded-xl border border-stone bg-warm-white items-center justify-center active:bg-stone-light"
                  accessibilityRole="button"
                  accessibilityLabel="Cancel Listening"
                >
                  <Text className="text-graphite text-xs font-mono font-bold uppercase">
                    CANCEL
                  </Text>
                </Pressable>
              </View>
            )}

            {sessionState === 'processing' && (
              <View className="w-full py-3.5 items-center justify-center rounded-xl bg-stone/30 border border-stone">
                <Text className="text-graphite text-xs font-mono font-bold uppercase tracking-wider">
                  GENERATING TACTICAL CUES...
                </Text>
              </View>
            )}

            {sessionState === 'speaking' && (
              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <PrimaryButton
                    title="STOP SPEAKING"
                    variant="outline"
                    onPress={handleStopSpeaking}
                  />
                </View>
                <Pressable
                  onPress={handleResetSession}
                  className="px-4 py-3.5 rounded-xl border border-stone bg-warm-white items-center justify-center active:bg-stone-light"
                  accessibilityRole="button"
                  accessibilityLabel="New Question"
                >
                  <Text className="text-graphite text-xs font-mono font-bold uppercase">
                    RESET
                  </Text>
                </Pressable>
              </View>
            )}

            {(sessionState === 'responding' || (sessionState === 'error' && coachResponse)) && (
              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <PrimaryButton
                    title="NEW QUESTION"
                    onPress={handleResetSession}
                  />
                </View>
                <Pressable
                  onPress={handleSpeakResponse}
                  className="px-3.5 py-3 rounded-xl border border-olive bg-olive/10 flex-row items-center justify-center active:bg-olive/20"
                  accessibilityRole="button"
                  accessibilityLabel="Speak Response Again"
                >
                  <Ionicons name="volume-medium-outline" size={16} color="#3D4438" />
                  <Text className="text-olive text-xs font-mono font-bold uppercase ml-1">
                    READ ALOUD
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Tactical Photography Asset */}
        <View className="w-full h-24 rounded-2xl overflow-hidden mb-4 border border-stone relative">
          <Image
            source={IMAGES.arenaGround}
            className="w-full h-full object-cover"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-graphite/60 justify-center px-4">
            <Text className="text-warm-white text-xs font-mono font-bold uppercase tracking-wider">
              {currentSportConfig.label} TRAINING DESK
            </Text>
            <Text className="text-stone-light text-[11px] font-medium mt-0.5">
              {currentSportConfig.circuitFocus}
            </Text>
          </View>
        </View>

        {/* COACH RESPONSE CARD (Always visible when response is available) */}
        {coachResponse && (sessionState === 'responding' || sessionState === 'speaking' || sessionState === 'error') && (
          <View className="w-full rounded-2xl bg-warm-white border border-stone p-5 mb-4 shadow-sm">
            {/* Coach Attribution */}
            <View className="flex-row items-center justify-between pb-3 border-b border-stone/60 mb-3">
              <View className="flex-row items-center">
                <View className="w-6 h-6 rounded-lg bg-olive items-center justify-center mr-2">
                  <Ionicons name="fitness" size={13} color="#F4F1EA" />
                </View>
                <View>
                  <Text className="text-graphite text-xs font-mono font-black uppercase">
                    MAIDAAN COACH RESPONSE
                  </Text>
                  <Text className="text-stone-muted text-[10px] font-mono">
                    {currentSportConfig.label} · {coachResponse.timestamp}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center space-x-1">
                {isSpeaking ? (
                  <Pressable
                    onPress={handleStopSpeaking}
                    className="px-2 py-1 rounded-lg bg-rust/10 border border-rust/40 flex-row items-center"
                    accessibilityRole="button"
                    accessibilityLabel="Stop Speaking"
                  >
                    <Ionicons name="stop" size={10} color="#875646" />
                    <Text className="text-rust text-[9px] font-mono font-bold ml-1 uppercase">
                      STOP AUDIO
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleSpeakResponse}
                    className="px-2 py-1 rounded-lg bg-olive/10 border border-olive/40 flex-row items-center"
                    accessibilityRole="button"
                    accessibilityLabel="Speak Aloud"
                  >
                    <Ionicons name="volume-high" size={11} color="#3D4438" />
                    <Text className="text-olive text-[9px] font-mono font-bold ml-1 uppercase">
                      SPEAK
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* COACH'S READ */}
            <View className="mb-3">
              <Text className="text-stone-muted text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                COACH&apos;S BRIEFING
              </Text>
              <Text className="text-graphite text-xs font-medium leading-relaxed">
                {coachResponse.text}
              </Text>
            </View>

            {/* Audio Mode Indicator */}
            <View className="pt-2 border-t border-stone/50 flex-row items-center justify-between">
              <Text className="text-stone-muted text-[9px] font-mono">
                DEVICE TTS AUDIO · NVIDIA BACKEND VERIFIED
              </Text>
              <ArenaBadge label="LIVE AUDIO" variant="olive" size="sm" />
            </View>
          </View>
        )}

        {/* Sample Voice Query Prompts (For One-Tap Testing & Discovery) */}
        <View className="w-full">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-stone-muted text-[11px] font-mono font-bold tracking-wider uppercase">
              SELECT SAMPLE VOICE QUERY
            </Text>
            <Text className="text-olive text-[10px] font-mono font-bold">
              TAP TO TEST SESSION
            </Text>
          </View>

          {sampleQueries.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                if (sessionState === 'listening' || sessionState === 'processing') return;
                setActiveQuery(item.query);
                handleSendTranscript(item.query);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Ask sample query: ${item.title}`}
              className={`p-3.5 rounded-xl border mb-2 flex-row items-center justify-between ${
                item.isSafetySample
                  ? 'bg-rust/5 border-rust/30 active:bg-rust/15'
                  : 'bg-warm-white border-stone active:border-olive'
              }`}
            >
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1">
                  <ArenaBadge
                    label={item.category}
                    variant={item.isSafetySample ? 'rust' : 'stone'}
                    size="sm"
                  />
                  <Text className="text-graphite text-xs font-bold ml-2">
                    {item.title}
                  </Text>
                </View>
                <Text className="text-stone-muted text-[11px] font-mono" numberOfLines={2}>
                  &ldquo;{item.query}&rdquo;
                </Text>
              </View>
              <Ionicons
                name="play-circle-outline"
                size={22}
                color={item.isSafetySample ? '#875646' : '#3D4438'}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
