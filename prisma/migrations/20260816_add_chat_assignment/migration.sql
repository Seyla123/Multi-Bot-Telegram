-- AlterTable
ALTER TABLE `TelegramUser` ADD COLUMN `assignedAgentId` VARCHAR(191) NULL,
    ADD COLUMN `conversationStatus` VARCHAR(191) NOT NULL DEFAULT 'OPEN';

-- AddForeignKey
ALTER TABLE `TelegramUser` ADD CONSTRAINT `TelegramUser_assignedAgentId_fkey` FOREIGN KEY (`assignedAgentId`) REFERENCES `Agent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
