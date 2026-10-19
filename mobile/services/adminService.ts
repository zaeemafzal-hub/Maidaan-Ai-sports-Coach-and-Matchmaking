import { api, ApiResponse } from './api';
import { normalizeHubVerification } from '../utils/hubVerification';
import {
  HubVerificationRequest,
  HubVerificationStatus,
  AdminReport,
  ReportCategory,
  ReportStatus,
  AdminDashboardSummary,
  AdminHubListItem,
  Sport,
} from '../types';

export interface HubVerificationFilters {
  status?: HubVerificationStatus;
}

export interface ReportFilters {
  status?: ReportStatus;
  category?: ReportCategory;
}

export interface AdminHubFilters {
  status?: string;
  sport?: Sport;
}

export const adminService = {
  /**
   * GET /api/admin/dashboard
   * Consolidated operational metrics for Admin Control Center.
   */
  async getDashboardSummary(): Promise<ApiResponse<AdminDashboardSummary>> {
    return api.get<AdminDashboardSummary>('/api/admin/dashboard');
  },

  /**
   * GET /api/admin/hubs
   * List all registered hubs with verification details.
   */
  async getHubs(
    filters?: AdminHubFilters
  ): Promise<ApiResponse<{ hubs: AdminHubListItem[] }>> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') {
      params.append('status', filters.status);
    }
    if (filters?.sport) {
      params.append('sport', filters.sport);
    }
    const query = params.toString();
    const endpoint = `/api/admin/hubs${query ? `?${query}` : ''}`;
    return api.get<{ hubs: AdminHubListItem[] }>(endpoint);
  },

  /**
   * GET /api/admin/hub-verifications
   * List all hub verification requests, optionally filtered by status.
   */
  async getHubVerifications(
    filters?: HubVerificationFilters
  ): Promise<ApiResponse<{ requests: HubVerificationRequest[] }>> {
    let endpoint = '/api/admin/hub-verifications';
    if (filters?.status) {
      endpoint += `?status=${encodeURIComponent(filters.status)}`;
    }
    const result = await api.get<{ requests: HubVerificationRequest[] }>(endpoint);
    return result.data ? {...result, data: {requests: result.data.requests.map(normalizeHubVerification)}} : result;
  },

  /**
   * GET /api/admin/hub-verifications/:id
   * Fetch single hub verification request details.
   */
  async getHubVerificationById(
    id: string
  ): Promise<ApiResponse<{ request: HubVerificationRequest }>> {
    const result = await api.get<{ request: HubVerificationRequest }>(
      `/api/admin/hub-verifications/${id}`
    );
    return result.data ? {...result, data: {request: normalizeHubVerification(result.data.request)}} : result;
  },

  /**
   * PATCH /api/admin/hub-verifications/:id
   * Review hub verification request: APPROVE or REJECT.
   */
  async reviewHubVerification(
    id: string,
    action: 'APPROVE' | 'REJECT',
    adminNote?: string
  ): Promise<ApiResponse<{ request: HubVerificationRequest }>> {
    const result = await api.patch<{ request: HubVerificationRequest }>(
      `/api/admin/hub-verifications/${id}`,
      { action, adminNote: adminNote ? adminNote.trim() : undefined }
    );
    return result.data ? {...result, data: {request: normalizeHubVerification(result.data.request)}} : result;
  },

  /**
   * GET /api/admin/reports
   * List community reports, optionally filtered by status and category.
   */
  async getReports(
    filters?: ReportFilters
  ): Promise<ApiResponse<{ reports: AdminReport[] }>> {
    const params = new URLSearchParams();
    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.category) {
      params.append('category', filters.category);
    }
    const query = params.toString();
    const endpoint = `/api/admin/reports${query ? `?${query}` : ''}`;
    return api.get<{ reports: AdminReport[] }>(endpoint);
  },

  /**
   * GET /api/admin/reports/:id
   * Fetch single community report details.
   */
  async getReportById(
    id: string
  ): Promise<ApiResponse<{ report: AdminReport }>> {
    return api.get<{ report: AdminReport }>(`/api/admin/reports/${id}`);
  },

  /**
   * PATCH /api/admin/reports/:id
   * Review a community report: RESOLVE, DISMISS, or FOLLOW_UP.
   */
  async reviewReport(
    id: string,
    action: 'RESOLVE' | 'DISMISS' | 'FOLLOW_UP',
    adminNote?: string
  ): Promise<ApiResponse<{ report: AdminReport }>> {
    return api.patch<{ report: AdminReport }>(`/api/admin/reports/${id}`, {
      action,
      adminNote: adminNote ? adminNote.trim() : undefined,
    });
  },
};
