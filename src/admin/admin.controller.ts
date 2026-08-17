import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import { AdminQueryDto } from './dto/admin-query.dto';
import { CreateBotDto, UpdateBotDto } from './dto/admin-bot.dto';
import { CreateAgentDto, UpdateAgentDto } from './dto/admin-agent.dto';
import { UpdateTelegramUserDto } from './dto/admin-user.dto';
import { AdminCreateVideoDto, AdminUpdateVideoDto } from './dto/admin-video.dto';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // BOTS ENDPOINTS (Supports both /admin/bots and /admin/bot)
  // ──────────────────────────────────────────────────────────────────────────

  @Get(['bots', 'bot'])
  listBots(@Query() query: AdminQueryDto) {
    return this.adminService.listBots(query);
  }

  @Get(['bots/:id', 'bot/:id'])
  getBot(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getBot(id);
  }

  @Post(['bots', 'bot'])
  createBot(@Body() dto: CreateBotDto) {
    return this.adminService.createBot(dto);
  }

  @Put(['bots/:id', 'bot/:id'])
  updateBot(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBotDto) {
    return this.adminService.updateBot(id, dto);
  }

  @Delete(['bots/:id', 'bot/:id'])
  deleteBot(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteBot(id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AGENTS ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  @Get(['agents', 'agent'])
  listAgents(@Query() query: AdminQueryDto) {
    return this.adminService.listAgents(query);
  }

  @Get(['agents/:id', 'agent/:id'])
  getAgent(@Param('id') id: string) {
    return this.adminService.getAgent(id);
  }

  @Post(['agents', 'agent'])
  createAgent(@Body() dto: CreateAgentDto) {
    return this.adminService.createAgent(dto);
  }

  @Put(['agents/:id', 'agent/:id'])
  updateAgent(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.adminService.updateAgent(id, dto);
  }

  @Delete(['agents/:id', 'agent/:id'])
  deleteAgent(@Param('id') id: string, @Request() req: any) {
    return this.adminService.deleteAgent(id, req.user?.id || 'system');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // USERS ENDPOINTS (Supports both /admin/users and /admin/user)
  // ──────────────────────────────────────────────────────────────────────────

  @Get(['users', 'user'])
  listUsers(@Query() query: AdminQueryDto) {
    return this.adminService.listAgents(query);
  }

  @Get(['users/:id', 'user/:id'])
  getUser(@Param('id') id: string) {
    return this.adminService.getAgent(id);
  }

  @Post(['users', 'user'])
  createUser(@Body() dto: CreateAgentDto) {
    return this.adminService.createAgent(dto);
  }

  @Put(['users/:id', 'user/:id'])
  updateUser(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.adminService.updateAgent(id, dto);
  }

  @Delete(['users/:id', 'user/:id'])
  deleteUser(@Param('id') id: string, @Request() req: any) {
    return this.adminService.deleteAgent(id, req.user?.id || 'system');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TELEGRAM USERS ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  @Get('telegram-users')
  listTelegramUsers(@Query() query: AdminQueryDto) {
    return this.adminService.listTelegramUsers(query);
  }

  @Get('telegram-users/:id')
  getTelegramUser(@Param('id') id: string) {
    return this.adminService.getTelegramUser(id);
  }

  @Put('telegram-users/:id')
  updateTelegramUser(@Param('id') id: string, @Body() dto: UpdateTelegramUserDto) {
    return this.adminService.updateTelegramUser(id, dto);
  }

  @Delete('telegram-users/:id')
  deleteTelegramUser(@Param('id') id: string) {
    return this.adminService.deleteTelegramUser(id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TELEGRAM MESSAGES ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  @Get(['messages', 'message', 'telegram-messages'])
  listMessages(@Query() query: AdminQueryDto) {
    return this.adminService.listTelegramMessages(query);
  }

  @Get(['messages/:id', 'message/:id', 'telegram-messages/:id'])
  getTelegramMessage(@Param('id') id: string) {
    return this.adminService.getTelegramMessage(id);
  }

  @Delete(['messages/:id', 'message/:id', 'telegram-messages/:id'])
  deleteTelegramMessage(@Param('id') id: string) {
    return this.adminService.deleteTelegramMessage(id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIDEOS ENDPOINTS
  // ──────────────────────────────────────────────────────────────────────────

  @Get(['videos', 'video'])
  listVideos(@Query() query: AdminQueryDto) {
    return this.adminService.listVideos(query);
  }

  @Get(['videos/:id', 'video/:id'])
  getVideo(@Param('id') id: string) {
    return this.adminService.getVideo(id);
  }

  @Post(['videos', 'video'])
  createVideo(@Body() dto: AdminCreateVideoDto) {
    return this.adminService.createVideo(dto);
  }

  @Put(['videos/:id', 'video/:id'])
  updateVideo(@Param('id') id: string, @Body() dto: AdminUpdateVideoDto) {
    return this.adminService.updateVideo(id, dto);
  }

  @Delete(['videos/:id', 'video/:id'])
  deleteVideo(@Param('id') id: string) {
    return this.adminService.deleteVideo(id);
  }
}
