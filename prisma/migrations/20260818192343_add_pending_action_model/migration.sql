-- CreateTable
CREATE TABLE "PendingAction" (
    "id" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "context" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingAction_tokenHash_key" ON "PendingAction"("tokenHash");

-- CreateIndex
CREATE INDEX "PendingAction_expiresAt_idx" ON "PendingAction"("expiresAt");
