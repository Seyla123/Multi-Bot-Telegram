import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';

@Injectable()
export class PusherService implements OnModuleInit {
  private pusher: Pusher;
  private readonly logger = new Logger(PusherService.name);
  private readonly channel = 'telegram-chat';

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const appId = this.configService.get<string>('PUSHER_APP_ID');
    const key = this.configService.get<string>('PUSHER_APP_KEY');
    const secret = this.configService.get<string>('PUSHER_APP_SECRET');
    const cluster = this.configService.get<string>('PUSHER_APP_CLUSTER');

    if (!appId || !key || !secret || !cluster) {
      this.logger.warn('Pusher credentials missing. Realtime updates are disabled.');
      return;
    }

    this.pusher = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
    
    this.logger.log('Pusher initialized successfully');
  }

  async triggerNewMessage(message: any) {
    if (!this.pusher) return;
    try {
      await this.pusher.trigger(this.channel, 'new_message', message);
    } catch (error) {
      this.logger.error('Failed to trigger new_message event', error);
    }
  }

  async triggerMessageDeleted(messageId: string) {
    if (!this.pusher) return;
    try {
      await this.pusher.trigger(this.channel, 'message_deleted', { messageId });
    } catch (error) {
      this.logger.error('Failed to trigger message_deleted event', error);
    }
  }

  async triggerMessagePinned(messageId: string) {
    if (!this.pusher) return;
    try {
      await this.pusher.trigger(this.channel, 'message_pinned', { messageId });
    } catch (error) {
      this.logger.error('Failed to trigger message_pinned event', error);
    }
  }

  async triggerMessageUnpinned(messageId: string) {
    if (!this.pusher) return;
    try {
      await this.pusher.trigger(this.channel, 'message_unpinned', { messageId });
    } catch (error) {
      this.logger.error('Failed to trigger message_unpinned event', error);
    }
  }

  async triggerMessagesRead(telegramUserId: string) {
    if (!this.pusher) return;
    try {
      await this.pusher.trigger(this.channel, 'messages_read', { telegramUserId });
    } catch (error) {
      this.logger.error('Failed to trigger messages_read event', error);
    }
  }

  async triggerConversationUpdated(payload: {
    telegramUserId: string;
    conversationStatus: string;
    assignedAgentId: string | null;
    assignedAgent: { id: string; name: string } | null;
  }) {
    if (!this.pusher) return;
    const event = payload.assignedAgentId ? 'conversation_assigned' : 'conversation_unassigned';
    try {
      await this.pusher.trigger(this.channel, event, payload);
    } catch (error) {
      this.logger.error(`Failed to trigger ${event} event`, error);
    }
  }

  async triggerConversationStatusChanged(payload: {
    telegramUserId: string;
    conversationStatus: string;
    assignedAgentId: string | null;
    assignedAgent: { id: string; name: string } | null;
  }) {
    if (!this.pusher) return;
    const event = payload.conversationStatus === 'RESOLVED' ? 'conversation_resolved' : 'conversation_reopened';
    try {
      await this.pusher.trigger(this.channel, event, payload);
    } catch (error) {
      this.logger.error(`Failed to trigger ${event} event`, error);
    }
  }
}
