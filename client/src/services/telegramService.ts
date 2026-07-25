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

export const TelegramService = {
  async getUsers(): Promise<User[]> {
    return apiFetch<User[]>('/telegram/users');
  },

  async getMessages(userId: string): Promise<Message[]> {
    return apiFetch<Message[]>(`/telegram/messages/${userId}`);
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
