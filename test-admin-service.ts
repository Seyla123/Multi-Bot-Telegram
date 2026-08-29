import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AdminService } from './src/admin/admin.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminService);

  console.log('--- Testing listAgents ---');
  const agentsAsc = await adminService.listAgents({
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const agentsDesc = await adminService.listAgents({
    sortBy: 'name',
    sortOrder: 'desc',
  });
  console.log(
    'Agents ASC:',
    agentsAsc.data.map((u) => u.name),
  );
  console.log(
    'Agents DESC:',
    agentsDesc.data.map((u) => u.name),
  );

  console.log('--- Testing listBots ---');
  const botsAsc = await adminService.listBots({
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const botsDesc = await adminService.listBots({
    sortBy: 'name',
    sortOrder: 'desc',
  });
  console.log('Bots count:', botsAsc.data.length);

  console.log('--- Testing listTelegramUsers ---');
  const usersByName = await adminService.listTelegramUsers({
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const usersByStatus = await adminService.listTelegramUsers({
    sortBy: 'status',
    sortOrder: 'desc',
  });
  console.log('Users count:', usersByName.data.length);

  console.log('--- Testing listTelegramMessages ---');
  const msgsDirectionAsc = await adminService.listTelegramMessages({
    sortBy: 'direction',
    sortOrder: 'asc',
  });
  const msgsDirectionDesc = await adminService.listTelegramMessages({
    sortBy: 'direction',
    sortOrder: 'desc',
  });
  console.log('Messages direction ASC count:', msgsDirectionAsc.data.length);
  console.log('Messages direction DESC count:', msgsDirectionDesc.data.length);

  console.log('--- Testing listVideos ---');
  const videosAsc = await adminService.listVideos({
    sortBy: 'title',
    sortOrder: 'asc',
  });
  const videosDesc = await adminService.listVideos({
    sortBy: 'name',
    sortOrder: 'desc',
  });
  console.log('Videos count:', videosAsc.data.length);

  console.log('ALL SORTING TESTS PASSED WITHOUT ERROR!');
  await app.close();
}
bootstrap();
