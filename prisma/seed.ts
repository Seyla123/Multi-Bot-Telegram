import { PrismaClient, AgentRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial agent...');
  
  const email = 'admin@support.com';
  const existingAgent = await prisma.agent.findUnique({ where: { email } });
  
  if (existingAgent) {
    console.log('Agent already exists.');
    return;
  }
  
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const agent = await prisma.agent.create({
    data: {
      name: 'Admin Agent',
      email,
      passwordHash,
      role: AgentRole.ADMIN,
    },
  });
  
  console.log(`Agent created successfully! ID: ${agent.id}`);
  console.log(`Email: ${email}`);
  console.log(`Password: admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
