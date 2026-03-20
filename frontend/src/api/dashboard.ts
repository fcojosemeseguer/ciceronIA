import apiClient from './client';
import {
  CreateShareLinkRequest,
  PublicDashboardResponse,
  ShareLink,
} from '../types';

interface CreateShareLinkResponse {
  share_id: string;
  public_url: string;
  expires_at: string;
  revoked: boolean;
}

interface ShareLinksResponse {
  items: ShareLink[];
  total: number;
}

export const dashboardService = {
  async createShareLink(
    projectCode: string,
    payload: CreateShareLinkRequest
  ): Promise<ShareLink> {
    const response = await apiClient.post<CreateShareLinkResponse>(
      `/projects/${projectCode}/share-links`,
      {
        expires_at: payload.expires_at,
        allow_full_transcript: payload.allow_full_transcript ?? false,
        allow_raw_metrics: payload.allow_raw_metrics ?? false,
      }
    );

    const token = response.data.public_url.split('/').pop() || '';
    const appBase = process.env.REACT_APP_PUBLIC_APP_URL || window.location.origin;
    const frontendPublicUrl = token
      ? `${appBase.replace(/\/$/, '')}/public/dashboard/${encodeURIComponent(token)}`
      : undefined;

    return {
      share_id: response.data.share_id,
      project_code: projectCode,
      token_prefix: 'new-link',
      allow_full_transcript: payload.allow_full_transcript ?? false,
      allow_raw_metrics: payload.allow_raw_metrics ?? false,
      expires_at: response.data.expires_at,
      revoked: response.data.revoked,
      created_at: new Date().toISOString(),
      public_url: frontendPublicUrl,
    };
  },

  async listShareLinks(projectCode: string): Promise<ShareLink[]> {
    const response = await apiClient.get<ShareLinksResponse>(
      `/projects/${projectCode}/share-links`
    );

    return response.data.items || [];
  },

  async revokeShareLink(projectCode: string, shareId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectCode}/share-links/${shareId}`);
  },

  async getPublicDashboard(
    token: string,
    filters?: {
      fase?: string;
      postura?: string;
      orador?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<PublicDashboardResponse> {
    const response = await apiClient.get<PublicDashboardResponse>(
      `/public/dashboard/${token}`,
      {
        params: {
          fase: filters?.fase || undefined,
          postura: filters?.postura || undefined,
          orador: filters?.orador || undefined,
          limit: filters?.limit ?? 20,
          offset: filters?.offset ?? 0,
        },
      }
    );

    return response.data;
  },
};

export default dashboardService;
