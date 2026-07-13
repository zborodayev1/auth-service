/*
  Warnings:

  - You are about to alter the column `name` on the `ApiKey` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `name` on the `Client` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `name` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.

*/
-- AlterTable
ALTER TABLE "ApiKey" ALTER COLUMN "name" SET DATA TYPE VARCHAR(64);

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "name" SET DATA TYPE VARCHAR(64);

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "name" SET DATA TYPE VARCHAR(64);
