import { generateAIText, isAIConfigured } from '../../ai/providerFactory.js';
import { AgentState, AgentUpdate } from '../state.js';
import { AgentClassificationResult, AgentIntent } from '../types.js';
import { SUPERVISOR_SYSTEM_PROMPT } from '../prompts/supervisor.js';
import { Sport, SkillLevel } from '../../models/supabaseRepo.js';

const VALID_INTENTS: Set<AgentIntent> = new Set([
  'MATCHMAKING',
  'COACHING',
  'WEATHER',
  'GENERAL',
  'HUB_DISCOVERY',
  'CAPTAIN',
]);

const VALID_SPORTS: Set<Sport> = new Set(['cricket', 'football', 'badminton', 'padel']);
const VALID_SKILLS: Set<SkillLevel> = new Set(['beginner', 'intermediate', 'advanced']);

/**
 * Deterministic fallback classifier based on keyword heuristic rules.
 * Runs whenever LLM is unavailable, times out, or returns invalid JSON.
 */
export function deterministicFallbackClassifier(message: string): AgentClassificationResult {
  const normalized = message.toLowerCase();

  // Extract Sport
  let extractedSport: Sport | undefined;
  for (const s of ['cricket', 'football', 'badminton', 'padel'] as Sport[]) {
    if (normalized.includes(s)) {
      extractedSport = s;
      break;
    }
  }

  // Extract Area (common Lahore sports hubs)
  let extractedArea: string | undefined;
  const commonAreas = ['gulberg', 'dha', 'model town', 'johar town', 'cantt', 'bahria', 'lahore'];
  for (const a of commonAreas) {
    if (normalized.includes(a)) {
      extractedArea = a.charAt(0).toUpperCase() + a.slice(1);
      break;
    }
  }

  // If no common area matched, look for "in <area>" or "near <area>"
  if (!extractedArea) {
    const areaMatch = normalized.match(/(?:in|near|around)\s+([a-z0-9_-]+)(?:$|\s)/i);
    if (areaMatch && areaMatch[1]) {
      const candidate = areaMatch[1].trim();
      const nonAreaWords = ['my', 'a', 'the', 'an', 'some', 'any', 'verified', 'open', 'outdoor', 'indoor'];
      if (!nonAreaWords.includes(candidate)) {
        extractedArea = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  // Extract Skill Level
  let extractedSkill: SkillLevel | undefined;
  if (normalized.includes('beginner') || normalized.includes('novice')) {
    extractedSkill = 'beginner';
  } else if (normalized.includes('intermediate') || normalized.includes('mid-level') || normalized.includes('medium')) {
    extractedSkill = 'intermediate';
  } else if (normalized.includes('advanced') || normalized.includes('expert') || normalized.includes('pro')) {
    extractedSkill = 'advanced';
  }

  // 1. Captain Assistant Keywords (Possessive match/fixture queries or join request inquiries)
  const captainPatterns = [
    'my match',
    'my matches',
    'my fixture',
    'my fixtures',
    'my open slot',
    'open slots in my',
    'slots in my match',
    'which of my matches',
    'which fixture needs more players',
    'needs more players',
    'join request',
    'join requests',
    'pending request',
    'pending requests',
    'who requested to join',
    'requests for my',
    'requests sent to my',
    'captain dashboard',
    'as a captain',
    'my team',
    'create match',
    'create a match',
    'schedule match',
    'schedule a match',
    'host a match',
    'host match',
    'organize a match',
    'organize match',
    'accept request',
    'accept join request',
    'reject request',
    'reject join request',
    'decline request',
    'decline join request',
    'confirm action',
    'confirm match',
  ];

  const isMatchCreation =
    /\b(?:create|schedule|host|organize)\s+(?:a\s+)?(?:(?:cricket|football|badminton|padel)\s+)?(?:match|fixture|game)\b/i.test(normalized) ||
    normalized.includes('create match') ||
    normalized.includes('schedule match') ||
    normalized.includes('host match') ||
    normalized.includes('organize match');

  const isRequestAction =
    /\b(?:accept|approve|reject|decline)\s+(?:the\s+|this\s+|a\s+)?(?:join\s+|pending\s+)?request\b/i.test(normalized) ||
    /\b(?:accept|approve|reject|decline)\s+.*?\s+(?:request|applicant)\b/i.test(normalized);

  const isConfirmation =
    normalized === 'confirm' ||
    normalized.startsWith('confirm ') ||
    normalized === 'yes create it' ||
    normalized === 'yes reject it' ||
    normalized === 'yes' ||
    normalized === 'cancel action';

  if (isMatchCreation || isRequestAction || isConfirmation || captainPatterns.some((p) => normalized.includes(p))) {
    return {
      intent: 'CAPTAIN',
      sport: extractedSport,
      area: extractedArea,
      skillLevel: extractedSkill,
      confidence: 0.95,
      reasoning: 'Deterministic fallback matched captain management query.',
    };
  }

  // 2. Weather Intent Keywords
  const weatherKeywords = [
    'weather',
    'rain',
    'raining',
    'temperature',
    'forecast',
    'outdoor',
    'indoor',
    'outside',
    'inside',
    'wind',
    'storm',
    'humidity',
    'sunny',
    'hot',
    'cold',
  ];
  if (weatherKeywords.some((kw) => normalized.includes(kw))) {
    return {
      intent: 'WEATHER',
      sport: extractedSport,
      area: extractedArea,
      skillLevel: extractedSkill,
      confidence: 0.9,
      reasoning: 'Deterministic fallback matched weather keywords.',
    };
  }

  // 3. Coaching Intent Keywords
  const coachingKeywords = [
    'coach',
    'drill',
    'training',
    'improve',
    'technique',
    'practice',
    'how to play',
    'teach',
    'tips',
    'skills',
    'learn',
    'batting',
    'bowling',
    'bowl',
    'bat',
    'footwork',
    'smash',
    'serve',
    'backhand',
    'forehand',
    'bandeja',
    'stamina',
    'tactics',
    'form',
    'stance',
  ];
  if (coachingKeywords.some((kw) => normalized.includes(kw))) {
    return {
      intent: 'COACHING',
      sport: extractedSport || 'cricket',
      area: extractedArea,
      skillLevel: extractedSkill,
      confidence: 0.9,
      reasoning: 'Deterministic fallback matched coaching keywords.',
    };
  }

  // 4. Hub Discovery Keywords (Venues, courts, complexes, sports grounds)
  // Concept definition queries like "What does verified hub mean?" or "What is a verified hub?" route to GENERAL
  const isDefinitionQuery =
    (normalized.includes('what does') || normalized.includes('what is') || normalized.includes('explain')) &&
    (normalized.includes('mean') || normalized.includes('concept') || normalized.includes('definition'));

  const hubKeywords = [
    'hub',
    'hubs',
    'venue',
    'venues',
    'court',
    'courts',
    'facility',
    'facilities',
    'sports ground',
    'sports complex',
    'verified hub',
  ];
  if (!isDefinitionQuery && hubKeywords.some((kw) => normalized.includes(kw))) {
    return {
      intent: 'HUB_DISCOVERY',
      sport: extractedSport,
      area: extractedArea,
      skillLevel: extractedSkill,
      confidence: 0.9,
      reasoning: 'Deterministic fallback matched hub discovery keywords.',
    };
  }

  // 5. Matchmaking Intent Keywords
  const matchKeywords = [
    'match',
    'game',
    'open slot',
    'player needed',
    'find game',
    'find match',
    'join match',
    'squad',
    'fixture',
    'looking for team',
    'play tonight',
    'play tomorrow',
    'need a player',
  ];
  if (matchKeywords.some((kw) => normalized.includes(kw))) {
    return {
      intent: 'MATCHMAKING',
      sport: extractedSport,
      area: extractedArea,
      skillLevel: extractedSkill,
      confidence: 0.85,
      reasoning: 'Deterministic fallback matched matchmaking keywords.',
    };
  }

  // Default to GENERAL
  return {
    intent: 'GENERAL',
    sport: extractedSport,
    area: extractedArea,
    skillLevel: extractedSkill,
    confidence: 0.7,
    reasoning: 'Default fallback route for general platform query.',
  };
}

/**
 * Supervisor classifyIntent Node in LangGraph.
 */
export async function classifyIntentNode(state: AgentState): Promise<AgentUpdate> {
  const message = state.message || '';

  // If in test mode or no key, immediately use deterministic classifier
  if (process.env.NODE_ENV === 'test' || !isAIConfigured()) {
    const fallback = deterministicFallbackClassifier(message);
    return {
      intent: fallback.intent,
      sport: fallback.sport,
      area: fallback.area,
      skillLevel: fallback.skillLevel,
    };
  }

  try {
    const result = await generateAIText({
      systemPrompt: SUPERVISOR_SYSTEM_PROMPT,
      message,
      temperature: 0.1,
      maxTokens: 512,
      jsonMode: true,
      timeoutMs: 6000,
    });
    const text = result.message;

    // Strip code fences if present
    const cleanJson = text.replace(/^```json/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    // Validate Intent
    let intent: AgentIntent = 'GENERAL';
    if (parsed.intent && VALID_INTENTS.has(parsed.intent as AgentIntent)) {
      intent = parsed.intent as AgentIntent;
    } else {
      intent = deterministicFallbackClassifier(message).intent;
    }

    // Validate Sport
    let sport: Sport | undefined = undefined;
    if (parsed.sport && VALID_SPORTS.has(parsed.sport.toLowerCase())) {
      sport = parsed.sport.toLowerCase() as Sport;
    }

    // Validate Skill Level
    let skillLevel: SkillLevel | undefined = undefined;
    if (parsed.skillLevel && VALID_SKILLS.has(parsed.skillLevel.toLowerCase())) {
      skillLevel = parsed.skillLevel.toLowerCase() as SkillLevel;
    }

    const area = typeof parsed.area === 'string' && parsed.area.trim() ? parsed.area.trim() : undefined;

    return {
      intent,
      sport,
      area,
      skillLevel,
    };
  } catch (error) {
    // Graceful fallback to deterministic classifier
    const fallback = deterministicFallbackClassifier(message);
    return {
      intent: fallback.intent,
      sport: fallback.sport,
      area: fallback.area,
      skillLevel: fallback.skillLevel,
    };
  }
}
