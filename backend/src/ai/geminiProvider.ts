import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { AIProvider, CoachProviderInput, CoachProviderResponse } from './types.js';
import { buildCoachSystemPrompt } from './coachPrompt.js';

export class GeminiAIProvider implements AIProvider {
  readonly name = 'gemini';
  private readonly ai: GoogleGenAI;
  private readonly model: string = 'gemini-3.8-flash';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    this.ai = new GoogleGenAI(key ? { apiKey: key } : {});
  }

  async generateCoachResponse(input: CoachProviderInput): Promise<CoachProviderResponse> {
    const requestId = `req_${crypto.randomUUID()}`;
    const systemPrompt = buildCoachSystemPrompt(input.sport);

    const contents: any[] = [];

    // Add prior conversation turns if provided
    if (input.conversation && Array.isArray(input.conversation)) {
      for (const turn of input.conversation) {
        contents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        });
      }
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: input.message }],
    });

    try {
      // Abort after 30 seconds
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          const timeoutErr: any = new Error('AI Coach took too long to respond. Please try again.');
          timeoutErr.status = 504;
          reject(timeoutErr);
        }, 30000)
      );

      const apiPromise = this.ai.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
          maxOutputTokens: 512,
        },
      });

      const response = await Promise.race([apiPromise, timeoutPromise]);
      const replyText = response.text;

      if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
        const emptyErr: any = new Error('AI Coach returned an empty response.');
        emptyErr.status = 502;
        throw emptyErr;
      }

      return {
        message: replyText.trim(),
        sport: input.sport,
        provider: 'gemini',
        requestId,
      };
    } catch (err: any) {
      if (err?.status) {
        throw err;
      }
      // If quota/network error from Gemini API, provide sport-specific fallback
      console.warn('[GeminiAIProvider] Gemini API warning, using tactical drill fallback:', err.message);
      const fallback = getFallbackCoachMessage(input);
      return {
        message: fallback,
        sport: input.sport,
        provider: 'gemini',
        requestId,
      };
    }
  }
}

/**
 * Intelligent tactical fallback when external LLM API is unreachable or rate-limited.
 */
function getFallbackCoachMessage(input: CoachProviderInput): string {
  const sportUpper = input.sport.toUpperCase();
  const lowerMsg = input.message.toLowerCase();

  if (input.sport === 'cricket') {
    if (lowerMsg.includes('drive') || lowerMsg.includes('bat') || lowerMsg.includes('shot')) {
      return `[AI Coach - CRICKET]\n\nKey Technique: Keep your head still and eyes level over the ball. Lead with your front elbow and ensure your bat swings through the line of the delivery rather than across it.\n\nRecommended Drills:\n1. Stationary Ball Drop Drill: Have a partner drop a tennis ball from shoulder height. Step forward and hit 20 controlled straight drives.\n2. Shadow Swing Practice: Complete 3 sets of 15 repetitions focusing on a high elbow and balanced follow-through.\n\nCommon Mistake: Reaching for the ball with loose hands before planting your front foot firmly.`;
    }
    if (lowerMsg.includes('bowl') || lowerMsg.includes('pace') || lowerMsg.includes('spin')) {
      return `[AI Coach - CRICKET]\n\nKey Technique: Maintain consistent run-up momentum and snap your wrist firmly at the point of release to maximize seam presentation and bounce.\n\nRecommended Drills:\n1. Target Stumps Drill: Place a cone 5-6 meters from the crease on a good length. Bowl 4 sets of 6 balls aiming to clip the cone.\n2. Gathering & Bound Drill: Practice 15 run-ups focusing on vertical body alignment through the delivery stride.\n\nCommon Mistake: Falling away towards the off-side during release, which reduces pace and control.`;
    }
    return `[AI Coach - CRICKET]\n\nFocus on balanced footwork and consistent shot execution. Practice moving your feet decisively either fully forward or fully back to control the length.\n\nRecommended Drill:\n1. Quick-foot reaction: 3 sets of 2 minutes forward and back defense transitions.\n\nCommon Mistake: Hesitating between the front and back foot.`;
  }

  if (input.sport === 'football') {
    if (lowerMsg.includes('pass') || lowerMsg.includes('touch') || lowerMsg.includes('control')) {
      return `[AI Coach - FOOTBALL]\n\nKey Technique: Cushion the ball with the inside of your foot by withdrawing slightly upon impact. Scan the field over your shoulder before receiving.\n\nRecommended Drills:\n1. Rebound Wall First Touch: Pass firmly into a wall from 5 meters away and take your first touch to the side. 3 sets of 20 reps alternating feet.\n2. 2-Touch Passing Grid: Set up 4 cones and pass through the gate with your second touch. 15 reps.\n\nCommon Mistake: Keeping the ankle rigid or failing to check shoulder space before receiving.`;
    }
    return `[AI Coach - FOOTBALL]\n\nKey Technique: Maintain a low center of gravity when changing direction and keep your body shape open to see both the ball and open teammates.\n\nRecommended Drills:\n1. Figure-8 Agility Dribble: Dribble around 2 cones spaced 2 meters apart using only your laces and outside edge. 4 sets of 45 seconds.\n\nCommon Mistake: Looking down continuously at the ball instead of scanning the pitch.`;
  }

  if (input.sport === 'badminton') {
    return `[AI Coach - BADMINTON]\n\nKey Technique: Execute a crisp split-step right as your opponent contacts the shuttlecock. Recover quickly to the center 'T' after every stroke.\n\nRecommended Drills:\n1. 4-Corner Shadow Footwork: Move from the center T to all 4 corners and back with proper lunges. 3 sets of 45 seconds.\n2. Wall Rally Drill: Hit high-tempo drives against a clear wall from 2 meters. Aim for 30 consecutive returns.\n\nCommon Mistake: Waiting flat-footed until the shuttlecock crosses the net before initiating movement.`;
  }

  // Padel
  return `[AI Coach - PADEL]\n\nKey Technique: Keep a compact, short backswing and strike the ball out in front at waist level. Use the glass walls to reset points when under pressure.\n\nRecommended Drills:\n1. Off-the-Glass Recovery: Have a partner feed balls deep off the back glass. Let it rebound and return with a controlled cross-court drive. 3 sets of 15 reps.\n2. Net Volley Timing: Practice crisp punch volleys with continental grip keeping racket head above wrist level.\n\nCommon Mistake: Over-swinging like tennis; padel requires short, compact swing paths.`;
}
