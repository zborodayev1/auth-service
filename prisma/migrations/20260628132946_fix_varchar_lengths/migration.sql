/*
  Warnings:

  - You are about to alter the column `email` on the `Client` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(254)`.
  - You are about to alter the column `passwordHash` on the `Client` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(60)`.

*/
-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "email" SET DATA TYPE VARCHAR(254),
ALTER COLUMN "passwordHash" SET DATA TYPE CHAR(60);
