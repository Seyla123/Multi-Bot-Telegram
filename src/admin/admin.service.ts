import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AdminQueryDto } from './dto/admin-query.dto';
import { CreateBotDto, UpdateBotDto } from './dto/admin-bot.dto';
import { CreateAgentDto, UpdateAgentDto } from './dto/admin-agent.dto';
import { UpdateTelegramUserDto } from './dto/admin-user.dto';
import { AdminCreateVideoDto, AdminUpdateVideoDto } from './dto/admin-video.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // BOTS CRUD
  // ──────────────────────────────────────────────────────────────────────────

  async listBots(query: AdminQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { username: { contains: query.search } },
        { botId: { contains: query.search } },
      ];
    }
    if (query.status !== undefined) {
      where.isActive = query.status === 'true' || query.status === '1';
    }

    const [items, total] = await Promise.all([
      this.prisma.telegramBot.findMany({
        where,
        select: {
          id: true,
          botId: true,
          name: true,
          username: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder || 'asc' } : { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.telegramBot.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBot(id: number) {
    const bot = await this.prisma.telegramBot.findUnique({ where: { id } });
    if (!bot) throw new BadRequestException('Bot not found');
    bot.botToken = '********'; // Mask secret token
    return bot;
  }

  async createBot(dto: CreateBotDto) {
    // Check uniqueness
    const existingId = await this.prisma.telegramBot.findUnique({ where: { botId: dto.botId } });
    if (existingId) throw new BadRequestException('Bot with this Telegram ID already registered');

    const existingToken = await this.prisma.telegramBot.findUnique({ where: { botToken: dto.botToken } });
    if (existingToken) throw new BadRequestException('Bot with this token already registered');

    const bot = await this.prisma.telegramBot.create({
      data: {
        botId: dto.botId,
        botToken: dto.botToken,
        name: dto.name,
        username: dto.username || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    const result = { ...bot };
    delete (result as any).botToken; // Security protection
    return result;
  }

  async updateBot(id: number, dto: UpdateBotDto) {
    const bot = await this.prisma.telegramBot.findUnique({ where: { id } });
    if (!bot) throw new BadRequestException('Bot not found');

    const data: any = {
      name: dto.name,
      username: dto.username,
      isActive: dto.isActive,
    };

    // Only update token if a new valid token is supplied
    if (dto.botToken && dto.botToken.trim() !== '' && dto.botToken !== '********') {
      data.botToken = dto.botToken;
    }

    const updated = await this.prisma.telegramBot.update({
      where: { id },
      data,
    });

    const result = { ...updated };
    delete (result as any).botToken; // Security protection
    return result;
  }

  async deleteBot(id: number) {
    const bot = await this.prisma.telegramBot.findUnique({
      where: { id },
      include: { users: { take: 1 } },
    });
    if (!bot) throw new BadRequestException('Bot not found');

    if (bot.users.length > 0) {
      throw new BadRequestException(`Cannot delete bot: It has active associated Telegram users.`);
    }

    await this.prisma.telegramBot.delete({ where: { id } });
    return { success: true };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AGENTS CRUD
  // ──────────────────────────────────────────────────────────────────────────

  async listAgents(query: AdminQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }
    if (query.status && (query.status === AgentRole.ADMIN || query.status === AgentRole.AGENT)) {
      where.role = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.agent.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder || 'asc' } : { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.agent.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAgent(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!agent) throw new BadRequestException('Agent not found');
    return agent;
  }

  async createAgent(dto: CreateAgentDto) {
    const existing = await this.prisma.agent.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const agent = await this.prisma.agent.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role || AgentRole.AGENT,
      },
    });

    const result = { ...agent };
    delete (result as any).passwordHash; // Security protection
    return result;
  }

  async updateAgent(id: string, dto: UpdateAgentDto) {
    const agent = await this.prisma.agent.findUnique({ where: { id } });
    if (!agent) throw new BadRequestException('Agent not found');

    const data: any = {
      name: dto.name,
      email: dto.email,
      role: dto.role,
    };

    if (dto.password && dto.password.trim() !== '') {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.agent.update({
      where: { id },
      data,
    });

    const result = { ...updated };
    delete (result as any).passwordHash; // Security protection
    return result;
  }

  async deleteAgent(id: string, currentAgentId: string) {
    if (id === currentAgentId) {
      throw new BadRequestException('Self-deletion is not permitted. Please ask another administrator to remove this profile.');
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        assignedConversations: { take: 1 },
        messages: { take: 1 },
      },
    });
    if (!agent) throw new BadRequestException('Agent not found');

    if (agent.assignedConversations.length > 0) {
      throw new BadRequestException(`Cannot delete agent: This operator has active assigned conversations.`);
    }

    if (agent.messages.length > 0) {
      throw new BadRequestException(`Cannot delete agent: This operator has sent chat messages in the database. Deleting them would compromise audit trails.`);
    }

    await this.prisma.agent.delete({ where: { id } });
    return { success: true };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TELEGRAM USERS CRUD
  // ──────────────────────────────────────────────────────────────────────────

  async listTelegramUsers(query: AdminQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { telegramId: { contains: query.search } },
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { username: { contains: query.search } },
        { phoneNumber: { contains: query.search } },
      ];
    }
    if (query.botId) {
      where.botId = parseInt(query.botId, 10);
    }
    if (query.agentId) {
      where.assignedAgentId = query.agentId === 'null' ? null : query.agentId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.conversationStatus) {
      where.conversationStatus = query.conversationStatus;
    }

    const [items, total] = await Promise.all([
      this.prisma.telegramUser.findMany({
        where,
        include: {
          bot: {
            select: { id: true, name: true, username: true },
          },
          assignedAgent: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder || 'asc' } : { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.telegramUser.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTelegramUser(id: string) {
    const user = await this.prisma.telegramUser.findUnique({
      where: { id },
      include: {
        bot: {
          select: { id: true, name: true, username: true },
        },
        assignedAgent: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!user) throw new BadRequestException('Telegram user not found');
    return user;
  }

  async updateTelegramUser(id: string, dto: UpdateTelegramUserDto) {
    const user = await this.prisma.telegramUser.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Telegram user not found');

    const data: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      username: dto.username,
      phoneNumber: dto.phoneNumber,
      status: dto.status,
      conversationStatus: dto.conversationStatus,
    };

    if (dto.assignedAgentId !== undefined) {
      data.assignedAgentId = dto.assignedAgentId === 'null' || dto.assignedAgentId === '' ? null : dto.assignedAgentId;
    }

    const updated = await this.prisma.telegramUser.update({
      where: { id },
      data,
      include: {
        bot: {
          select: { id: true, name: true },
        },
        assignedAgent: {
          select: { id: true, name: true },
        },
      },
    });

    return updated;
  }

  async deleteTelegramUser(id: string) {
    const user = await this.prisma.telegramUser.findUnique({
      where: { id },
      include: {
        messages: { take: 1 },
      },
    });
    if (!user) throw new BadRequestException('Telegram user not found');

    if (user.messages.length > 0) {
      throw new BadRequestException(`Cannot delete Telegram user: Active chat history (messages) exists for this user profile.`);
    }

    await this.prisma.telegramUser.delete({ where: { id } });
    return { success: true };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TELEGRAM MESSAGES CRUD
  // ──────────────────────────────────────────────────────────────────────────

  async listTelegramMessages(query: AdminQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { text: { contains: query.search } },
        { messageId: { contains: query.search } },
      ];
    }
    if (query.messageType) {
      where.messageType = query.messageType;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.botId) {
      where.telegramUser = { botId: parseInt(query.botId, 10) };
    }
    if (query.agentId) {
      where.agentId = query.agentId === 'null' ? null : query.agentId;
    }

    const [items, total] = await Promise.all([
      this.prisma.telegramMessage.findMany({
        where,
        include: {
          telegramUser: {
            select: { id: true, firstName: true, lastName: true, username: true },
          },
          agent: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder || 'asc' } : { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.telegramMessage.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTelegramMessage(id: string) {
    const message = await this.prisma.telegramMessage.findUnique({
      where: { id },
      include: {
        telegramUser: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
        agent: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!message) throw new BadRequestException('Message not found');
    return message;
  }

  async deleteTelegramMessage(id: string) {
    throw new BadRequestException('Deleting chat history messages is prohibited for audit compliance.');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIDEOS CRUD
  // ──────────────────────────────────────────────────────────────────────────

  async listVideos(query: AdminQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { originalFileName: { contains: query.search } },
      ];
    }
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder || 'asc' } : { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.video.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getVideo(id: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new BadRequestException('Video record not found');
    return video;
  }

  async createVideo(dto: AdminCreateVideoDto) {
    const video = await this.prisma.video.create({
      data: {
        title: dto.title,
        originalFileName: dto.originalFileName,
        status: dto.status || 'pending',
      },
    });
    return video;
  }

  async updateVideo(id: string, dto: AdminUpdateVideoDto) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new BadRequestException('Video record not found');

    const updated = await this.prisma.video.update({
      where: { id },
      data: {
        title: dto.title,
        originalFileName: dto.originalFileName,
        status: dto.status,
      },
    });
    return updated;
  }

  async deleteVideo(id: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new BadRequestException('Video record not found');

    await this.prisma.video.delete({ where: { id } });
    return { success: true };
  }
}
