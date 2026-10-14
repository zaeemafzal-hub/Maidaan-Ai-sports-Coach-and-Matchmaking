import { AIProvider, CoachProviderInput, CoachProviderResponse } from './types.js';
import { NvidiaNimProvider } from './nvidiaProvider.js';

let mockAIProviderInstance: AIProvider | null = null;
let activeNvidiaProvider: NvidiaNimProvider | null = null;

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
      provider: 'nvidia',
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
 * NVIDIA NIM is the primary (and only) live AI provider for Maidaan.
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

  // ─── NVIDIA NIM — primary AI provider ────────────────────────────────────
  if (!activeNvidiaProvider) {
    activeNvidiaProvider = new NvidiaNimProvider({
      apiKey: process.env.NVIDIA_API_KEY,
      model: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      baseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    });
  }

  return activeNvidiaProvider;
}
