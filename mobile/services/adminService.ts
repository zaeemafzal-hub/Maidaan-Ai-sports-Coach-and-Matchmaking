import { api, ApiResponse } from './api';
import {
  HubVerificationRequest,
  HubVerificationStatus,
  AdminReport,
  ReportCategory,
  ReportStatus,
} from '../types';

export interface HubVerificationFilters {
  status?: HubVerificationStatus;
}

export interface ReportFilters {
  status?: ReportStatus;
  category?: ReportCategory;
}

export const adminService = {
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
    return api.get<{ requests: HubVerificationRequest[] }>(endpoint);
  },

  /**
   * GET /api/admin/hub-verifications/:id
   * Fetch single hub verification request details.
   */
  async getHubVerificationById(
    id: string
  ): Promise<ApiResponse<{ request: HubVerificationRequest }>> {
    return api.get<{ request: HubVerificationRequest }>(
      `/api/admin/hub-verifications/${id}`
    );
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
    return api.patch<{ request: HubVerificationRequest }>(
      `/api/admin/hub-verifications/${id}`,
      { action, adminNote: adminNote ? adminNote.trim() : undefined }
    );
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
