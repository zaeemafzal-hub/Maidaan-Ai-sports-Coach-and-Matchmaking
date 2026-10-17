import { api } from './api';
import { HubCourt, CourtStatus, Sport, HubDashboardSummary, HubVerificationStatus, HubOwnerProfile } from '../types';

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

export interface UpdateVenueProfilePayload {
  hubName?: string;
  contactNumber?: string;
  sports?: Sport[];
  location?: string;
}

export interface VerificationStatusResponse {
  id?: string;
  hubOwnerId?: string;
  status: HubVerificationStatus | 'NOT_SUBMITTED';
  submittedAt: string | null;
  reviewedAt: string | null;
  adminNote: string | null;
  isVerified?: boolean;
}

export const hubCourtService = {
  /**
   * GET /api/hub/dashboard
   * Fetch aggregated summary for the authenticated Hub Owner.
   */
  async getDashboardSummary(): Promise<HubDashboardSummary> {
    const res = await api.get<HubDashboardSummary>('/api/hub/dashboard');

    if (res.error || !res.data) {
      const err = new Error(res.error || 'Failed to fetch hub dashboard summary.');
      (err as any).status = res.status;
      throw err;
    }

    return res.data;
  },

  /**
   * GET /api/hub/verification
   * Fetch current verification status for the authenticated Hub Owner.
   */
  async getVerificationStatus(): Promise<VerificationStatusResponse> {
    const res = await api.get<VerificationStatusResponse>('/api/hub/verification');

    if (res.error || !res.data) {
      const err = new Error(res.error || 'Failed to fetch hub verification status.');
      (err as any).status = res.status;
      throw err;
    }

    return res.data;
  },

  /**
   * POST /api/hub/verification-request
   * Submit venue for official platform verification.
   */
  async submitVerificationRequest(): Promise<VerificationStatusResponse> {
    const res = await api.post<VerificationStatusResponse>('/api/hub/verification-request');

    if (res.error || !res.data) {
      const err = new Error(res.error || 'Failed to submit verification request.');
      (err as any).status = res.status;
      throw err;
    }

    return res.data;
  },

  /**
   * GET /api/hub/profile
   * Fetch venue profile of the authenticated Hub Owner.
   */
  async getVenueProfile(): Promise<HubOwnerProfile> {
    const res = await api.get<{ profile: HubOwnerProfile }>('/api/hub/profile');

    if (res.error || !res.data?.profile) {
      const err = new Error(res.error || 'Failed to fetch hub venue profile.');
      (err as any).status = res.status;
      throw err;
    }

    return res.data.profile;
  },

  /**
   * PATCH /api/hub/profile
   * Update mutable venue details (name, contact, location, sports).
   */
  async updateVenueProfile(payload: UpdateVenueProfilePayload): Promise<HubOwnerProfile> {
    const res = await api.patch<{ profile: HubOwnerProfile }>('/api/hub/profile', payload);

    if (res.error || !res.data?.profile) {
      const err = new Error(res.error || 'Failed to update hub venue profile.');
      (err as any).status = res.status;
      throw err;
    }

    return res.data.profile;
  },

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
