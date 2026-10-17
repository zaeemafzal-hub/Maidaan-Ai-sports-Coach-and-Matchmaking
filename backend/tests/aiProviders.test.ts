import assert from 'node:assert/strict';
import test from 'node:test';
import { GeminiAIProvider } from '../src/ai/geminiProvider.js';
import { GroqAIProvider } from '../src/ai/groqProvider.js';
import { FailoverAIProvider } from '../src/ai/failoverProvider.js';
import { AIProviderError, TextAIProvider, TextGenerationInput, TextGenerationResponse } from '../src/ai/types.js';
import { CoachController } from '../src/controllers/coachController.js';
import { setMockAIProvider } from '../src/ai/providerFactory.js';
import type { Request, Response as ExpressResponse } from 'express';

const input: TextGenerationInput = { systemPrompt: 'Sports coaching only.', message: 'Suggest a batting drill.' };
const coachInput = { sport: 'cricket' as const, message: input.message };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

function provider(name: string, generateText: (input: TextGenerationInput) => Promise<TextGenerationResponse>): TextAIProvider {
  return { name, generateText, generateCoachResponse: async () => { throw new Error('Unexpected direct coaching call'); } };
}

test('Gemini sends the model, system prompt and conversation to its API', async (t) => {
  let body: any;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    body = JSON.parse(String(init.body));
    return json({ candidates: [{ content: { role: 'model', parts: [{ text: 'Practice 20 balanced drives.' }] }, finishReason: 'STOP' }] });
  });
  const result = await new GeminiAIProvider('test-key', 'gemini-3.5-flash-lite').generateCoachResponse({
    ...coachInput, conversation: [{ role: 'assistant', content: 'Keep a steady head.' }],
  });
  assert.equal(result.provider, 'gemini');
  assert.equal(result.message, 'Practice 20 balanced drives.');
  assert.equal(body.contents[0].role, 'model');
  assert.equal(body.contents.at(-1).parts[0].text, input.message);
  assert.ok(body.systemInstruction.parts[0].text.includes('cricket') || body.systemInstruction.parts[0].text.includes('CRICKET'));
});

test('Groq preserves conversation history and returns the real provider', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    const body = JSON.parse(String(init.body));
    assert.equal(body.model, 'openai/gpt-oss-20b');
    assert.equal(body.messages[0].role, 'system');
    assert.equal(body.messages[1].content, 'Earlier question');
    assert.ok(init.signal);
    return json({ choices: [{ message: { content: 'Practice controlled footwork.' } }] });
  });
  const result = await new GroqAIProvider('test-key').generateText({ ...input, conversation: [{ role: 'user', content: 'Earlier question' }] });
  assert.equal(result.provider, 'groq');
});

test('Groq failures and empty replies throw instead of returning canned advice', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => json({ error: { message: 'private upstream details' } }, 503));
  await assert.rejects(new GroqAIProvider('test-key').generateText(input), { message: 'Groq is temporarily unavailable.' });
  fetchMock.mock.mockImplementation(async () => json({ choices: [{ message: { content: '' } }] }));
  await assert.rejects(new GroqAIProvider('test-key').generateText(input), /empty response/);
});

test('An xAI key is rejected locally instead of being sent to Groq', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network request'); });
  await assert.rejects(new GroqAIProvider('xai-test-key').generateText(input), /xAI\/Grok key/);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('Gemini failures are sanitized and safety refusals are preserved', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => json({ error: { code: 503, message: 'private upstream details', status: 'UNAVAILABLE' } }, 503));
  await assert.rejects(new GeminiAIProvider('test-key').generateText(input), { message: 'Gemini is temporarily unavailable.' });
  fetchMock.mock.mockImplementation(async () => json({ promptFeedback: { blockReason: 'SAFETY' } }));
  await assert.rejects(new GeminiAIProvider('test-key').generateText(input), (e: unknown) => e instanceof AIProviderError && e.code === 'CONTENT_BLOCKED');
});

test('A successful primary response does not call the backup', async () => {
  let backupCalls = 0;
  const chain = new FailoverAIProvider([
    provider('gemini', async () => ({ message: 'Live answer', provider: 'gemini' })),
    provider('groq', async () => { backupCalls++; return { message: 'Backup answer', provider: 'groq' }; }),
  ]);
  const result = await chain.generateCoachResponse(coachInput);
  assert.equal(result.provider, 'gemini');
  assert.equal(result.usedBackup, false);
  assert.equal(backupCalls, 0);
});

test('Primary failure calls Groq once with the same conversation', async () => {
  const request = { ...input, conversation: [{ role: 'user' as const, content: 'Earlier question' }] };
  const chain = new FailoverAIProvider([
    provider('gemini', async () => { throw new AIProviderError('Temporary failure'); }),
    provider('groq', async (received) => { assert.deepEqual(received, request); return { message: 'Live backup answer', provider: 'groq' }; }),
  ]);
  const result = await chain.generateText(request);
  assert.equal(result.provider, 'groq');
  assert.equal(result.usedBackup, true);
});

test('Missing Gemini key can fail over to Groq', async () => {
  const chain = new FailoverAIProvider([
    new GeminiAIProvider(''),
    provider('groq', async () => ({ message: 'Live backup answer', provider: 'groq' })),
  ]);
  assert.equal((await chain.generateText(input)).provider, 'groq');
});

test('When both providers fail the result is a safe 503 error', async () => {
  const unavailable = async () => { throw new Error('private upstream details'); };
  const chain = new FailoverAIProvider([provider('gemini', unavailable), provider('groq', unavailable)]);
  await assert.rejects(chain.generateText(input), (e: unknown) => e instanceof AIProviderError && e.status === 503 && !e.message.includes('private'));
});

test('A content block is not bypassed through the backup provider', async () => {
  let calledBackup = false;
  const chain = new FailoverAIProvider([
    provider('gemini', async () => { throw new AIProviderError('Blocked', 422, 'CONTENT_BLOCKED'); }),
    provider('groq', async () => { calledBackup = true; return { message: 'Unexpected', provider: 'groq' }; }),
  ]);
  await assert.rejects(chain.generateText(input), (e: unknown) => e instanceof AIProviderError && e.status === 422);
  assert.equal(calledBackup, false);
});

test('The coaching HTTP response reports Groq and backup metadata', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  setMockAIProvider({ name: 'mock', generateCoachResponse: async () => ({ message: 'Live backup answer', sport: 'cricket', provider: 'groq', usedBackup: true }) });
  let status: number | undefined;
  let body: any;
  const res = { status: (value: number) => { status = value; return res; }, json: (value: unknown) => { body = value; return res; } };
  try {
    await CoachController.chat({ auth: { userId: 'ai-provider-test', email: 'test@example.invalid' }, body: coachInput, headers: {} } as Request, res as unknown as ExpressResponse);
    assert.equal(status, 200);
    assert.equal(body.provider, 'groq');
    assert.equal(body.usedBackup, true);
    assert.equal(body.isFallback, false);
  } finally {
    setMockAIProvider(null);
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});
