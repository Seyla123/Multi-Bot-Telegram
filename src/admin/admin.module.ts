import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { TelegramModule } from '../telegram/telegram.module';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService, AdminGuard],
})
export class AdminModule {}
