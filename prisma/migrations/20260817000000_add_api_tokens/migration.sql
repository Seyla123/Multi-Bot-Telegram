-- API tokens are stored only as SHA-256 hashes. The plaintext token is returned once at creation.
CREATE TABLE `ApiToken` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `type` ENUM('CLIENT', 'PERSONAL') NOT NULL,
    `abilities` JSON NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `agentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `ApiToken_tokenHash_key`(`tokenHash`),
    INDEX `ApiToken_agentId_idx`(`agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `ApiToken` ADD CONSTRAINT `ApiToken_agentId_fkey`
  FOREIGN KEY (`agentId`) REFERENCES `Agent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
