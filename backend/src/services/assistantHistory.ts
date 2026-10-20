import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../lib/supabase.js';
import { isTest } from '../config/runtime.js';
import { actionStore } from '../agents/actions/actionStore.js';

export type AssistantKind = 'coach' | 'concierge';
export class HistoryError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}
export function validateThread(assistant: unknown, topic: unknown): asserts assistant is AssistantKind {
  if (!((assistant === 'coach' && ['cricket', 'football', 'badminton', 'padel'].includes(String(topic))) ||
      (assistant === 'concierge' && topic === 'main'))) throw new HistoryError('Invalid assistant conversation.', 400);
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pending = new Map<string, { message: string; result: Promise<any> }>();

function databaseError(error: unknown): never {
  // Do not log private prompts, replies or database query payloads.
  const code = (error as {code?: string})?.code;
  throw new HistoryError(code === '23503' ? 'This conversation was cleared. Please reopen it.' :
    'Conversation history could not be saved. Please try again.', code === '23503' ? 409 : 503);
}

async function conversation(userId: string, assistant: AssistantKind, topic: string, expectedId?: string) {
  validateThread(assistant, topic);
  if (expectedId && !uuid.test(expectedId)) throw new HistoryError('Invalid conversation ID.', 400);
  let query = supabaseAdmin.from('assistant_conversations').select('id').eq('user_id', userId).eq('assistant', assistant).eq('topic', topic);
  if (expectedId) query = query.eq('id', expectedId);
  const found = await query.maybeSingle();
  if (found.error) databaseError(found.error);
  if (found.data) return found.data.id as string;
  if (expectedId) throw new HistoryError('This conversation was cleared. Please reopen it.', 409);
  const inserted = await supabaseAdmin.from('assistant_conversations').upsert({ user_id: userId, assistant, topic }, {onConflict: 'user_id,assistant,topic', ignoreDuplicates: true});
  if (inserted.error) databaseError(inserted.error);
  const read = await supabaseAdmin.from('assistant_conversations').select('id').eq('user_id', userId).eq('assistant', assistant).eq('topic', topic).single();
  if (read.error || !read.data) databaseError(read.error);
  return read.data.id as string;
}

function savedMessage(row: any) {
  const details = { ...row.details };
  delete details.response;
  const action = details.action;
  if (action && ['DRAFT', 'AWAITING_CONFIRMATION'].includes(action.status)) {
    const live = actionStore.getAction(action.actionId);
    // Restoring a card never recreates an expired or lost in-memory action.
    details.action = live && live.userId === row.user_id
      ? { ...action, status: live.status, executionResult: live.executionResult || null }
      : { ...action, status: 'EXPIRED' };
  }
  return { id: String(row.id), clientMessageId: row.client_message_id, role: row.role,
    text: row.message, details, createdAt: row.created_at };
}

export async function getAssistantHistory(userId: string, assistant: AssistantKind, topic: string, before?: string) {
  const conversationId = await conversation(userId, assistant, topic);
  if (before && !/^\d{1,18}$/.test(before)) throw new HistoryError('Invalid history cursor.', 400);
  let query = supabaseAdmin.from('assistant_messages').select('*').eq('user_id', userId).eq('conversation_id', conversationId).order('id', {ascending: false}).limit(101);
  if (before) query = query.lt('id', before);
  const result = await query;
  if (result.error) databaseError(result.error);
  const rows = (result.data || []).slice(0, 100);
  return { conversationId, messages: rows.map(savedMessage).reverse(), nextBefore: result.data!.length > 100 ? String(rows.at(-1)!.id) : null };
}

export async function clearAssistantHistory(userId: string, assistant: AssistantKind, topic: string, expectedId: unknown) {
  if (typeof expectedId !== 'string') throw new HistoryError('Conversation ID is required.', 400);
  const id = await conversation(userId, assistant, topic, expectedId);
  const result = await supabaseAdmin.from('assistant_conversations').delete().eq('id', id).eq('user_id', userId);
  if (result.error) databaseError(result.error);
  return {success: true};
}

interface TurnInput {
  userId: string; assistant: AssistantKind; topic: string; message: string;
  clientMessageId?: unknown; conversationId?: unknown;
}

/** Persist on the server even when the client leaves the screen during generation. */
export async function runAssistantTurn(input: TurnInput, generate: () => Promise<Record<string, any>>): Promise<any> {
  // Existing isolated AI tests intentionally use synthetic users with no database.
  if (isTest() && input.clientMessageId === undefined) return generate();
  const clientId = input.clientMessageId ?? randomUUID();
  if (typeof clientId !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(clientId)) throw new HistoryError('Invalid message retry ID.', 400);
  if (input.conversationId !== undefined && typeof input.conversationId !== 'string') throw new HistoryError('Invalid conversation ID.', 400);
  const key = `${input.userId}:${input.assistant}:${input.topic}:${input.conversationId || ''}:${clientId}`;
  const running = pending.get(key);
  if (running) {
    if (running.message !== input.message) throw new HistoryError('Message retry ID already used.', 409);
    return running.result;
  }
  const run = (async () => {
    const id = await conversation(input.userId, input.assistant, input.topic, input.conversationId as string | undefined);
    const prior = await supabaseAdmin.from('assistant_messages').select('*').eq('conversation_id', id).eq('user_id', input.userId).eq('client_message_id', clientId);
    if (prior.error) databaseError(prior.error);
    const oldUser = prior.data?.find(row => row.role === 'user');
    if (oldUser && oldUser.message !== input.message) throw new HistoryError('Message retry ID already used.', 409);
    const oldReply = prior.data?.find(row => row.role === 'assistant' && !row.details?.error);
    if (oldReply && oldUser) return { ...oldReply.details.response, history: {conversationId: id, userMessage: savedMessage(oldUser), assistantMessage: savedMessage(oldReply)} };

    const userResult = await supabaseAdmin.from('assistant_messages').upsert({conversation_id: id, user_id: input.userId, client_message_id: clientId, role: 'user', message: input.message}, {onConflict: 'conversation_id,client_message_id,role', ignoreDuplicates: true});
    if (userResult.error) databaseError(userResult.error);
    try {
      const response = await generate();
      const details = input.assistant === 'concierge'
        ? { intent: response.intent, toolResult: response.data || response.toolResult, action: response.action || null, sources: response.sources || null, response }
        : { response };
      const written = await supabaseAdmin.from('assistant_messages').upsert({conversation_id: id, user_id: input.userId, client_message_id: clientId, role: 'assistant', message: response.message, details}, {onConflict: 'conversation_id,client_message_id,role'}).select().single();
      if (written.error) databaseError(written.error);
      const user = await supabaseAdmin.from('assistant_messages').select('*').eq('conversation_id', id).eq('user_id', input.userId).eq('client_message_id', clientId).eq('role', 'user').single();
      if (user.error) databaseError(user.error);
      return { ...response, history: { conversationId: id, userMessage: savedMessage(user.data), assistantMessage: savedMessage(written.data) } };
    } catch (error) {
      if (error instanceof HistoryError) throw error;
      // Keep a failed turn visible and retryable without treating an error as coaching.
      const message = error instanceof Error ? error.message : 'The assistant is temporarily unavailable.';
      const failed = await supabaseAdmin.from('assistant_messages').upsert({conversation_id: id, user_id: input.userId, client_message_id: clientId, role: 'assistant', message: message.slice(0, 30000), details: {error: true}}, {onConflict: 'conversation_id,client_message_id,role'});
      if (failed.error) console.warn('[AssistantHistory] Could not save failed turn.');
      throw error;
    }
  })();
  pending.set(key, {message: input.message, result: run});
  try { return await run; } finally { pending.delete(key); }
}

/** Keep completed action cards terminal across reloads and backend restarts. */
export async function saveActionHistory(userId: string, actionId: string): Promise<void> {
  try {
  if (isTest()) return;
  const live = actionStore.getAction(actionId);
  if (!live || live.userId !== userId) return;
  const result = await supabaseAdmin.from('assistant_messages').select('id,details').eq('user_id', userId).eq('details->action->>actionId', actionId);
  if (result.error) { console.warn('[AssistantHistory] Could not refresh action history.'); return; }
  for (const row of result.data || []) {
    const action = {...row.details.action, status: live.status, executionResult: live.executionResult || null};
    const details = {...row.details, action, response: {...row.details.response, action}};
    const updated = await supabaseAdmin.from('assistant_messages').update({details}).eq('id', row.id).eq('user_id', userId);
    if (updated.error) console.warn('[AssistantHistory] Could not save action status.');
  }
  } catch {
    // An already executed action must never appear to fail because syncing its card failed.
    console.warn('[AssistantHistory] Could not sync action history.');
  }
}
