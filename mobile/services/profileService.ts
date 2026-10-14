import { api } from './api';
import { PlayerProfile, CaptainProfile, HubOwnerProfile, User } from '../types';

export interface ProfileUpdateResult<T> {
  success: boolean;
  profile: T;
  user: User;
}

export const profileService = {
  /**
   * Save or update Player profile during or after onboarding.
   */
  async savePlayerProfile(data: Omit<PlayerProfile, 'userId' | 'matchesPlayed'>): Promise<ProfileUpdateResult<PlayerProfile>> {
    const res = await api.put<ProfileUpdateResult<PlayerProfile>>('/api/profile/player', data);

    if (!res.data || res.error) {
      throw new Error(res.error || 'Failed to save player profile.');
    }

    return res.data;
  },

  /**
   * Save or update Captain profile during or after onboarding.
   */
  async saveCaptainProfile(data: Omit<CaptainProfile, 'userId'>): Promise<ProfileUpdateResult<CaptainProfile>> {
    const res = await api.put<ProfileUpdateResult<CaptainProfile>>('/api/profile/captain', data);

    if (!res.data || res.error) {
      throw new Error(res.error || 'Failed to save captain profile.');
    }

    return res.data;
  },

  /**
   * Save or update Hub Owner profile during or after onboarding.
   * isVerified is strictly controlled server-side.
   */
  async saveHubOwnerProfile(data: Omit<HubOwnerProfile, 'userId' | 'isVerified'>): Promise<ProfileUpdateResult<HubOwnerProfile>> {
    const res = await api.put<ProfileUpdateResult<HubOwnerProfile>>('/api/profile/hub', data);

    if (!res.data || res.error) {
      throw new Error(res.error || 'Failed to save hub profile.');
    }

    return res.data;
  },

  /**
   * Retrieve current user's profile.
   */
  async getMyProfile(): Promise<any> {
    const res = await api.get('/api/profile/me');

    if (!res.data || res.error) {
      throw new Error(res.error || 'Failed to retrieve profile.');
    }

    return res.data;
  },
};
