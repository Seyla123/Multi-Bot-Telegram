import { apiFetch } from './api';
import type { User } from '../types/app';

// Replace with a better shared type interface if needed
export interface Message {
  id: string;
  telegramUserId: string;
  text: string;
  createdAt: string;
  status: 'sent' | 'received' | 'sending' | 'failed' | 'unread' | 'read';
  messageType: 'text' | 'photo' | 'video' | 'voice' | 'document' | 'audio';
  filePath?: string;
  isPinned?: boolean;
  replyToId?: string;
  // Pending fields
  file?: File;
  progress?: number;
  error?: string | null;
  agentId?: string | null;
  agent?: { id: string; name: string } | null;
}

export interface Bot {
  id: number;
  botId: string;
  botToken: string;
  name: string;
  username?: string;
  isActive: boolean;
}

export type ConversationFilter = 'all' | 'mine' | 'unassigned' | 'resolved';

export const TelegramService = {
  async getBots(): Promise<{ data: Bot[] }> {
    return apiFetch<{ data: Bot[] }>('/telegram/bots');
  },

  async createBot(payload: {
    name: string;
    botToken: string;
    username?: string;
  }): Promise<Bot> {
    const res = await apiFetch<any>('/telegram/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.success === false) throw new Error(res.message);
    return res.data;
  },

  async deleteBot(botId: number): Promise<void> {
    const res = await apiFetch<any>(`/telegram/bots/${botId}`, {
      method: 'DELETE',
    });
    if (res.success === false) throw new Error(res.message);
  },

  async getUsers(
    page: number = 1,
    limit: number = 50,
    search: string = '',
    botId?: number,
    filter: ConversationFilter = 'all',
  ): Promise<{ data: User[]; meta: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    if (botId) params.append('botId', botId.toString());
    if (filter && filter !== 'all') params.append('filter', filter);
    return apiFetch<{ data: User[]; meta: any }>(
      `/telegram/users?${params.toString()}`,
    );
  },

  async markAsRead(userId: string): Promise<void> {
    return apiFetch<void>(`/telegram/messages/${userId}/read`, {
      method: 'POST',
    });
  },

  async getMessages(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: Message[]; meta: any }> {
    return apiFetch<{ data: Message[]; meta: any }>(
      `/telegram/messages/${userId}?page=${page}&limit=${limit}`,
    );
  },

  async sendMessage(payload: {
    userId: string;
    text: string;
    telegramId: string;
    replyToId?: string;
    file?: File | null;
    onProgress?: (percent: number) => void;
  }): Promise<any> {
    const { userId, text, telegramId, replyToId, file, onProgress } = payload;
    let body: any;
    let headers: Record<string, string> = {};

    if (file) {
      const formData = new FormData();
      if (text) formData.append('text', text);
      formData.append('telegramId', telegramId);
      if (replyToId) formData.append('replyToId', replyToId);
      formData.append('file', file);
      body = formData;
    } else {
      body = JSON.stringify({ text, telegramId, replyToId });
      headers['Content-Type'] = 'application/json';
    }

    if (file && onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/telegram/messages/${userId}`);

        const token = localStorage.getItem('auth_token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        };

        xhr.onload = () => {
          try {
            let json = {};
            try {
              json = JSON.parse(xhr.responseText);
            } catch (e) {}

            if (xhr.status >= 200 && xhr.status < 300) {
              let unwrapped = json as any;
              if (unwrapped.status !== undefined && 'data' in unwrapped) {
                if (!unwrapped.status)
                  throw new Error(unwrapped.message || 'API request failed');
                unwrapped = unwrapped.data;
              }
              if (unwrapped.success === false) {
                throw new Error(unwrapped.message || 'Failed to send message');
              }
              resolve(unwrapped.data || unwrapped);
            } else {
              throw new Error(
                (json as any).message ||
                  `API Error: ${xhr.status} ${xhr.statusText}`,
              );
            }
          } catch (err) {
            reject(err);
          }
        };

        xhr.onerror = () => reject(new Error('Network request failed'));
        xhr.send(body);
      });
    }

    const responsePayload = await apiFetch<any>(
      `/telegram/messages/${userId}`,
      {
        method: 'POST',
        headers,
        body,
      },
    );

    if (responsePayload.success === false) {
      throw new Error(responsePayload.message || 'Failed to send message');
    }

    return responsePayload.data || responsePayload;
  },

  async deleteMessage(messageId: string): Promise<void> {
    const payload = await apiFetch<any>(
      `/telegram/messages/${messageId}/delete`,
      { method: 'POST' },
    );
    if (payload.success === false)
      throw new Error(payload.message || 'Failed to delete message');
  },

  async togglePin(messageId: string): Promise<void> {
    const payload = await apiFetch<any>(`/telegram/messages/${messageId}/pin`, {
      method: 'POST',
    });
    if (payload.success === false)
      throw new Error(payload.message || 'Failed to pin message');
  },

  async assignConversation(
    userId: string,
  ): Promise<{
    telegramUserId: string;
    conversationStatus: string;
    assignedAgentId: string | null;
    assignedAgent: { id: string; name: string } | null;
  }> {
    const res = await apiFetch<any>(`/telegram/users/${userId}/assign`, {
      method: 'POST',
    });
    if (res.success === false) throw new Error(res.message);
    return res.data;
  },

  async unassignConversation(
    userId: string,
  ): Promise<{
    telegramUserId: string;
    conversationStatus: string;
    assignedAgentId: string | null;
    assignedAgent: { id: string; name: string } | null;
  }> {
    const res = await apiFetch<any>(`/telegram/users/${userId}/unassign`, {
      method: 'POST',
    });
    if (res.success === false) throw new Error(res.message);
    return res.data;
  },

  async resolveConversation(
    userId: string,
  ): Promise<{
    telegramUserId: string;
    conversationStatus: string;
    assignedAgentId: string | null;
    assignedAgent: { id: string; name: string } | null;
  }> {
    const res = await apiFetch<any>(`/telegram/users/${userId}/resolve`, {
      method: 'POST',
    });
    if (res.success === false) throw new Error(res.message);
    return res.data;
  },

  async reopenConversation(
    userId: string,
  ): Promise<{
    telegramUserId: string;
    conversationStatus: string;
    assignedAgentId: string | null;
    assignedAgent: { id: string; name: string } | null;
  }> {
    const res = await apiFetch<any>(`/telegram/users/${userId}/reopen`, {
      method: 'POST',
    });
    if (res.success === false) throw new Error(res.message);
    return res.data;
  },
};
