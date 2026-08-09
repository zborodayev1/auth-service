-- DropIndex
DROP INDEX "ProjectField_projectId_name_key";

-- DropIndex
DROP INDEX "UserFieldValue_userId_fieldId_key";

-- CreatePartialIndex
CREATE UNIQUE INDEX "ProjectField_projectId_name_active_idx"
ON "ProjectField" ("projectId", "name")
WHERE "deletedAt" IS NULL;

-- CreatePartialIndex
CREATE UNIQUE INDEX "UserFieldValue_userId_fieldId_active_idx"
ON "UserFieldValue" ("userId", "fieldId")
WHERE "deletedAt" IS NULL;
