import { apiFetch } from './api';

export interface PaginatedResponse<T> {
  status: boolean;
  data: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminBot {
  id: number;
  botId: string;
  botToken?: string;
  name: string;
  username?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAgent {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTelegramUser {
  id: string;
  telegramId: string;
  botId: number;
  bot?: { id: number; name: string; username?: string | null };
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  phoneNumber?: string | null;
  status: string;
  conversationStatus: string;
  assignedAgentId?: string | null;
  assignedAgent?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTelegramMessage {
  id: string;
  telegramUserId: string;
  telegramUser?: { id: string; firstName: string; lastName?: string | null; username?: string | null };
  messageType: string;
  text?: string | null;
  status: string;
  messageId: string;
  filePath?: string | null;
  agentId?: string | null;
  agent?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminVideo {
  id: string;
  title: string;
  originalFileName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  conversationStatus?: string;
  botId?: string;
  agentId?: string;
  messageType?: string;
}

function buildQueryString(params: AdminQueryParams): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.toString())}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export const AdminService = {
  // BOTS
  async listBots(params: AdminQueryParams): Promise<PaginatedResponse<AdminBot>> {
    return apiFetch<PaginatedResponse<AdminBot>>(`/api/admin/bots${buildQueryString(params)}`);
  },
  async getBot(id: number): Promise<{ status: boolean; data: AdminBot }> {
    return apiFetch<{ status: boolean; data: AdminBot }>(`/api/admin/bots/${id}`);
  },
  async createBot(payload: Partial<AdminBot>): Promise<{ status: boolean; data: AdminBot }> {
    const res = await apiFetch<any>('/api/admin/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.success === false || res.status === false) throw new Error(res.message || 'Operation failed');
    return res;
  },
  async updateBot(id: number, payload: Partial<AdminBot>): Promise<{ status: boolean; data: AdminBot }> {
    const res = await apiFetch<any>(`/api/admin/bots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.success === false || res.status === false) throw new Error(res.message || 'Operation failed');
    return res;
  },
  async deleteBot(id: number): Promise<void> {
    const res = await apiFetch<any>(`/api/admin/bots/${id}`, { method: 'DELETE' });
    if (res.success === false || res.status === false) throw new Error(res.message || 'Operation failed');
  },

  // AGENTS
  async listAgents(params: AdminQueryParams): Promise<PaginatedResponse<AdminAgent>> {
    return apiFetch<PaginatedResponse<AdminAgent>>(`/api/admin/agents${buildQueryString(params)}`);
  },
  async getAgent(id: string): Promise<{ status: boolean; data: AdminAgent }> {
    return apiFetch<{ status: boolean; data: AdminAgent }>(`/api/admin/agents/${id}`);
  },
  async createAgent(payload: any): Promise<{ status: boolean; data: AdminAgent }> {
    const res = await apiFetch<any>('/api/admin/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.success === false || res.status === false) throw new Error(res.message || 'Operation failed');
    return res;
  },
  async updateAgent(id: string, payload: any): Promise<{ status: boolean; data: AdminAgent }> {
    const res = await apiFetch<any>(`/api/admin/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.success === false || res.status === false) throw new Error(res.message || 'Operation failed');
    return res;
  },
  async deleteAgent(id: string): Promise<void> {
    const res = await apiFetch<any>(`/api/admin/agents/${id}`, { method: 'DELETE' });
    if (res.success === false || res.status === false) throw new Error(res.message || 'Operation failed');
  },

  // TELEGRAM USERS
  async listTelegramUsers(params: AdminQueryParams): Promise<PaginatedResponse<AdminTelegramUser>> {
    return apiFetch<PaginatedResponse<AdminTelegramUser>>(`/api/admin/telegram-users${buildQueryString(params)}`);
  },
  async getTelegramUser(id: string): Promise<{ status: boolean; data: AdminTelegramUser }> {
    return apiFetch<{ status: boolean; data: AdminTelegramUser }>(`/api/admin/telegram-users/${id}`);
  },
  async updateTelegramUser(id: string, payload: any): Promise<{ status: boolean; data: AdminTelegramUser }> {
    const res = await apiFetch<any>(`/api/admin/telegram-users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.success === false || res.status === false) throw new Error(res.message || 'Operation failed');
    return res;
  },
  async deleteTelegramUser(id: string): Promise<void> {
    const res = await apiFetch<any>(`/api/admin/telegram-users/${id}`, { method: 'DELETE' });
    if (res.success === false || res.status === false) throw new Error(res.message || 'Operation failed');
  },

  // TELEGRAM MESSAGES
  async listTelegramMessages(params: AdminQueryParams): Promise<PaginatedResponse<AdminTelegramMessage>> {
    return apiFetch<PaginatedResponse<AdminTelegramMessage>>(`/api/admin/telegram-messages${buildQueryString(params)}`);
  },
  async deleteTelegramMessage(id: string): Promise<void> {
    const res = await apiFetch<any>(`/api/admin/telegram-messages/${id}`, { method: 'DELETE' });
    if (res.success === false || res.status === false) throw new Error(res.message || 'Operation failed');
  },

  // VIDEOS
  async listVideos(params: AdminQueryParams): Promise<PaginatedResponse<AdminVideo>> {
    return apiFetch<PaginatedResponse<AdminVideo>>(`/api/admin/videos${buildQueryString(params)}`);
  },
  async getVideo(id: string): Promise<{ status: boolean; data: AdminVideo }> {
    return apiFetch<{ status: boolean; data: AdminVideo }>(`/api/admin/videos/${id}`);
  },
  async createVideo(payload: any): Promise<{ status: boolean; data: AdminVideo }> {
    const res = await apiFetch<any>('/api/admin/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.success === false || res.status === false) throw new Error(res.message || 'Operation failed');
    return res;
  },
  async updateVideo(id: string, payload: any): Promise<{ status: boolean; data: AdminVideo }> {
    const res = await apiFetch<any>(`/api/admin/videos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.success === false || res.status === false) throw new Error(res.message || 'Operation failed');
    return res;
  },
  async deleteVideo(id: string): Promise<void> {
    const res = await apiFetch<any>(`/api/admin/videos/${id}`, { method: 'DELETE' });
    if (res.success === false || res.status === false) throw new Error(res.message || 'Operation failed');
  },
};
