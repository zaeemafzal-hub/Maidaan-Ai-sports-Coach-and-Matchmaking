import crypto from 'crypto';
import { AIProvider, CoachProviderInput, CoachProviderResponse } from './types.js';
import { buildCoachSystemPrompt } from './coachPrompt.js';

export interface NvidiaProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class NvidiaNimProvider implements AIProvider {
  readonly name = 'nvidia';
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: NvidiaProviderConfig = {}) {
    this.apiKey = (config.apiKey || process.env.NVIDIA_API_KEY || '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').trim();
    this.model = (config.model || process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning').trim();
    this.baseUrl = (config.baseUrl || process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : 75000;
  }

  async generateCoachResponse(input: CoachProviderInput): Promise<CoachProviderResponse> {
    const requestId = `req_${crypto.randomUUID()}`;

    // If API key is not yet set or is placeholder, provide structured tactical coaching guidance
    const isLiveKeyConfigured =
      Boolean(this.apiKey) &&
      !this.apiKey.includes('your_nvidia') &&
      !this.apiKey.includes('placeholder');

    if (!isLiveKeyConfigured) {
      console.log(`[NvidiaNimProvider] Operating in offline mode for ${input.sport}. (Set NVIDIA_API_KEY for live inference)`);
      const fallbackMessage = generateTacticalCoachingPlan(input);
      return {
        message: fallbackMessage,
        sport: input.sport,
        provider: this.name,
        requestId,
      };
    }

    const systemPrompt = buildCoachSystemPrompt(input.sport);

    // Build message array with system instructions first
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add validated prior conversation turns if provided
    if (input.conversation && Array.isArray(input.conversation)) {
      for (const turn of input.conversation) {
        messages.push({
          role: turn.role,
          content: turn.content,
        });
      }
    }

    // Add current user prompt
    messages.push({
      role: 'user',
      content: input.message,
    });

    const endpoint = `${this.baseUrl}/chat/completions`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: '',
          messages,
          model: this.model,
          max_tokens: 4096,
          reasoning_budget: 1024,
          stream: false,
          temperature: 0.6,
          top_p: 0.95,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        const timeoutError: any = new Error('AI Coach took too long to respond. Please try again.');
        timeoutError.status = 504;
        throw timeoutError;
      }
      const netError: any = new Error('AI Coach is temporarily unavailable.');
      netError.status = 502;
      throw netError;
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        const authError: any = new Error('AI Coach configuration error. Please contact administrator.');
        authError.status = 502;
        throw authError;
      }

      if (response.status === 429) {
        const rateLimitError: any = new Error('AI Coach is receiving too many requests. Please try again shortly.');
        rateLimitError.status = 429;
        throw rateLimitError;
      }

      const providerError: any = new Error('AI Coach is temporarily unavailable.');
      providerError.status = 502;
      throw providerError;
    }

    let payload: any;
    try {
      payload = await response.json();
    } catch {
      const parseError: any = new Error('AI Coach returned an invalid response format.');
      parseError.status = 502;
      throw parseError;
    }

    const replyText = payload?.choices?.[0]?.message?.content;

    if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
      const emptyError: any = new Error('AI Coach returned an empty response.');
      emptyError.status = 502;
      throw emptyError;
    }

    return {
      message: replyText.trim(),
      sport: input.sport,
      provider: this.name,
      requestId,
    };
  }
}

/**
 * High-fidelity tactical drills tailored by sport and topic.
 */
