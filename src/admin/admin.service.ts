import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BotManagerService } from '../telegram/bot-manager.service';
import { AgentRole, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AdminQueryDto } from './dto/admin-query.dto';
import { CreateBotDto, UpdateBotDto } from './dto/admin-bot.dto';
import { CreateAgentDto, UpdateAgentDto } from './dto/admin-agent.dto';
import { UpdateTelegramUserDto } from './dto/admin-user.dto';
import {
  AdminCreateVideoDto,
  AdminUpdateVideoDto,
} from './dto/admin-video.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly botManagerService: BotManagerService,
  ) {}

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

    const sortOrder: Prisma.SortOrder =
      query.sortOrder === 'asc' ? 'asc' : 'desc';
    let orderBy: Prisma.TelegramBotOrderByWithRelationInput = {
      createdAt: 'desc',
    };

    if (query.sortBy) {
      switch (query.sortBy) {
        case 'id':
          orderBy = { id: sortOrder };
          break;
        case 'botId':
          orderBy = { botId: sortOrder };
          break;
        case 'name':
          orderBy = { name: sortOrder };
          break;
        case 'username':
          orderBy = { username: sortOrder };
          break;
        case 'isActive':
        case 'status':
          orderBy = { isActive: sortOrder };
          break;
        case 'updatedAt':
          orderBy = { updatedAt: sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }
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
        orderBy,
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
    const existingId = await this.prisma.telegramBot.findUnique({
      where: { botId: dto.botId },
    });
    if (existingId)
      throw new BadRequestException(
        'Bot with this Telegram ID already registered',
      );

    const existingToken = await this.prisma.telegramBot.findUnique({
      where: { botToken: dto.botToken },
    });
    if (existingToken)
      throw new BadRequestException('Bot with this token already registered');

    const bot = await this.prisma.telegramBot.create({
      data: {
        botId: dto.botId,
        botToken: dto.botToken,
        name: dto.name,
        username: dto.username || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    if (bot.isActive) {
      await this.botManagerService.startBot(bot.id, bot.botToken);
    }

    const result = { ...bot };
    delete (result as any).botToken; // Security protection
    return result;
  }

  async updateBot(id: number, dto: UpdateBotDto) {
    const bot = await this.prisma.telegramBot.findUnique({ where: { id } });
    if (!bot) throw new NotFoundException('Bot not found');

    const data: any = {
      name: dto.name,
      username: dto.username,
      isActive: dto.isActive,
    };

    // Only update token if a new valid token is supplied
    if (
      dto.botToken &&
      dto.botToken.trim() !== '' &&
      dto.botToken !== '********'
    ) {
      data.botToken = dto.botToken;
    }

    const updated = await this.prisma.telegramBot.update({
      where: { id },
      data,
    });

    // Update in-memory bot instance
    if (updated.isActive === false) {
      await this.botManagerService.stopBot(id);
    } else {
      await this.botManagerService.stopBot(id);
      await this.botManagerService.startBot(id, updated.botToken);
    }

    const result = { ...updated };
    delete (result as any).botToken; // Security protection
    return result;
  }

  async deleteBot(id: number) {
    const bot = await this.prisma.telegramBot.findUnique({
      where: { id },
      include: { users: { take: 1 } },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    if (bot.users.length > 0) {
      throw new BadRequestException(
        `Cannot delete bot: It has active associated Telegram users.`,
      );
    }

    await this.botManagerService.stopBot(id);
    await this.prisma.telegramBot.delete({ where: { id } });
    return { success: true };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TELEGRAM BOT WEBHOOK OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────

  async setBotWebhook(id: number) {
    const bot = await this.prisma.telegramBot.findUnique({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Telegram bot #${id} not found`);
    }

    if (!bot.isActive) {
      throw new BadRequestException(
        `Cannot set webhook for inactive bot "${bot.name}". Please activate the bot first.`,
      );
    }

    if (
      !bot.botToken ||
      bot.botToken.trim() === '' ||
      bot.botToken === '********'
    ) {
      throw new BadRequestException(
        `Bot "${bot.name}" does not have a valid token configured.`,
      );
    }

    const domain =
      this.configService.get<string>('TELEGRAM_WEBHOOK_DOMAIN') ||
      this.configService.get<string>('TELEGRAM_WEBHOOK_BASE_URL') ||
      this.configService.get<string>('APP_URL');

    if (!domain || domain.trim() === '') {
      throw new BadRequestException(
        'TELEGRAM_WEBHOOK_DOMAIN is not configured in the server environment (.env)',
      );
    }

    const baseUrl = domain.trim().replace(/\/+$/, '');
    const webhookUrl = `${baseUrl}/telegram/webhook/${bot.id}`;
    const secretToken = this.configService.get<string>(
      'TELEGRAM_WEBHOOK_SECRET',
    );

    let telegraf = this.botManagerService.getBot(bot.id);
    if (!telegraf) {
      await this.botManagerService.startBot(bot.id, bot.botToken);
      telegraf = this.botManagerService.getBot(bot.id);
    }

    if (!telegraf) {
      throw new BadRequestException(
        `Failed to initialize Telegram client instance for bot "${bot.name}"`,
      );
    }

    const extra: any = {};
    if (secretToken && secretToken.trim() !== '') {
      extra.secret_token = secretToken.trim();
    }

    try {
      const result = await telegraf.telegram.setWebhook(webhookUrl, extra);
      this.logger.log(
        `Admin set webhook for Telegram Bot #${bot.id} (name: "${bot.name}", username: "${bot.username || 'n/a'}") to url: ${webhookUrl}`,
      );

      return {
        success: true,
        message: 'Webhook set successfully',
        data: {
          botId: bot.id,
          botName: bot.name,
          username: bot.username,
          webhookUrl,
          hasSecretToken: !!secretToken,
          telegram: {
            ok: !!result,
          },
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to set Telegram webhook for Bot #${bot.id} (name: "${bot.name}"): ${error.message}`,
      );
      throw new BadRequestException(
        `Unable to set Telegram webhook: ${error.message || 'Telegram API error'}`,
      );
    }
  }

  async getBotWebhookInfo(id: number) {
    const bot = await this.prisma.telegramBot.findUnique({ where: { id } });
    if (!bot) throw new NotFoundException(`Telegram bot #${id} not found`);

    if (!bot.isActive) {
      return {
        success: true,
        data: {
          botId: bot.id,
          botName: bot.name,
          isActive: false,
          webhookConfigured: false,
          info: null,
        },
      };
    }

    let telegraf = this.botManagerService.getBot(bot.id);
    if (!telegraf && bot.botToken) {
      await this.botManagerService.startBot(bot.id, bot.botToken);
      telegraf = this.botManagerService.getBot(bot.id);
    }

    if (!telegraf) {
      return {
        success: true,
        data: {
          botId: bot.id,
          botName: bot.name,
          isActive: true,
          webhookConfigured: false,
          info: null,
        },
      };
    }

    try {
      const info = await telegraf.telegram.getWebhookInfo();
      return {
        success: true,
        data: {
          botId: bot.id,
          botName: bot.name,
          isActive: bot.isActive,
          webhookConfigured: !!info?.url,
          info,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get webhook info for Bot #${bot.id}: ${error.message}`,
      );
      throw new BadRequestException(
        `Unable to fetch Telegram webhook info: ${error.message || 'Telegram API error'}`,
      );
    }
  }

  async deleteBotWebhook(id: number) {
    const bot = await this.prisma.telegramBot.findUnique({ where: { id } });
    if (!bot) throw new NotFoundException(`Telegram bot #${id} not found`);

    let telegraf = this.botManagerService.getBot(bot.id);
    if (!telegraf && bot.botToken) {
      await this.botManagerService.startBot(bot.id, bot.botToken);
      telegraf = this.botManagerService.getBot(bot.id);
    }

    if (!telegraf) {
      throw new BadRequestException(
        `Failed to initialize Telegram client instance for bot "${bot.name}"`,
      );
    }

    try {
      const result = await telegraf.telegram.deleteWebhook();
      this.logger.log(
        `Admin removed webhook for Telegram Bot #${bot.id} (name: "${bot.name}")`,
      );
      return {
        success: true,
        message: 'Webhook deleted successfully',
        data: {
          botId: bot.id,
          telegram: {
            ok: !!result,
          },
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to delete webhook for Bot #${bot.id}: ${error.message}`,
      );
      throw new BadRequestException(
        `Unable to delete Telegram webhook: ${error.message || 'Telegram API error'}`,
      );
    }
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
    if (
      query.status &&
      (query.status === AgentRole.ADMIN || query.status === AgentRole.AGENT)
    ) {
      where.role = query.status;
    }

    const sortOrder: Prisma.SortOrder =
      query.sortOrder === 'asc' ? 'asc' : 'desc';
    let orderBy: Prisma.AgentOrderByWithRelationInput = { createdAt: 'desc' };

    if (query.sortBy) {
      switch (query.sortBy) {
        case 'id':
          orderBy = { id: sortOrder };
          break;
        case 'name':
          orderBy = { name: sortOrder };
          break;
        case 'email':
          orderBy = { email: sortOrder };
          break;
        case 'role':
        case 'status':
          orderBy = { role: sortOrder };
          break;
        case 'updatedAt':
          orderBy = { updatedAt: sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }
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
        orderBy,
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
    const existing = await this.prisma.agent.findUnique({
      where: { email: dto.email },
    });
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
      throw new BadRequestException(
        'Self-deletion is not permitted. Please ask another administrator to remove this profile.',
      );
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
      throw new BadRequestException(
        `Cannot delete agent: This operator has active assigned conversations.`,
      );
    }

    if (agent.messages.length > 0) {
      throw new BadRequestException(
        `Cannot delete agent: This operator has sent chat messages in the database. Deleting them would compromise audit trails.`,
      );
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

    const sortOrder: Prisma.SortOrder =
      query.sortOrder === 'asc' ? 'asc' : 'desc';
    let orderBy:
      | Prisma.TelegramUserOrderByWithRelationInput
      | Prisma.TelegramUserOrderByWithRelationInput[] = { createdAt: 'desc' };

    if (query.sortBy) {
      switch (query.sortBy) {
        case 'id':
          orderBy = { id: sortOrder };
          break;
        case 'telegramId':
          orderBy = { telegramId: sortOrder };
          break;
        case 'botId':
          orderBy = { botId: sortOrder };
          break;
        case 'bot':
          orderBy = { bot: { name: sortOrder } };
          break;
        case 'firstName':
          orderBy = { firstName: sortOrder };
          break;
        case 'lastName':
          orderBy = { lastName: sortOrder };
          break;
        case 'name':
          orderBy = [{ firstName: sortOrder }, { lastName: sortOrder }];
          break;
        case 'username':
          orderBy = { username: sortOrder };
          break;
        case 'phoneNumber':
          orderBy = { phoneNumber: sortOrder };
          break;
        case 'status':
          orderBy = { status: sortOrder };
          break;
        case 'conversationStatus':
          orderBy = { conversationStatus: sortOrder };
          break;
        case 'assignedAgentId':
        case 'agentId':
          orderBy = { assignedAgentId: sortOrder };
          break;
        case 'agent':
        case 'assignedAgent':
          orderBy = { assignedAgent: { name: sortOrder } };
          break;
        case 'updatedAt':
          orderBy = { updatedAt: sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }
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
        orderBy,
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
      data.assignedAgentId =
        dto.assignedAgentId === 'null' || dto.assignedAgentId === ''
          ? null
          : dto.assignedAgentId;
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
      throw new BadRequestException(
        `Cannot delete Telegram user: Active chat history (messages) exists for this user profile.`,
      );
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

    const sortOrder: Prisma.SortOrder =
      query.sortOrder === 'asc' ? 'asc' : 'desc';
    let orderBy:
      | Prisma.TelegramMessageOrderByWithRelationInput
      | Prisma.TelegramMessageOrderByWithRelationInput[] = {
      createdAt: 'desc',
    };

    if (query.sortBy) {
      switch (query.sortBy) {
        case 'id':
          orderBy = { id: sortOrder };
          break;
        case 'messageId':
          orderBy = { messageId: sortOrder };
          break;
        case 'messageType':
          orderBy = { messageType: sortOrder };
          break;
        case 'text':
          orderBy = { text: sortOrder };
          break;
        case 'status':
          orderBy = { status: sortOrder };
          break;
        case 'telegramUserId':
          orderBy = { telegramUserId: sortOrder };
          break;
        case 'agentId':
        case 'agent':
          orderBy = { agentId: sortOrder };
          break;
        case 'direction':
          // In TelegramMessage: incoming messages have agentId == null, outgoing have agentId != null
          orderBy = { agentId: sortOrder };
          break;
        case 'telegramUser':
        case 'user':
        case 'username':
        case 'firstName':
          orderBy = { telegramUser: { firstName: sortOrder } };
          break;
        case 'updatedAt':
          orderBy = { updatedAt: sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.telegramMessage.findMany({
        where,
        include: {
          telegramUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              bot: {
                select: {
                  name: true,
                },
              },
            },
          },
          agent: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy,
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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            bot: {
              select: {
                name: true,
              },
            },
          },
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
    throw new BadRequestException(
      'Deleting chat history messages is prohibited for audit compliance.',
    );
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

    const sortOrder: Prisma.SortOrder =
      query.sortOrder === 'asc' ? 'asc' : 'desc';
    let orderBy: Prisma.VideoOrderByWithRelationInput = { createdAt: 'desc' };

    if (query.sortBy) {
      switch (query.sortBy) {
        case 'id':
          orderBy = { id: sortOrder };
          break;
        case 'title':
        case 'name':
          orderBy = { title: sortOrder };
          break;
        case 'originalFileName':
          orderBy = { originalFileName: sortOrder };
          break;
        case 'status':
          orderBy = { status: sortOrder };
          break;
        case 'updatedAt':
          orderBy = { updatedAt: sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        orderBy,
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
