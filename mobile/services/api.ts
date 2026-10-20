import { resolveBackendUrl } from '../utils/backendUrl';
import Constants from 'expo-constants';
import { AuthStorage } from './storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Dynamically extract dev host IP from Expo debugger host / hostUri.
 * This guarantees the mobile app always talks to the machine serving the Expo bundle,
 * regardless of whether the user is on home Wi-Fi, mobile hotspot, or campus network.
 */
export const getDevHost = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  return null;
};

export const getBaseUrl = (): string => {
  return resolveBackendUrl(process.env.EXPO_PUBLIC_API_URL, typeof window !== 'undefined' ? window.location : undefined, getDevHost(), typeof __DEV__ !== 'undefined' && __DEV__);
};

class ApiClient {
  getBaseUrl(): string {
    return getBaseUrl();
  }

  private async getHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...customHeaders,
    };

    let token: string | null = null;
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          token = data.session.access_token;
        }
      } catch {
        // ignore
      }
    }

    if (!token) {
      token = await AuthStorage.getToken();
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: unknown;
      headers?: Record<string, string>;
      _isRetry?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    const method = options.method || 'GET';
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${path}`;

    // Use AbortController timeout to guarantee requests never hang mobile UI indefinitely
    const controller = new AbortController();
    // Concierge can classify first, then try both coaching providers.
    const defaultTimeoutMs = path.startsWith('/api/coach/') || path.startsWith('/api/agent/') ? 65000 : path.includes('/checkout') ? 70000 : path === '/api/hub/photos' || path === '/api/profile/player/photo' ? 25000 : 15000;
    // A free hosted server can take longer to wake after being idle.
    const configuredTimeoutMs = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS);
    const timeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs >= 1000
      ? Math.max(defaultTimeoutMs, Math.min(configuredTimeoutMs, 120000))
      : defaultTimeoutMs;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = await this.getHeaders(options.headers);
      const config: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (options.body !== undefined && method !== 'GET') {
        config.body = JSON.stringify(options.body);
      }

      const res = await fetch(url, config);
      clearTimeout(timer);
      const status = res.status;

      // Handle 401 with a single session refresh attempt if not already retried
      if (status === 401 && !options._isRetry) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData?.session?.access_token) {
            return await this.request<T>(endpoint, {
              ...options,
              _isRetry: true,
            });
          }
        } catch {
          // Refresh failed
        }
      }

      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok) {
        const record = json as Record<string, unknown> | null;
        const errorMsg =
          (typeof record?.error === 'string' ? record.error : undefined) ||
          (typeof record?.message === 'string' ? record.message : undefined) ||
          `Request failed with status code ${status}`;
        return {
          status,
          error: errorMsg,
        };
      }

      return {
        status,
        data: json as T,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = (err as any)?.name === 'AbortError';
      return {
        status: 0,
        error: isAbort
          ? 'Network request timed out. Please check that the backend server is reachable.'
          : (err instanceof Error ? err.message : undefined) ||
            'Network connection error. Please verify your connection to the Maidaan backend.',
      };
    }
  }

  get<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  post<T, B = unknown>(endpoint: string, body?: B, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  put<T, B = unknown>(endpoint: string, body?: B, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  delete<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  patch<T, B = unknown>(endpoint: string, body?: B, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }
}

export const api = new ApiClient();
