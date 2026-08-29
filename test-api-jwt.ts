import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwt = app.get(JwtService);
  
  const token = jwt.sign({ sub: 'system', email: 'admin@system.local', role: 'ADMIN' });
  
  const resAsc = await fetch("http://localhost:3000/api/admin/agents?sortBy=name&sortOrder=asc", { headers: { "Authorization": `Bearer ${token}` } });
  const dataAsc = await resAsc.json();
  
  const resDesc = await fetch("http://localhost:3000/api/admin/agents?sortBy=name&sortOrder=desc", { headers: { "Authorization": `Bearer ${token}` } });
  const dataDesc = await resDesc.json();
  
  console.log("API ASC:", dataAsc);
  console.log("API DESC:", dataDesc.data.map(u => u.name));
  
  await app.close();
}
bootstrap();
