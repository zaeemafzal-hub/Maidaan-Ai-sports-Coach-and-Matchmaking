import { api } from './api';
import { HubCourt, CourtStatus, Sport } from '../types';

export interface CreateHubCourtPayload {
  name: string;
  sport: Sport;
  status?: CourtStatus;
}

export interface UpdateHubCourtPayload {
  name?: string;
  sport?: Sport;
  status?: CourtStatus;
}

export const hubCourtService = {
  /**
   * GET /api/hub/courts
   * Fetch all courts registered by the authenticated hub owner.
   */
  async getCourts(): Promise<HubCourt[]> {
    const res = await api.get<{ courts: HubCourt[] }>('/api/hub/courts');

    if (res.error || !res.data) {
      const err = new Error(res.error || 'Failed to fetch hub courts.');
      (err as any).status = res.status;
      throw err;
    }

    return Array.isArray(res.data.courts) ? res.data.courts : [];
  },

  /**
   * POST /api/hub/courts
   * Register a new court under the authenticated hub owner.
   */
  async createCourt(payload: CreateHubCourtPayload): Promise<HubCourt> {
    const res = await api.post<{ court: HubCourt }>('/api/hub/courts', payload);

    if (res.error || !res.data || !res.data.court) {
      const err = new Error(res.error || 'Failed to create court.');
      (err as any).status = res.status;
      throw err;
    }

    return res.data.court;
  },

  /**
   * PATCH /api/hub/courts/:id
   * Update court attributes (name, sport, status).
   */
  async updateCourt(id: string, payload: UpdateHubCourtPayload): Promise<HubCourt> {
    const res = await api.patch<{ court: HubCourt }>(`/api/hub/courts/${id}`, payload);

    if (res.error || !res.data || !res.data.court) {
      const err = new Error(res.error || 'Failed to update court.');
      (err as any).status = res.status;
      throw err;
    }

    return res.data.court;
  },

  /**
   * DELETE /api/hub/courts/:id
   * Delete a court owned by the authenticated hub owner.
   */
  async deleteCourt(id: string): Promise<boolean> {
    const res = await api.delete<{ success: boolean; message?: string }>(`/api/hub/courts/${id}`);

    if (res.error || !res.data) {
      const err = new Error(res.error || 'Failed to delete court.');
      (err as any).status = res.status;
      throw err;
    }

    return res.data.success ?? true;
  },
};
