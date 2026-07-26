import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 1000 messages started...');

  const userId = '1d62419e-4c4e-410b-8aa3-24e819924171';

  // Check if user exists
  const user = await prisma.telegramUser.findUnique({
    where: { id: userId },
  });

  if (!user) {
    console.log(`User with ID ${userId} not found.`);
    return;
  }

  const messages = Array.from({ length: 1000 }).map((_, i) => ({
    telegramUserId: userId,
    messageType: 'text',
    text: `This is dummy message ${i + 1} for testing pagination in chat.`,
    messageId: `msg_${userId}_${i + 1}_${Date.now()}`,
    status: i % 2 === 0 ? 'sent' : 'received',
  }));

  await prisma.telegramMessage.createMany({
    data: messages,
  });

  console.log('1000 messages seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
