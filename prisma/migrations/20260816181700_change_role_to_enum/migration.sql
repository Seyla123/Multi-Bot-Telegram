-- AlterTable: Modify role column to use ENUM
ALTER TABLE `Agent` MODIFY COLUMN `role` ENUM('ADMIN', 'AGENT') NOT NULL DEFAULT 'AGENT';
