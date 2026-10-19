import dotenv from 'dotenv';
dotenv.config();

export type AppDataMode = 'production' | 'development' | 'demo' | 'test';

/**
 * Resolves current authoritative application data mode.
 * Priority:
 * 1. NODE_ENV === 'production' -> strictly 'production' (cannot downgrade via APP_DATA_MODE)
 * 2. NODE_ENV === 'test' -> strictly 'test'
 * 3. APP_DATA_MODE ('production' | 'development' | 'demo' | 'test')
 * 4. Default -> 'development'
 */
export function getAppDataMode(): AppDataMode {
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.NODE_ENV === 'test') {
    return 'test';
  }

  const rawMode = (process.env.APP_DATA_MODE || '').toLowerCase().trim();
  if (rawMode === 'production' || rawMode === 'development' || rawMode === 'demo' || rawMode === 'test') {
    return rawMode as AppDataMode;
  }

  if (rawMode) throw new Error('Invalid APP_DATA_MODE. Use development, demo, test or production.');

  return 'development';
}

export const isProduction = (): boolean => getAppDataMode() === 'production';
export const isDevelopment = (): boolean => getAppDataMode() === 'development';
export const isDemo = (): boolean => getAppDataMode() === 'demo';
export const isTest = (): boolean => getAppDataMode() === 'test';

/**
 * Synthetic test authentication tokens (test_token:...) are strictly permitted
 * ONLY in test mode (NODE_ENV=test or APP_DATA_MODE=test).
 * Rejected with 401 Unauthorized in production, development, and demo.
 */
export const allowsSyntheticAuth = (): boolean => isTest();

/**
 * In-memory repository stores are strictly forbidden in production.
 */
export const allowsMemoryStores = (): boolean => isTest();

/**
 * Validates that production configuration meets all strict production invariants.
 * Throws a fatal error if live database configuration is missing.
 */
export function validateProductionInvariants(isSupabaseConfigured: boolean): void {
  if (isProduction()) {
    if (!isSupabaseConfigured) {
      throw new Error(
        '[FATAL PRODUCTION INVARIANT VIOLATION] Maidaan is configured with APP_DATA_MODE=production but valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured. Refusing to run in fallback mode.'
      );
    }
  }
}
