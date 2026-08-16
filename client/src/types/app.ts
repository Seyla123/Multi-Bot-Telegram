import type { Message } from '../services/telegramService';

export interface User {
  id: string;
  telegramId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  unreadCount?: number;
  lastMessage?: Message | null;
  assignedAgentId?: string | null;
  assignedAgent?: { id: string; name: string } | null;
  conversationStatus?: string;
}
