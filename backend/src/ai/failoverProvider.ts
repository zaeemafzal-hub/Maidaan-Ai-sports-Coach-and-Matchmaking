import crypto from 'node:crypto';
import { AIProviderError, TextAIProvider, CoachProviderInput, CoachProviderResponse, TextGenerationInput, TextGenerationResponse } from './types.js';
import { buildCoachSystemPrompt } from './coachPrompt.js';

/** Try each provider once, then report unavailability without fabricating AI output. */
export class FailoverAIProvider implements TextAIProvider {
  readonly name = 'gemini-groq';

  constructor(private readonly providers: TextAIProvider[]) {}

  async generateText(input: TextGenerationInput): Promise<TextGenerationResponse> {
    for (const [index, provider] of this.providers.entries()) {
      try {
        const result = await provider.generateText(input);
        if (!result.message.trim()) throw new AIProviderError('Empty AI response.', 502);
        return { ...result, usedBackup: index > 0 };
      } catch (error) {
        if (error instanceof AIProviderError && error.code === 'CONTENT_BLOCKED') throw error;
        console.warn(`[AI] ${provider.name} unavailable; ${index + 1 < this.providers.length ? 'trying backup.' : 'no providers remaining.'}`);
      }
    }
    throw new AIProviderError('Live AI coaching is temporarily unavailable. Please try again shortly.');
  }

  async generateCoachResponse(input: CoachProviderInput): Promise<CoachProviderResponse> {
    const result = await this.generateText({ ...input, systemPrompt: buildCoachSystemPrompt(input.sport) });
    return { ...result, sport: input.sport, requestId: `req_${crypto.randomUUID()}` };
  }
}
