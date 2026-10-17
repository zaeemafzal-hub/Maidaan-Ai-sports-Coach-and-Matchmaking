import { AIProvider, CoachProviderInput, CoachProviderResponse, TextGenerationInput, TextGenerationResponse } from './types.js';
import { GeminiAIProvider } from './geminiProvider.js';
import { GroqAIProvider } from './groqProvider.js';
import { FailoverAIProvider } from './failoverProvider.js';

let mockAIProviderInstance: AIProvider | null = null;

export class MockTestAIProvider implements AIProvider {
  readonly name = 'mock_test_provider';

  async generateCoachResponse(input: CoachProviderInput): Promise<CoachProviderResponse> {
    const drillBySport: Record<string, string> = {
      cricket: 'Focus on keeping your eyes level and head still over the ball during the front foot drive. Practice 20 repetitions with a stationary ball on a tee.',
      football: 'Work on your first touch by cushioning the ball with the inside of your foot against a rebound wall. 3 sets of 15 repetitions with both feet.',
      badminton: 'Execute the split-step right before your opponent hits the shuttlecock. Drill 4-corner shadow footwork for 3 sets of 45 seconds.',
      padel: 'Maintain a compact backswing and strike the ball out in front on the bandeja. Practice 15 cross-court feeds keeping the trajectory flat.',
    };

    const guidance = drillBySport[input.sport] || 'Focus on consistent fundamentals and proper footwork balance.';

    return {
      message: `[AI Coach - ${input.sport.toUpperCase()}] ${guidance}`,
      sport: input.sport,
      provider: 'mock',
      requestId: `req_mock_${Date.now()}`,
    };
  }
}

/**
 * Injects a mock provider for automated unit/integration tests.
 */
export function setMockAIProvider(provider: AIProvider | null): void {
  mockAIProviderInstance = provider;
}

/**
 * Resolves the configured AI provider.
 * Gemini is primary and Groq is backup. Test mode uses no live credentials.
 * In test mode (NODE_ENV=test), returns an injected mock or the default MockTestAIProvider.
 */
export function getAIProvider(): AIProvider {
  const isTestMode = process.env.NODE_ENV === 'test';

  if (isTestMode) {
    if (mockAIProviderInstance) {
      return mockAIProviderInstance;
    }
    return new MockTestAIProvider();
  }

  return createLiveProvider();
}

function createLiveProvider(): FailoverAIProvider {
  const primary = process.env.AI_PROVIDER?.trim() || 'gemini';
  const backup = process.env.AI_FALLBACK_PROVIDER?.trim() || 'groq';
  const names = [...new Set([primary, backup].filter(Boolean))];
  const providers = names.map((name) => {
    if (name === 'gemini') return new GeminiAIProvider();
    if (name === 'groq') return new GroqAIProvider();
    throw new Error(`Unsupported AI provider "${name}". Use gemini or groq.`);
  });
  return new FailoverAIProvider(providers);
}

export const isAIConfigured = (): boolean => Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.GROQ_API_KEY?.trim());

export async function generateAIText(input: TextGenerationInput): Promise<TextGenerationResponse> {
  return createLiveProvider().generateText(input);
}
