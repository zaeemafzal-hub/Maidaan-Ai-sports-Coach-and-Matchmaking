import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAssistantHistoryStore, assistantThreadKey } from '../../mobile/store/assistantHistoryCore';
import type { AssistantHistoryPage, SavedAssistantMessage } from '../../mobile/types/assistantHistory';

const deferred = <T>() => { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject}; };
const message = (id: string, role: 'user' | 'assistant', text = role, retry = 'turn1'): SavedAssistantMessage => ({id, role, text, clientMessageId: retry, details: {}, createdAt: new Date(1700000000000 + Number(id)).toISOString()});
function setup() {
  let account = 'alice';
  const cache = new Map<string, string>();
  let page: AssistantHistoryPage = {conversationId: 'conversation1', messages: [], nextBefore: null};
  const sent: string[] = [];
  const deps = {
    storage: {getItem: async (key: string) => cache.get(key) || null, setItem: async (key: string, value: string) => {cache.set(key, value);}},
    currentAccount: () => account,
    load: async () => page,
    send: async (_u: string, _a: string, _t: string, text: string, conversationId: string, retry: string) => {
      sent.push(retry);
      const userMessage = message('1', 'user', text, retry), assistantMessage = message('2', 'assistant', 'saved answer', retry);
      page = {...page, messages: [userMessage, assistantMessage]};
      return {conversationId, userMessage, assistantMessage};
    },
    clear: async () => {page = {conversationId: 'conversation2', messages: [], nextBefore: null};},
  };
  const history = createAssistantHistoryStore(deps);
  const thread = (topic = 'cricket', assistant: 'coach' | 'concierge' = 'coach') => history.store.getState().threads[assistantThreadKey(account, assistant, topic)];
  return {history, deps, cache, sent, thread, setAccount: (value: string) => {account = value; history.clearMemory();}, setPage: (value: AssistantHistoryPage) => {page = value;}};
}

test('reply survives screen unsubscribe and is restored on a different device without a cache', async () => {
  const f = setup();
  await f.history.load('alice', 'coach', 'cricket');
  const waiting = deferred<Awaited<ReturnType<typeof f.deps.send>>>();
  const original = f.deps.send;
  f.deps.send = (...args) => waiting.promise;
  const unsubscribe = f.history.store.subscribe(() => {});
  const request = f.history.send('alice', 'coach', 'cricket', 'How should I warm up?');
  unsubscribe(); // Navigating away does not cancel the request or its state.
  const id = f.thread().messages[0].clientMessageId;
  waiting.resolve(await original('alice', 'coach', 'cricket', 'How should I warm up?', 'conversation1', id));
  await request;
  assert.equal(f.thread().messages[1].text, 'saved answer');
  const secondDevice = createAssistantHistoryStore({...f.deps, storage: {getItem: async () => null, setItem: async () => {}}});
  await secondDevice.load('alice', 'coach', 'cricket');
  assert.equal(secondDevice.store.getState().threads['alice:coach:cricket'].messages[1].text, 'saved answer');
});

test('late replies cannot populate another account, including logout and re-login', async () => {
  const f = setup();
  await f.history.load('alice', 'coach', 'cricket');
  const waiting = deferred<Awaited<ReturnType<typeof f.deps.send>>>();
  f.deps.send = () => waiting.promise;
  const request = f.history.send('alice', 'coach', 'cricket', 'private question');
  f.setAccount('bob'); f.setAccount('alice');
  waiting.resolve({conversationId: 'conversation1', userMessage: message('1', 'user'), assistantMessage: message('2', 'assistant')});
  await request;
  assert.deepEqual(f.history.store.getState().threads, {});
});

test('storage failure still loads authoritative account history', async () => {
  const f = setup();
  f.deps.storage.getItem = async () => {throw new Error('storage unavailable');};
  f.setPage({conversationId: 'conversation1', messages: [message('1', 'user')], nextBefore: null});
  await f.history.load('alice', 'coach', 'cricket');
  assert.equal(f.thread().messages.length, 1);
  assert.equal(f.thread().error, null);
});

test('lost response recovers saved answer without creating another turn', async () => {
  const f = setup();
  await f.history.load('alice', 'coach', 'cricket');
  const original = f.deps.send;
  f.deps.send = async (...args) => {await original(...args); throw new Error('connection lost');};
  await f.history.send('alice', 'coach', 'cricket', 'warm up');
  assert.equal(f.thread().messages.length, 2);
  assert.equal(f.thread().failedTurn, null);
  assert.equal(f.sent.length, 1);
});

test('failed request retries using the same message identity without duplicate prompts', async () => {
  const f = setup();
  await f.history.load('alice', 'coach', 'cricket');
  const original = f.deps.send;
  f.deps.send = async () => {throw new Error('AI unavailable');};
  await f.history.send('alice', 'coach', 'cricket', 'warm up');
  const retry = f.thread().failedTurn!;
  assert.ok(retry.clientMessageId);
  f.deps.send = original;
  await f.history.send('alice', 'coach', 'cricket', retry.text, retry.clientMessageId);
  assert.equal(f.sent[0], retry.clientMessageId);
  assert.equal(f.thread().messages.filter(m => m.role === 'user').length, 1);
  assert.equal(f.thread().failedTurn, null);
});

test('sport-specific reset leaves other conversations intact and clears stale device history', async () => {
  const f = setup();
  await f.history.load('alice', 'coach', 'cricket');
  await f.history.send('alice', 'coach', 'cricket', 'cricket question');
  await f.history.load('alice', 'coach', 'padel');
  await f.history.reset('alice', 'coach', 'cricket');
  assert.equal(f.thread().messages.length, 0);
  assert.equal(f.thread().conversationId, 'conversation2');
  assert.equal(f.thread('padel').messages.length, 2);
});

test('pagination merges earlier messages while a late refresh preserves successful retries', async () => {
  const f = setup();
  f.setPage({conversationId: 'conversation1', messages: [message('3', 'user', 'later', 'turn2'), message('4', 'assistant', 'later answer', 'turn2')], nextBefore: '3'});
  await f.history.load('alice', 'coach', 'cricket');
  f.setPage({conversationId: 'conversation1', messages: [message('1', 'user'), message('2', 'assistant')], nextBefore: null});
  await f.history.load('alice', 'coach', 'cricket', true);
  assert.deepEqual(f.thread().messages.map(m => m.id), ['1','2','3','4']);
  assert.equal(f.thread().nextBefore, null);
  f.setPage({conversationId: 'conversation1', messages: [{...message('4', 'assistant', 'stale error', 'turn2'), details: {error: true}}], nextBefore: null});
  await f.history.load('alice', 'coach', 'cricket');
  assert.equal(f.thread().messages.at(-1)?.text, 'later answer');
});

test('concurrent loads deduplicate and cold restart restores offline cached messages and drafts', async () => {
  const f = setup();
  await f.history.load('alice', 'coach', 'cricket');
  await f.history.send('alice', 'coach', 'cricket', 'warm up');
  f.history.setDraft('alice', 'coach', 'cricket', 'next question');
  await new Promise(resolve => setTimeout(resolve, 0));
  f.history.clearMemory();
  let count = 0;
  f.deps.load = async () => {count++; throw new Error('offline');};
  await Promise.all([f.history.load('alice', 'coach', 'cricket'), f.history.load('alice', 'coach', 'cricket')]);
  assert.equal(count, 1);
  assert.equal(f.thread().messages.length, 2);
  assert.equal(f.thread().draft, 'next question');
  assert.equal(f.thread().error, 'offline');
});
