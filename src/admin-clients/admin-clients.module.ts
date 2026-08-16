import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';
import { AdminClientsController } from './admin-clients.controller';
import { AdminClientsService } from './admin-clients.service';

@Module({ imports: [AdminModule, AuthModule], controllers: [AdminClientsController], providers: [AdminClientsService] })
export class AdminClientsModule {}
