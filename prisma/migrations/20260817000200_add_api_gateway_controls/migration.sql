ALTER TABLE `ApiToken`
  ADD COLUMN `description` VARCHAR(191) NULL,
  ADD COLUMN `environment` ENUM('LIVE', 'TEST') NOT NULL DEFAULT 'LIVE',
  ADD COLUMN `allowedIps` JSON NOT NULL,
  ADD COLUMN `rateLimitPerMin` INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN `dailyQuota` INTEGER NOT NULL DEFAULT 10000,
  ADD COLUMN `lastUsedIp` VARCHAR(191) NULL;
CREATE TABLE `ApiRequestLog` (
  `id` VARCHAR(191) NOT NULL, `clientId` VARCHAR(191) NOT NULL, `service` VARCHAR(191) NOT NULL,
  `statusCode` INTEGER NOT NULL, `latencyMs` INTEGER NOT NULL, `ipAddress` VARCHAR(191) NULL,
  `errorMessage` TEXT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), INDEX `ApiRequestLog_clientId_createdAt_idx`(`clientId`, `createdAt`),
  CONSTRAINT `ApiRequestLog_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `ApiToken`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
