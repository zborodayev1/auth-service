/*
  Warnings:

  - A unique constraint covering the columns `[projectId]` on the table `UserSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `projectId` to the `UserSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN     "projectId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_projectId_key" ON "UserSession"("projectId");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
