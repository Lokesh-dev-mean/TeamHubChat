-- AlterTable
ALTER TABLE "MediaFile" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "messageVector" tsvector;

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RateLimitLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "limit" INTEGER NOT NULL,
    "current" INTEGER NOT NULL,
    "ttl" INTEGER NOT NULL,

    CONSTRAINT "RateLimitLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitLog_tenantId_timestamp_idx" ON "RateLimitLog"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "RateLimitLog_userId_timestamp_idx" ON "RateLimitLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "RateLimitLog_ipAddress_timestamp_idx" ON "RateLimitLog"("ipAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MediaFile_uploadedById_uploadedAt_idx" ON "MediaFile"("uploadedById", "uploadedAt");

-- CreateIndex
CREATE INDEX "Message_messageVector_idx" ON "Message" USING GIN ("messageVector");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLimitLog" ADD CONSTRAINT "RateLimitLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLimitLog" ADD CONSTRAINT "RateLimitLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