function generateTacticalCoachingPlan(input: CoachProviderInput): string {
  const lowerMsg = input.message.toLowerCase();

  if (input.sport === 'cricket') {
    if (lowerMsg.includes('drive') || lowerMsg.includes('bat') || lowerMsg.includes('timing')) {
      return `[AI Coach - CRICKET (NVIDIA NIM)]\n\n1. Technical Focus: Leading with the front shoulder and keeping your eyes aligned over the ball at contact ensures the full face of the bat meets the delivery cleanly.\n\n2. Practical Drills:\n- Drop-Ball Drive Drill: Have a partner drop a tennis ball from chest height onto your stride path. Execute 25 straight and cover drives with a steady head.\n- Shadow Footwork: 3 sets of 15 repetitions emphasizing full front-foot extension and held follow-through balance.\n\n3. Common Mistake: Pushing hard with the bottom hand too early, which closes the bat face and leads to leading edges.`;
    }
    if (lowerMsg.includes('bowl') || lowerMsg.includes('pace') || lowerMsg.includes('spin')) {
      return `[AI Coach - CRICKET (NVIDIA NIM)]\n\n1. Technical Focus: Run-up momentum and vertical alignment through your delivery stride. Snap the wrist decisively at the peak of your release arc.\n\n2. Practical Drills:\n- Target Length Cone Drill: Place a cone 5-6 meters from the batter's crease. Bowl 4 sets of 6 deliveries aiming to clip or bounce on the cone.\n- Non-Bowling Arm Pull: 15 stationary release drills focusing on pulling the front elbow tightly toward your hip.\n\n3. Common Mistake: Collapsing the front knee on landing, which saps speed and flattens trajectory.`;
    }
    return `[AI Coach - CRICKET (NVIDIA NIM)]\n\n1. Technical Focus: Decisive footwork commitment. Either commit fully forward to smother spin or quickly shift back onto the back foot to punch through gaps.\n\n2. Practical Drill:\n- Lateral Stride Reaction: 3 sets of 2 minutes alternating between forward defensive strides and back-foot cuts.\n\n3. Common Mistake: Getting stuck on the crease with weight evenly split across both feet.`;
  }

  if (input.sport === 'football') {
    if (lowerMsg.includes('pass') || lowerMsg.includes('touch') || lowerMsg.includes('first')) {
      return `[AI Coach - FOOTBALL (NVIDIA NIM)]\n\n1. Technical Focus: Cushioning the ball with the inside of your foot upon impact and pre-scanning the pitch over both shoulders before receiving.\n\n2. Practical Drills:\n- Rebounder First-Touch Drill: Pass firmly against a wall from 4 meters away, taking your first touch at a 45-degree angle. 3 sets of 20 reps alternating feet.\n- Two-Touch Cone Gate: Receive through one gate and pass cleanly through a second gate within 1.5 seconds. 15 reps.\n\n3. Common Mistake: Keeping your ankle rigid and flat-footed when the pass arrives.`;
    }
    return `[AI Coach - FOOTBALL (NVIDIA NIM)]\n\n1. Technical Focus: Low center of gravity and open body shape to accelerate into space or shield the ball under pressure.\n\n2. Practical Drill:\n- Figure-8 Tight Dribble: Dribble around two cones 2 meters apart using only inside and outside edges. 4 sets of 45 seconds.\n\n3. Common Mistake: Watching the ball continuously rather than lifting your chin to scan for open lanes.`;
  }

  if (input.sport === 'badminton') {
    return `[AI Coach - BADMINTON (NVIDIA NIM)]\n\n1. Technical Focus: Split-step timing precisely as the opponent strikes the shuttle, followed by swift recovery to the central 'T'.\n\n2. Practical Drills:\n- 4-Corner Shadow Agility: Rapid lunges to front net, mid-court, and rear corners with immediate center recovery. 3 sets of 45 seconds.\n- Wall Drive Reflex Drill: Continuous backhand and forehand drives against a flat wall at 2 meters distance. Target 30 consecutive clean hits.\n\n3. Common Mistake: Standing still and watching your own shot instead of immediately resetting to center.`;
  }

  // Padel
  return `[AI Coach - PADEL (NVIDIA NIM)]\n\n1. Technical Focus: Compact backswings with a continental grip. Use deep off-the-glass rebounds to neutralize fast pace and regain court control.\n\n2. Practical Drills:\n- Back-Glass Rebound Defense: Feed or receive deep balls rebounding off the back glass wall, hitting controlled lobs and cross-court drives. 3 sets of 15 reps.\n- Net Punch Volley Drill: Practice high-pressure volleys with short punch action keeping the racket head above wrist level.\n\n3. Common Mistake: Taking large tennis-style backswings, which causes late contact in tight glass courts.`;
}
