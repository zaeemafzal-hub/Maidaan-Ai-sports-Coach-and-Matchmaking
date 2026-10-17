import { AgentState, AgentUpdate } from '../state.js';
import { getAIProvider } from '../../ai/providerFactory.js';
import { CoachSport } from '../../ai/types.js';

export async function coachingNode(state: AgentState): Promise<AgentUpdate> {
  const { userId, message, sport, skillLevel } = state;

  const resolvedSport: CoachSport = (sport && ['cricket', 'football', 'badminton', 'padel'].includes(sport))
    ? (sport as CoachSport)
    : 'cricket';

  try {
    const provider = getAIProvider();
    const coachResponse = await provider.generateCoachResponse({
      sport: resolvedSport,
      message,
    });

    return {
      response: coachResponse.message,
      toolResult: {
        tool: 'coachingProvider',
        sport: coachResponse.sport,
        provider: coachResponse.provider,
        requestId: coachResponse.requestId,
      },
    };
  } catch (error: any) {
    // Deterministic fallback drill if coach provider throws
    const fallbackDrills: Record<CoachSport, string> = {
      cricket: 'Focus on balance during your stance. Keep your eyes level and practice 20 stationary ball front foot drives.',
      football: 'Work on your first touch using both the inside and outside of your foot against a wall for 3 sets of 20 touches.',
      badminton: 'Execute the split-step as your opponent strikes the shuttlecock. Perform 4-corner shadow footwork for 3 sets of 45 seconds.',
      padel: 'Keep your racket head up and take short, compact preparation steps. Practice 15 cross-court wall rebound drives.',
    };

    const drill = fallbackDrills[resolvedSport] || fallbackDrills.cricket;

    return {
      response: `[Maidaan Tactical Coach - ${resolvedSport.toUpperCase()}]\n${drill}\n\n*Tip: Stop immediately and consult a doctor if you feel sharp pain or injury.*`,
      toolResult: {
        tool: 'coachingProvider',
        sport: resolvedSport,
        isFallback: true,
      },
    };
  }
}
