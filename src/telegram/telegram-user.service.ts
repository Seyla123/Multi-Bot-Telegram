import { Injectable, ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PusherService } from '../pusher/pusher.service';

@Injectable()
export class TelegramUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pusher: PusherService,
  ) {}

  async upsertUser(from: any, botId: number) {
    if (!from || !from.id) return null;
    
    return this.prisma.telegramUser.upsert({
      where: { 
        telegramId_botId: {
          telegramId: from.id.toString(),
          botId
        }
      },
      update: {
        firstName: from.first_name,
        lastName: from.last_name || null,
        username: from.username || null,
      },
      create: {
        telegramId: from.id.toString(),
        firstName: from.first_name,
        lastName: from.last_name || null,
        username: from.username || null,
        botId,
      },
    });
  }

  async getUserById(id: string) {
    return this.prisma.telegramUser.findUnique({ where: { id } });
  }

  async getUsers(
    page: number = 1,
    limit: number = 50,
    search?: string,
    botId?: number,
    filter?: string,
    agentId?: string,
  ) {
    const skip = (page - 1) * limit;
    
    const whereClause: Prisma.TelegramUserWhereInput = {};

    if (botId !== undefined && botId !== null) {
      const parsedId = Number(botId);
      if (!isNaN(parsedId)) {
        whereClause.botId = parsedId;
      }
    }

    // Conversation assignment/status filter
    switch (filter) {
      case 'mine':
        whereClause.assignedAgentId = agentId;
        break;
      case 'unassigned':
        whereClause.assignedAgentId = null;
        whereClause.conversationStatus = 'OPEN';
        break;
      case 'resolved':
        whereClause.conversationStatus = 'RESOLVED';
        break;
      // 'all' or undefined: no additional filter
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { username: { contains: search } },
        { telegramId: { contains: search } }
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.telegramUser.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          assignedAgent: {
            select: { id: true, name: true }
          },
          _count: {
            select: { messages: { where: { status: 'unread' } } }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }),
      this.prisma.telegramUser.count({ where: whereClause })
    ]);

    const mappedUsers = users.map(user => {
      const { _count, messages, ...rest } = user;
      return {
        ...rest,
        unreadCount: _count.messages,
        lastMessage: messages[0] || null
      };
    });

    return {
      data: mappedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Atomically assign an unassigned conversation to the requesting agent.
   * Returns 409 Conflict if already assigned (race condition protection).
   */
  async assignConversation(userId: string, requestingAgentId: string) {
    // Atomic conditional update: only update if currently unassigned
    const result = await this.prisma.$executeRaw`
      UPDATE TelegramUser
      SET assignedAgentId = ${requestingAgentId}, updatedAt = NOW()
      WHERE id = ${userId} AND assignedAgentId IS NULL
    `;

    if (result === 0) {
      // Either user doesn't exist or already assigned
      const user = await this.prisma.telegramUser.findUnique({
        where: { id: userId },
        include: { assignedAgent: { select: { id: true, name: true } } }
      });
      if (!user) throw new NotFoundException('Conversation not found');
      if (user.assignedAgentId !== requestingAgentId) {
        throw new ConflictException('This conversation is already assigned to another agent');
      }
      // If already assigned to same agent, return current state (idempotent)
      return this.buildConversationPayload(user);
    }

    const updatedUser = await this.prisma.telegramUser.findUnique({
      where: { id: userId },
      include: { assignedAgent: { select: { id: true, name: true } } }
    });

    const payload = this.buildConversationPayload(updatedUser!);
    // Fire-and-forget Pusher — failure must not roll back DB update
    this.pusher.triggerConversationUpdated(payload).catch(() => {});
    return payload;
  }

  /**
   * Unassign a conversation — only the currently assigned agent may do this.
   */
  async unassignConversation(userId: string, requestingAgentId: string) {
    const user = await this.prisma.telegramUser.findUnique({
      where: { id: userId },
      include: { assignedAgent: { select: { id: true, name: true } } }
    });
    if (!user) throw new NotFoundException('Conversation not found');
    if (user.assignedAgentId !== requestingAgentId) {
      throw new ForbiddenException('You can only unassign conversations assigned to you');
    }

    const updatedUser = await this.prisma.telegramUser.update({
      where: { id: userId },
      data: { assignedAgentId: null },
      include: { assignedAgent: { select: { id: true, name: true } } }
    });

    const payload = this.buildConversationPayload(updatedUser);
    this.pusher.triggerConversationUpdated(payload).catch(() => {});
    return payload;
  }

  /**
   * Resolve a conversation — only the currently assigned agent may do this.
   */
  async resolveConversation(userId: string, requestingAgentId: string) {
    const user = await this.prisma.telegramUser.findUnique({
      where: { id: userId },
      include: { assignedAgent: { select: { id: true, name: true } } }
    });
    if (!user) throw new NotFoundException('Conversation not found');
    if (user.assignedAgentId !== requestingAgentId) {
      throw new ForbiddenException('You can only resolve conversations assigned to you');
    }

    const updatedUser = await this.prisma.telegramUser.update({
      where: { id: userId },
      data: { conversationStatus: 'RESOLVED' },
      include: { assignedAgent: { select: { id: true, name: true } } }
    });

    const payload = this.buildConversationPayload(updatedUser);
    this.pusher.triggerConversationStatusChanged(payload).catch(() => {});
    return payload;
  }

  /**
   * Reopen a conversation — only the currently assigned agent may do this.
   */
  async reopenConversation(userId: string, requestingAgentId: string) {
    const user = await this.prisma.telegramUser.findUnique({
      where: { id: userId },
      include: { assignedAgent: { select: { id: true, name: true } } }
    });
    if (!user) throw new NotFoundException('Conversation not found');
    if (user.assignedAgentId !== requestingAgentId) {
      throw new ForbiddenException('You can only reopen conversations assigned to you');
    }

    const updatedUser = await this.prisma.telegramUser.update({
      where: { id: userId },
      data: { conversationStatus: 'OPEN' },
      include: { assignedAgent: { select: { id: true, name: true } } }
    });

    const payload = this.buildConversationPayload(updatedUser);
    this.pusher.triggerConversationStatusChanged(payload).catch(() => {});
    return payload;
  }

  private buildConversationPayload(user: any) {
    return {
      telegramUserId: user.id,
      conversationStatus: user.conversationStatus,
      assignedAgentId: user.assignedAgentId,
      assignedAgent: user.assignedAgent ?? null,
    };
  }
}
