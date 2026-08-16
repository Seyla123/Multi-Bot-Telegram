-- AlterTable: Update existing lowercase values to uppercase
UPDATE `Agent` SET `role` = 'AGENT' WHERE `role` = 'agent';
UPDATE `Agent` SET `role` = 'ADMIN' WHERE `role` = 'admin';

-- AlterTable: Modify role column to use ENUM
ALTER TABLE `Agent` MODIFY COLUMN `role` ENUM('ADMIN', 'AGENT') NOT NULL DEFAULT 'AGENT';
