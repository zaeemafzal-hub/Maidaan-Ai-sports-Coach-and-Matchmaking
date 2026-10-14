import { AuthStorage } from './storage';
import { supabase } from '../lib/supabase';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return '';
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'http://localhost:5000';
};

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getBaseUrl();
  }

  private async getHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...customHeaders,
    };

    let token = await AuthStorage.getToken();
    if (!token) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          token = data.session.access_token;
          await AuthStorage.setToken(token);
        }
      } catch {
        // ignore
      }
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
    } = {}
  ): Promise<ApiResponse<T>> {
    const method = options.method || 'GET';
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${path}`;

    try {
      const headers = await this.getHeaders(options.headers);
      const config: RequestInit = {
        method,
        headers,
      };

      if (options.body !== undefined && method !== 'GET') {
        config.body = JSON.stringify(options.body);
      }

      const res = await fetch(url, config);
      const status = res.status;

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
      return {
        status: 0,
        error:
          (err instanceof Error ? err.message : undefined) ||
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
