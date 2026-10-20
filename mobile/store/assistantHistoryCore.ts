import { createStore } from 'zustand/vanilla';
import type { AssistantKind, AssistantHistoryPage, SavedAssistantMessage } from '../types/assistantHistory';
import type { CoachConversationMessage, CoachSport } from '../types';
import type { CaptainActionSummary } from '../services/agentService';

interface TurnResult {
  conversationId: string;
  userMessage: SavedAssistantMessage;
  assistantMessage: SavedAssistantMessage;
}
interface HistoryDependencies {
  storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
  currentAccount(): string | null;
  load(userId: string, assistant: AssistantKind, topic: string, before?: string): Promise<AssistantHistoryPage>;
  send(userId: string, assistant: AssistantKind, topic: string, text: string, conversationId: string, clientMessageId: string, context: CoachConversationMessage[]): Promise<TurnResult>;
  clear(userId: string, assistant: AssistantKind, topic: string, conversationId: string): Promise<void>;
}

export interface AssistantThreadState {
  conversationId: string | null;
  messages: SavedAssistantMessage[];
  nextBefore: string | null;
  hydrated: boolean;
  loading: boolean;
  sending: boolean;
  clearing: boolean;
  draft: string;
  error: string | null;
  failedTurn: { text: string; clientMessageId: string } | null;
}
export const EMPTY_ASSISTANT_THREAD: AssistantThreadState = {
  conversationId: null, messages: [], nextBefore: null, hydrated: false, loading: false,
  sending: false, clearing: false, draft: '', error: null, failedTurn: null,
};
export const assistantThreadKey = (userId: string, assistant: AssistantKind, topic: string) => `${userId}:${assistant}:${topic}`;
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Unable to sync this conversation. Please try again.';
const messageKey = (message: SavedAssistantMessage) => `${message.clientMessageId}:${message.role}`;

function mergeMessages(...groups: SavedAssistantMessage[][]): SavedAssistantMessage[] {
  const messages = new Map<string, SavedAssistantMessage>();
  for (const group of groups) for (const message of group) {
    const key = messageKey(message), previous = messages.get(key);
    // A delayed refresh must not replace a successful retry with its earlier error.
    if (previous?.role === 'assistant' && !previous.details.error && message.details.error) continue;
    const terminal = previous?.details.action && !['DRAFT', 'AWAITING_CONFIRMATION'].includes(previous.details.action.status);
    const pending = message.details.action && ['DRAFT', 'AWAITING_CONFIRMATION'].includes(message.details.action.status);
    messages.set(key, terminal && pending ? {...message, details: {...message.details, action: previous.details.action}} : message);
  }
  return [...messages.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) ||
    (a.id.startsWith('pending-') || b.id.startsWith('pending-') ? 0 : Number(a.id) - Number(b.id)));
}

function failedTurn(messages: SavedAssistantMessage[]) {
  const last = messages.at(-1);
  if (!last) return null;
  if (last.details.error) {
    const prompt = messages.find(message => message.role === 'user' && message.clientMessageId === last.clientMessageId);
    return prompt ? {text: prompt.text, clientMessageId: prompt.clientMessageId} : null;
  }
  if (last.role === 'user' && Date.now() - Date.parse(last.createdAt) > 120_000) return {text: last.text, clientMessageId: last.clientMessageId};
  return null;
}

