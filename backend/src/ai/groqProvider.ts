import crypto from 'node:crypto';
import { AIProviderError, TextAIProvider, CoachProviderInput, CoachProviderResponse, TextGenerationInput, TextGenerationResponse } from './types.js';
import { buildCoachSystemPrompt } from './coachPrompt.js';

export class GroqAIProvider implements TextAIProvider {
  readonly name = 'groq';

  constructor(
    private readonly apiKey = process.env.GROQ_API_KEY?.trim() || '',
    private readonly model = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-20b',
  ) {}

  async generateText(input: TextGenerationInput): Promise<TextGenerationResponse> {
    if (!this.apiKey) throw new AIProviderError('Groq API key is not configured.');
    if (this.apiKey.startsWith('xai-')) {
      throw new AIProviderError('GROQ_API_KEY contains an xAI/Grok key. Use a Groq key from console.groq.com.');
    }
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: input.systemPrompt },
            ...(input.conversation || []),
            { role: 'user', content: input.message },
          ],
          temperature: input.temperature ?? 0.6,
          max_completion_tokens: input.maxTokens ?? 1024,
          ...(input.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: AbortSignal.timeout(input.timeoutMs ?? 20000),
      });
      if (!response.ok) {
        console.warn(`[AI] Groq request failed (${response.status}).`);
        const body = await response.json().catch(() => null) as { error?: { code?: string } } | null;
        if (body?.error?.code === 'content_policy_violation' || body?.error?.code === 'content_filter') {
          throw new AIProviderError('This request could not be answered safely. Please rephrase it.', 422, 'CONTENT_BLOCKED');
        }
        throw new AIProviderError('Groq is temporarily unavailable.');
      }
      const body = await response.json() as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };
      if (body.choices?.[0]?.finish_reason === 'content_filter') {
        throw new AIProviderError('This request could not be answered safely. Please rephrase it.', 422, 'CONTENT_BLOCKED');
      }
      const message = body.choices?.[0]?.message?.content?.trim();
      if (!message) throw new AIProviderError('Groq returned an empty response.', 502);
      return { message, provider: this.name };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError('Groq is temporarily unavailable.');
    }
  }

  async generateCoachResponse(input: CoachProviderInput): Promise<CoachProviderResponse> {
    const result = await this.generateText({ ...input, systemPrompt: buildCoachSystemPrompt(input.sport) });
    return { ...result, sport: input.sport, requestId: `req_${crypto.randomUUID()}` };
  }
}
