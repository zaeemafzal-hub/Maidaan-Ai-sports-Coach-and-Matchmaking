import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { AIProviderError, TextAIProvider, CoachProviderInput, CoachProviderResponse, TextGenerationInput, TextGenerationResponse } from './types.js';
import { buildCoachSystemPrompt } from './coachPrompt.js';

export class GeminiAIProvider implements TextAIProvider {
  readonly name = 'gemini';

  constructor(
    private readonly apiKey = process.env.GEMINI_API_KEY?.trim() || '',
    private readonly model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
  ) {}

  async generateText(input: TextGenerationInput): Promise<TextGenerationResponse> {
    if (!this.apiKey) throw new AIProviderError('Gemini API key is not configured.');
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: [
          ...(input.conversation || []).map((turn) => ({
            role: turn.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: turn.content }],
          })),
          { role: 'user', parts: [{ text: input.message }] },
        ],
        config: {
          systemInstruction: input.systemPrompt,
          temperature: input.temperature ?? 0.6,
          maxOutputTokens: input.maxTokens ?? 1024,
          abortSignal: AbortSignal.timeout(input.timeoutMs ?? 20000),
          httpOptions: { retryOptions: { attempts: 1 } },
          ...(input.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      });
      if (response.promptFeedback?.blockReason || response.candidates?.some((c) => c.finishReason === 'SAFETY')) {
        throw new AIProviderError('This request could not be answered safely. Please rephrase it.', 422, 'CONTENT_BLOCKED');
      }
      const message = response.text?.trim();
      if (!message) throw new AIProviderError('Gemini returned an empty response.', 502);
      return { message, provider: this.name };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : 'network/timeout';
      console.warn(`[AI] Gemini request failed (${status}).`);
      // Upstream errors may contain request details; expose only a safe message.
      throw new AIProviderError('Gemini is temporarily unavailable.');
    }
  }

  async generateCoachResponse(input: CoachProviderInput): Promise<CoachProviderResponse> {
    const result = await this.generateText({ ...input, systemPrompt: buildCoachSystemPrompt(input.sport) });
    return { ...result, sport: input.sport, requestId: `req_${crypto.randomUUID()}` };
  }
}
