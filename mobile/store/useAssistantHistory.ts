import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStore } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { useAuthStore } from './useAuthStore';
import { assistantThreadKey, createAssistantHistoryStore, EMPTY_ASSISTANT_THREAD } from './assistantHistoryCore';
import type { AssistantKind, AssistantHistoryPage, SavedAssistantMessage } from '../types/assistantHistory';

interface TurnEnvelope {
  history: {conversationId: string; userMessage: SavedAssistantMessage; assistantMessage: SavedAssistantMessage};
}
export const assistantHistory = createAssistantHistoryStore({
  storage: AsyncStorage,
  currentAccount: () => useAuthStore.getState().currentUser?.id || null,
  async load(userId, assistant, topic, before) {
    const path = `/api/assistant-history/${assistant}?topic=${encodeURIComponent(topic)}${before ? '&before=' + encodeURIComponent(before) : ''}`;
    const result = await api.request<AssistantHistoryPage>(path, {expectedUserId: userId});
    if (result.status !== 200 || !result.data) throw new Error(result.error || 'Unable to restore conversation history.');
    return result.data;
  },
  async send(userId, assistant, topic, message, conversationId, clientMessageId, context) {
    const result = await api.request<TurnEnvelope>(assistant === 'coach' ? '/api/coach/chat' : '/api/agent/chat', {
      method: 'POST', expectedUserId: userId,
      body: {message, conversationId, clientMessageId, ...(assistant === 'coach' ? {sport: topic, conversation: context} : {})},
    });
    if (result.status !== 200 || !result.data?.history) throw new Error(result.error || 'Unable to save the assistant reply. Please retry.');
    return result.data.history;
  },
  async clear(userId, assistant, topic, conversationId) {
    const result = await api.request(`/api/assistant-history/${assistant}?topic=${encodeURIComponent(topic)}`, {
      method: 'DELETE', expectedUserId: userId, body: {conversationId},
    });
    if (result.status !== 200) throw new Error(result.error || 'Unable to clear this conversation.');
  },
});

// Clear visible state immediately on account changes; each cache key remains user-specific.
useAuthStore.subscribe((next, previous) => {
  if (next.currentUser?.id !== previous.currentUser?.id) assistantHistory.clearMemory();
});

export function useAssistantThread(userId: string | undefined, assistant: AssistantKind, topic: string) {
  const key = userId ? assistantThreadKey(userId, assistant, topic) : '';
  const thread = useStore(assistantHistory.store, state => state.threads[key] || EMPTY_ASSISTANT_THREAD);
  const [focused, setFocused] = useState(false);
  useFocusEffect(React.useCallback(() => {
    setFocused(true);
    if (!userId) return;
    void assistantHistory.load(userId, assistant, topic);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void assistantHistory.load(userId, assistant, topic);
    });
    return () => { setFocused(false); subscription.remove(); };
  }, [userId, assistant, topic]));

  const last = thread.messages.at(-1);
  useEffect(() => {
    if (!focused || !userId || thread.loading || thread.sending || last?.role !== 'user' || Date.now() - Date.parse(last.createdAt) > 120_000) return;
    const timeout = setTimeout(() => { void assistantHistory.load(userId, assistant, topic); }, 5000);
    return () => clearTimeout(timeout);
  }, [focused, userId, assistant, topic, thread.loading, thread.sending, last?.id, last?.role, last?.createdAt]);
  return thread;
}
