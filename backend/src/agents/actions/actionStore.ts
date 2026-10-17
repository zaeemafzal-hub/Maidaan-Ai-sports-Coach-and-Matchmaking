import { CaptainActionDraft, CaptainExecutionResult } from './types.js';

export const ACTION_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Lightweight, in-memory pending action store for the FYP prototype.
 * Actions are server-generated, bound to authenticated user IDs, and subject to short TTL.
 * Documented as non-durable in-memory storage suitable for demonstration and academic evaluation.
 */
class ActionStore {
  private actions = new Map<string, CaptainActionDraft>();

  saveAction(draft: CaptainActionDraft): void {
    this.actions.set(draft.actionId, draft);
  }

  getAction(actionId: string): CaptainActionDraft | null {
    const action = this.actions.get(actionId);
    if (!action) return null;

    // Check expiry
    const now = Date.now();
    const expiry = new Date(action.expiresAt).getTime();
    if (now > expiry && action.status === 'AWAITING_CONFIRMATION') {
      action.status = 'EXPIRED';
      this.actions.set(actionId, action);
    }

    return action;
  }

  getLatestPendingAction(userId: string): CaptainActionDraft | null {
    const now = Date.now();
    const userActions = Array.from(this.actions.values())
      .filter((a) => a.userId === userId && a.status === 'AWAITING_CONFIRMATION')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    for (const a of userActions) {
      if (now > new Date(a.expiresAt).getTime()) {
        a.status = 'EXPIRED';
        this.actions.set(a.actionId, a);
      } else {
        return a;
      }
    }

    return null;
  }

  cancelAction(actionId: string, userId: string): boolean {
    const action = this.actions.get(actionId);
    if (!action || action.userId !== userId) return false;
    if (action.status !== 'AWAITING_CONFIRMATION') return false;

    action.status = 'CANCELLED';
    this.actions.set(actionId, action);
    return true;
  }

  markExecuted(actionId: string, result: CaptainExecutionResult): void {
    const action = this.actions.get(actionId);
    if (!action) return;

    action.status = 'EXECUTED';
    action.executionResult = result;
    this.actions.set(actionId, action);
  }

  clearStore(): void {
    this.actions.clear();
  }
}

export const actionStore = new ActionStore();
