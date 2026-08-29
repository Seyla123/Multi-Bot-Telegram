import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LogsController } from './logs.controller';
import { SystemLogsController } from './system-logs.controller';
import { SystemLogsService } from './system-logs.service';
import { AdminGuard } from '../admin/guards/admin.guard';

@Module({
  imports: [PrismaModule],
  controllers: [SystemLogsController, LogsController],
  providers: [SystemLogsService, AdminGuard],
  exports: [SystemLogsService],
})
export class LogsModule {}
