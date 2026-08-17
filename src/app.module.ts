import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { EmailsModule } from './emails/emails.module';
import { PrismaModule } from './prisma/prisma.module';
import { VideosModule } from './videos/videos.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramModule } from './telegram/telegram.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PusherModule } from './pusher/pusher.module';
import { LogsModule } from './logs/logs.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { ClientServiceModule } from './client-service/client-service.module';
import { AdminClientsModule } from './admin-clients/admin-clients.module';

@Module({
  imports: [
    ServeStaticModule.forRoot(
      {
        rootPath: join(process.cwd(), 'client/dist'),
        exclude: [
          '/api/{*any}',
          '/telegram/{*any}',
          '/storage/{*any}',
          '/logs/{*any}',
          '/logs',
          '/auth/{*any}',
        ],
      },
      {
        rootPath: join(process.cwd(), 'storage'),
        serveRoot: '/storage',
        exclude: [
          '/api/{*any}',
          '/telegram/{*any}',
          '/auth/{*any}',
        ],
      },
    ),
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    EmailsModule,
    PrismaModule,
    VideosModule,
    TelegramModule,
    PusherModule,
    LogsModule,
    AuthModule,
    AdminModule,
    ClientServiceModule,
    AdminClientsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
