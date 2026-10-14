import crypto from 'crypto';
import { AIProvider, CoachProviderInput, CoachProviderResponse } from './types.js';
import { buildCoachSystemPrompt } from './coachPrompt.js';

export interface NvidiaProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class NvidiaNimProvider implements AIProvider {
  readonly name = 'nvidia';
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: NvidiaProviderConfig) {
    if (!config.apiKey || !config.apiKey.trim()) {
      throw new Error('NVIDIA NIM API key is required but missing.');
    }
    if (!config.model || !config.model.trim()) {
      throw new Error('NVIDIA model identifier is required but missing.');
    }
    this.apiKey = config.apiKey.trim();
    this.model = config.model.trim();
    this.baseUrl = (config.baseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : 75000;
  }

  async generateCoachResponse(input: CoachProviderInput): Promise<CoachProviderResponse> {
    const requestId = `req_${crypto.randomUUID()}`;
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
          model: this.model,
          messages,
          temperature: 0.6,
          top_p: 0.9,
          max_tokens: 512,
          ...(this.model.includes('reasoning') ? { reasoning_budget: 512 } : {}),
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
