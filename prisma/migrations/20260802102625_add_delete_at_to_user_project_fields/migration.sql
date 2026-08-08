-- AlterTable
ALTER TABLE "ProjectField" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserFieldValue" ADD COLUMN     "deletedAt" TIMESTAMP(3);
