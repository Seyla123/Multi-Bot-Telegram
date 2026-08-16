import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { AdminClientsService } from './admin-clients.service';
import { AdminClientQueryDto, CreateAdminClientDto, UpdateAdminClientDto } from './dto/admin-client.dto';

@Controller('admin/clients')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminClientsController {
  constructor(private readonly clients: AdminClientsService) {}
  @Get() list(@Query() query: AdminClientQueryDto) { return this.clients.list(query); }
  @Post() create(@Body() dto: CreateAdminClientDto) { return this.clients.create(dto); }
  @Get(':id/logs') logs(@Param('id') id: string, @Query('page') page?: string, @Query('limit') limit?: string) { return this.clients.logs(id, Number(page) || 1, Number(limit) || 30); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateAdminClientDto) { return this.clients.update(id, dto); }
  @Post(':id/regenerate') regenerate(@Param('id') id: string) { return this.clients.regenerate(id); }
  @Patch(':id/revoke') revoke(@Param('id') id: string) { return this.clients.toggleRevoke(id); }
  @Delete(':id') async remove(@Param('id') id: string) { await this.clients.remove(id); return { deleted: true }; }
}
