import { apiFetch } from './api';
import type { User } from '../App.vue';

// Replace with a better shared type interface if needed
export interface Message {
  id: string;
  telegramUserId: string;
  text: string;
  createdAt: string;
  status: 'sent' | 'received';
  messageType: 'text' | 'photo' | 'video' | 'voice' | 'document' | 'audio';
  filePath?: string;
  isPinned?: boolean;
}

export interface Bot {
  id: number;
  botId: string;
  botToken: string;
  name: string;
  username?: string;
  isActive: boolean;
}

export const TelegramService = {
  async getBots(): Promise<{ data: Bot[] }> {
    return apiFetch<{ data: Bot[] }>('/telegram/bots');
  },

  async createBot(payload: { name: string, botToken: string, username?: string }): Promise<Bot> {
    const res = await apiFetch<any>('/telegram/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.success === false) throw new Error(res.message);
    return res.data;
  },

  async deleteBot(botId: number): Promise<void> {
    const res = await apiFetch<any>(`/telegram/bots/${botId}`, { method: 'DELETE' });
    if (res.success === false) throw new Error(res.message);
  },

  async getUsers(page: number = 1, limit: number = 50, search: string = '', botId?: number): Promise<{ data: User[], meta: any }> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    if (botId) params.append('botId', botId.toString());
    return apiFetch<{ data: User[], meta: any }>(`/telegram/users?${params.toString()}`);
  },

  async markAsRead(userId: string): Promise<void> {
    return apiFetch<void>(`/telegram/messages/${userId}/read`, {
      method: 'POST',
    })
  },

  async getMessages(userId: string, page: number = 1, limit: number = 50): Promise<{ data: Message[], meta: any }> {
    return apiFetch<{ data: Message[], meta: any }>(`/telegram/messages/${userId}?page=${page}&limit=${limit}`);
  },

  async sendMessage(payload: { userId: string, text: string, telegramId: string, replyToId?: string, file?: File | null }): Promise<any> {
    const { userId, text, telegramId, replyToId, file } = payload;
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

    const responsePayload = await apiFetch<any>(`/telegram/messages/${userId}`, {
      method: 'POST',
      headers,
      body,
    });
    
    // Unwrapping the custom {success: true, data: ...} nested structure from backend
    if (responsePayload.success === false) {
      throw new Error(responsePayload.message || 'Failed to send message');
    }
    
    return responsePayload.data || responsePayload;
  },

  async deleteMessage(messageId: string): Promise<void> {
    const payload = await apiFetch<any>(`/telegram/messages/${messageId}/delete`, { method: 'POST' });
    if (payload.success === false) throw new Error(payload.message || 'Failed to delete message');
  },

  async togglePin(messageId: string): Promise<void> {
    const payload = await apiFetch<any>(`/telegram/messages/${messageId}/pin`, { method: 'POST' });
    if (payload.success === false) throw new Error(payload.message || 'Failed to pin message');
  }
};
