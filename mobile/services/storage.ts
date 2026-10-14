import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'maidaan_auth_token';

// In-memory fallback if AsyncStorage fails or during SSR
let memoryToken: string | null = null;

export const AuthStorage = {
  async getToken(): Promise<string | null> {
    try {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored) return stored;
    } catch {
      // Fallback to memory
    }
    return memoryToken;
  },

  async setToken(token: string): Promise<void> {
    memoryToken = token;
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Memory fallback preserved
    }
  },

  async removeToken(): Promise<void> {
    memoryToken = null;
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
      // Memory fallback preserved
    }
  },
};
