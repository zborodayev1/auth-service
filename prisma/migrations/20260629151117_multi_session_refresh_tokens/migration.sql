-- DropIndex
DROP INDEX "RefreshToken_clientId_key";

-- CreateIndex
CREATE INDEX "RefreshToken_clientId_idx" ON "RefreshToken"("clientId");
