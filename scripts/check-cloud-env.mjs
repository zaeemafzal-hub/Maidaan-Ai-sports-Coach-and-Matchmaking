/** Validate cloud builds before publishing a bundle that points at a laptop. */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export function validateCloudEnvironment(env) {
  const missing = [
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ].filter((key) => !env[key]?.trim());
  if (missing.length) throw new Error('Set cloud build variables: ' + missing.join(', '));
  for (const key of ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SOCKET_URL']) {
    if (!env[key]?.trim()) continue;
    let url;
    try { url = new URL(env[key]); } catch { throw new Error(key + ' must be a public HTTPS URL.'); }
    const host = url.hostname.toLowerCase();
    const local = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(host);
    if (url.protocol !== 'https:' || local || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error(key + ' must be a public HTTPS origin without a path or credentials.');
    }
  }
  if (env.EXPO_PUBLIC_APP_DATA_MODE !== 'production') {
    throw new Error('Cloud builds require EXPO_PUBLIC_APP_DATA_MODE=production.');
  }
  if (env.EXPO_PUBLIC_API_TIMEOUT_MS &&
      (!Number.isFinite(Number(env.EXPO_PUBLIC_API_TIMEOUT_MS)) || Number(env.EXPO_PUBLIC_API_TIMEOUT_MS) < 1000 || Number(env.EXPO_PUBLIC_API_TIMEOUT_MS) > 120000)) {
    throw new Error('EXPO_PUBLIC_API_TIMEOUT_MS must be between 1000 and 120000.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const developmentBuild = process.argv.includes('--eas') &&
    !['preview', 'production'].includes(process.env.EAS_BUILD_PROFILE);
  if (!developmentBuild) {
    validateCloudEnvironment(process.env);
    console.log('Cloud configuration validated; public HTTPS backend configured.');
  }
}
