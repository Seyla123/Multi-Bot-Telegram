import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

import { getBotToken } from 'nestjs-telegraf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Mount the webhook middleware
  // (If webhook domain is provided in .env, Telegraf automatically sets it on Telegram's side,
  // and NestJS handles the incoming requests here.)
  const bot = app.get(getBotToken());
  app.use(bot.webhookCallback('/telegram-webhook'));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
