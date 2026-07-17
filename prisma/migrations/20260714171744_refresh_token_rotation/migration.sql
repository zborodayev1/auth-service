/*
  Warnings:

  - You are about to drop the column `clientId` on the `RefreshToken` table. All the data in the column will be lost.
  - You are about to drop the column `refreshTokenHash` on the `Session` table. All the data in the column will be lost.
  - Added the required column `sessionId` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_clientId_fkey";

-- DropIndex
DROP INDEX "RefreshToken_clientId_idx";

-- DropIndex
DROP INDEX "Session_refreshTokenHash_key";

-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "clientId",
ADD COLUMN     "sessionId" UUID NOT NULL,
ADD COLUMN     "usedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "refreshTokenHash";

-- CreateIndex
CREATE INDEX "RefreshToken_sessionId_idx" ON "RefreshToken"("sessionId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE UNIQUE INDEX refresh_token_one_active
ON "RefreshToken" ("sessionId")
WHERE "usedAt" IS NULL;