/** Shared by screen instances; requests and account history outlive navigation. */
export function createAssistantHistoryStore(deps: HistoryDependencies) {
  const store = createStore<{threads: Record<string, AssistantThreadState>; sports: Record<string, CoachSport>}>(() => ({threads: {}, sports: {}}));
  const loads = new Map<string, Promise<void>>();
  const writes = new Map<string, Promise<void>>();
  const touchedSports = new Set<string>();
  let generation = 0;
  const keyFor = assistantThreadKey;
  const current = (userId: string, expectedGeneration = generation) => deps.currentAccount() === userId && generation === expectedGeneration;
  const read = (key: string) => store.getState().threads[key] || EMPTY_ASSISTANT_THREAD;
  const change = (key: string, patch: Partial<AssistantThreadState>) => store.setState(state => ({threads: {...state.threads, [key]: {...read(key), ...patch}}}));
  const cacheKey = (key: string) => 'maidaan.assistant-history.v1:' + key;
  const save = (key: string) => {
    const thread = read(key), trimmed = thread.messages.slice(-100);
    const cached = JSON.stringify({conversationId: thread.conversationId, messages: trimmed,
      nextBefore: thread.messages.length > 100 ? trimmed[0]?.id : thread.nextBefore, draft: thread.draft});
    const write = (writes.get(key) || Promise.resolve()).then(() => deps.storage.setItem(cacheKey(key), cached)).catch(() => {
      // Account history remains authoritative if device storage is unavailable.
    });
    writes.set(key, write);
  };

  const load = (userId: string, assistant: AssistantKind, topic: string, older = false): Promise<void> => {
    if (!current(userId)) return Promise.resolve();
    const key = keyFor(userId, assistant, topic);
    const sessionGeneration = generation;
    const existing = loads.get(key);
    if (existing) return existing;
    const task = (async () => {
      change(key, {loading: true});
      try {
        if (!read(key).hydrated) {
          await writes.get(key);
          const raw = await deps.storage.getItem(cacheKey(key)).catch(() => null);
          if (!current(userId, sessionGeneration)) return;
          if (raw) {
            try {
              const cache = JSON.parse(raw);
              if (typeof cache.conversationId === 'string' && Array.isArray(cache.messages)) {
                const messages = cache.messages.filter((m: SavedAssistantMessage) => m && typeof m.id === 'string' && typeof m.clientMessageId === 'string' && ['user','assistant'].includes(m.role) && typeof m.text === 'string' && typeof m.createdAt === 'string' && m.details && typeof m.details === 'object');
                change(key, {conversationId: cache.conversationId, messages, nextBefore: typeof cache.nextBefore === 'string' ? cache.nextBefore : null, draft: typeof cache.draft === 'string' ? cache.draft : ''});
              }
            } catch { /* A damaged cache must not prevent restoring account history. */ }
          }
          change(key, {hydrated: true});
        }
        const before = older ? read(key).nextBefore || undefined : undefined;
        if (older && !before) return;
        const page = await deps.load(userId, assistant, topic, before);
        if (!current(userId, sessionGeneration)) return;
        const previous = read(key), same = !previous.conversationId || previous.conversationId === page.conversationId;
        const messages = same ? mergeMessages(previous.messages, page.messages) : page.messages;
        change(key, {conversationId: page.conversationId, messages,
          nextBefore: older || !same || !previous.messages.length ? page.nextBefore : previous.nextBefore || page.nextBefore,
          error: null, failedTurn: failedTurn(messages), ...(!same ? {sending: false, draft: ''} : {})});
        save(key);
      } catch (error) {
        if (current(userId, sessionGeneration)) change(key, {hydrated: true, error: errorText(error)});
      } finally {
        if (current(userId, sessionGeneration)) change(key, {loading: false});
      }
    })();
    loads.set(key, task);
    void task.finally(() => { if (loads.get(key) === task) loads.delete(key); });
    return task;
  };

  const send = async (userId: string, assistant: AssistantKind, topic: string, text: string, retryId?: string) => {
    if (!current(userId)) return;
    const key = keyFor(userId, assistant, topic), thread = read(key), trimmed = text.trim();
    const sessionGeneration = generation;
    if (!trimmed || thread.sending || thread.clearing || thread.loading) return;
    if (trimmed.length > 1500) { change(key, {error: 'Please shorten your question to 1500 characters.'}); return; }
    if (!thread.conversationId) { await load(userId, assistant, topic); return; }
    const id = retryId || `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    const conversationId = thread.conversationId;
    const context = thread.messages.filter(message => !message.details.error && message.clientMessageId !== id).slice(-10).map(message => ({role: message.role, content: message.text.slice(0, 1500)}));
    const optimistic: SavedAssistantMessage = {id: 'pending-' + id, clientMessageId: id, role: 'user', text: trimmed, details: {}, createdAt: new Date().toISOString()};
    const retained = thread.messages.filter(message => !(message.clientMessageId === id && message.details.error));
    change(key, {messages: mergeMessages(retained, retryId ? [] : [optimistic]), draft: '', sending: true, error: null, failedTurn: null});
    save(key);
    try {
      const result = await deps.send(userId, assistant, topic, trimmed, conversationId, id, context);
      if (!current(userId, sessionGeneration)) return;
      if (read(key).conversationId !== result.conversationId) return;
      change(key, {messages: mergeMessages(read(key).messages, [result.userMessage, result.assistantMessage]), error: null, failedTurn: null});
      save(key);
    } catch (error) {
      if (current(userId, sessionGeneration) && read(key).conversationId === conversationId) {
        change(key, {error: errorText(error), failedTurn: {text: trimmed, clientMessageId: id}});
        // Recover the saved user turn/error, including an answer whose HTTP response was lost.
        await load(userId, assistant, topic);
        if (current(userId, sessionGeneration) && read(key).conversationId === conversationId &&
            !read(key).messages.some(message => message.clientMessageId === id && message.role === 'assistant' && !message.details.error)) {
          change(key, {error: errorText(error), failedTurn: {text: trimmed, clientMessageId: id}});
        }
      }
    } finally {
      if (current(userId, sessionGeneration) && read(key).conversationId === conversationId) change(key, {sending: false});
    }
  };

  return {
    store, load, send,
    setDraft(userId: string, assistant: AssistantKind, topic: string, draft: string) {
      if (!current(userId)) return;
      const key = keyFor(userId, assistant, topic); change(key, {draft}); save(key);
    },
    async reset(userId: string, assistant: AssistantKind, topic: string) {
      const sessionGeneration = generation;
      const key = keyFor(userId, assistant, topic), thread = read(key);
      if (!current(userId) || !thread.conversationId || thread.sending || thread.loading || thread.clearing) return;
      change(key, {clearing: true, error: null});
      try {
        await deps.clear(userId, assistant, topic, thread.conversationId);
        if (!current(userId, sessionGeneration)) return;
        change(key, {...EMPTY_ASSISTANT_THREAD, hydrated: true, clearing: true}); save(key);
        await load(userId, assistant, topic);
      } catch (error) { if (current(userId, sessionGeneration)) change(key, {error: errorText(error)}); }
      finally { if (current(userId, sessionGeneration)) change(key, {clearing: false}); }
    },
    updateAction(userId: string, messageId: string, action: CaptainActionSummary) {
      if (!current(userId)) return;
      const key = keyFor(userId, 'concierge', 'main');
      change(key, {messages: read(key).messages.map(message => message.id === messageId ? {...message, details: {...message.details, action}} : message)}); save(key);
    },
    async loadSport(userId: string, fallback: CoachSport) {
      const sessionGeneration = generation;
      const raw = await deps.storage.getItem('maidaan.assistant-sport.v1:' + userId).catch(() => null);
      if (!current(userId, sessionGeneration) || touchedSports.has(userId)) return;
      const sport = ['cricket','football','padel','badminton'].includes(raw || '') ? raw as CoachSport : fallback;
      store.setState(state => ({sports: {...state.sports, [userId]: sport}}));
    },
    setSport(userId: string, sport: CoachSport) {
      if (!current(userId)) return;
      touchedSports.add(userId);
      store.setState(state => ({sports: {...state.sports, [userId]: sport}}));
      void deps.storage.setItem('maidaan.assistant-sport.v1:' + userId, sport).catch(() => {});
    },
    clearMemory() { generation++; loads.clear(); touchedSports.clear(); store.setState({threads: {}, sports: {}}); },
  };
}
