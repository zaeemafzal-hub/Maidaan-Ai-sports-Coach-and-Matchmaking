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
 * In test mode (NODE_ENV=test), returns injected mock provider or default MockTestAIProvider.
 * In development and production, strictly instantiates the configured provider (NVIDIA NIM).
 */
export function getAIProvider(): AIProvider {
  const isTestMode = process.env.NODE_ENV === 'test';

  if (isTestMode) {
    if (mockAIProviderInstance) {
      return mockAIProviderInstance;
    }
    return new MockTestAIProvider();
  }

  const providerType = (process.env.AI_PROVIDER || 'nvidia').toLowerCase().trim();

  if (providerType === 'nvidia') {
    const apiKey = process.env.NVIDIA_API_KEY;
    const model = process.env.NVIDIA_MODEL;
    const baseUrl = process.env.NVIDIA_BASE_URL;

    if (!apiKey || !apiKey.trim()) {
      const cfgError: any = new Error('NVIDIA AI provider is not configured. Missing NVIDIA_API_KEY environment variable.');
      cfgError.status = 502;
      throw cfgError;
    }

    if (!model || !model.trim()) {
      const cfgError: any = new Error('NVIDIA AI provider is not configured. Missing NVIDIA_MODEL environment variable.');
      cfgError.status = 502;
      throw cfgError;
    }

    if (!activeNvidiaProvider) {
      activeNvidiaProvider = new NvidiaNimProvider({
        apiKey,
        model,
        baseUrl,
      });
    }

    return activeNvidiaProvider;
  }

  // Fail safely on unsupported provider types without fake fallback
  const unsupportedError: any = new Error(`Unsupported AI_PROVIDER: "${providerType}". Supported provider is 'nvidia'.`);
  unsupportedError.status = 502;
  throw unsupportedError;
}
