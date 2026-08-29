import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const asc = await prisma.agent.findMany({ orderBy: { name: 'asc' }, select: { name: true } });
  const desc = await prisma.agent.findMany({ orderBy: { name: 'desc' }, select: { name: true } });
  console.log("ASC:", asc.map(a => a.name));
  console.log("DESC:", desc.map(a => a.name));
}
main().catch(console.error).finally(() => prisma.$disconnect());
