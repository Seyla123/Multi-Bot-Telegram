import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AuthService } from './src/auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  const tokenRes = await authService.login({
    email: 'admin@system.local',
    password: 'password',
  });
  const token = tokenRes.data.accessToken;
  console.log('TOKEN:', token);

  const resAsc = await fetch(
    'http://localhost:3000/api/admin/agents?sortBy=name&sortOrder=asc',
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const dataAsc: any = await resAsc.json();

  const resDesc = await fetch(
    'http://localhost:3000/api/admin/agents?sortBy=name&sortOrder=desc',
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const dataDesc: any = await resDesc.json();

  console.log(
    'API ASC:',
    dataAsc.data?.map((u: any) => u.name),
  );
  console.log(
    'API DESC:',
    dataDesc.data?.map((u: any) => u.name),
  );

  await app.close();
}
bootstrap();
