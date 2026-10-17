export type AppDataMode = 'production' | 'development' | 'demo' | 'test';

/**
 * Resolves current authoritative mobile data mode.
 * Priority:
 * 1. process.env.EXPO_PUBLIC_APP_DATA_MODE ('production' | 'development' | 'demo' | 'test')
 * 2. __DEV__ ? 'development' : 'production'
 */
export function getAppDataMode(): AppDataMode {
  const envMode = (
    process.env.EXPO_PUBLIC_APP_DATA_MODE ||
    process.env.APP_DATA_MODE ||
    ''
  ).toLowerCase().trim();

  if (envMode === 'production' || envMode === 'development' || envMode === 'demo' || envMode === 'test') {
    return envMode as AppDataMode;
  }

  // __DEV__ is true in Expo development runtime
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return 'development';
  }

  return 'production';
}

export const isProduction = (): boolean => getAppDataMode() === 'production';
export const isDevelopment = (): boolean => getAppDataMode() === 'development';
export const isDemo = (): boolean => getAppDataMode() === 'demo';
export const isTest = (): boolean => getAppDataMode() === 'test';

export const allowsSyntheticAuth = (): boolean => isTest();
