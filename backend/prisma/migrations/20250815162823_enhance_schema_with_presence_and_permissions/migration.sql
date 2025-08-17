/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `permissions` on the `Role` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[domain]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,roleId,tenantId]` on the table `UserRole` will be added. If there are existing duplicate values, this will fail.
*/

-- First add nullable columns
ALTER TABLE "Tenant" ADD COLUMN "domain" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "slug" TEXT;

-- Update existing records with generated slugs
WITH numbered_tenants AS (
  SELECT 
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) ORDER BY id) as rn
  FROM "Tenant"
)
UPDATE "Tenant" t
SET slug = CASE 
  WHEN nt.rn = 1 THEN LOWER(REGEXP_REPLACE(t.name, '[^a-zA-Z0-9]+', '-', 'g'))
  ELSE LOWER(REGEXP_REPLACE(t.name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || nt.rn::text
END
FROM numbered_tenants nt
WHERE t.id = nt.id;

-- Make slug required after data is populated
ALTER TABLE "Tenant" ALTER COLUMN "slug" SET NOT NULL;

-- Handle TenantConnection.initiatedBy
ALTER TABLE "TenantConnection" ADD COLUMN "initiatedBy" TEXT;
UPDATE "TenantConnection" SET "initiatedBy" = "tenantId";
ALTER TABLE "TenantConnection" ALTER COLUMN "initiatedBy" SET NOT NULL;

-- Handle UserRole.tenantId
ALTER TABLE "UserRole" ADD COLUMN "tenantId" TEXT;
UPDATE "UserRole" ur 
SET "tenantId" = u."tenantId" 
FROM "User" u 
WHERE ur."userId" = u."id";
ALTER TABLE "UserRole" ALTER COLUMN "tenantId" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "UserRole_userId_roleId_key";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "userAgent" TEXT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "description" TEXT,
ADD COLUMN "topic" TEXT;

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "role" TEXT NOT NULL DEFAULT 'member';

-- AlterTable
ALTER TABLE "MediaFile" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "fileUrl",
ADD COLUMN "parentId" TEXT,
ADD COLUMN "threadId" TEXT;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "permissions";

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "lastSeenAt" TIMESTAMP(3),
ADD COLUMN "onlineStatus" TEXT NOT NULL DEFAULT 'offline',
ADD COLUMN "phoneNumber" TEXT;

-- CreateTable
CREATE TABLE "MessageRead" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageMediaFile" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "mediaFileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageMediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageRead_messageId_idx" ON "MessageRead"("messageId");

-- CreateIndex
CREATE INDEX "MessageRead_userId_idx" ON "MessageRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageRead_messageId_userId_key" ON "MessageRead"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageMediaFile_messageId_mediaFileId_key" ON "MessageMediaFile"("messageId", "mediaFileId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_tenantId_name_idx" ON "Conversation"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Conversation_createdAt_idx" ON "Conversation"("createdAt");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_userId_idx" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "FrequentConversation_userId_accessCount_idx" ON "FrequentConversation"("userId", "accessCount");

-- CreateIndex
CREATE INDEX "Invitation_inviteToken_idx" ON "Invitation"("inviteToken");

-- CreateIndex
CREATE INDEX "MediaFile_tenantId_idx" ON "MediaFile"("tenantId");

-- CreateIndex
CREATE INDEX "MediaFile_uploadedAt_idx" ON "MediaFile"("uploadedAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_threadId_idx" ON "Message"("threadId");

-- CreateIndex
CREATE INDEX "MessageReaction_messageId_userId_idx" ON "MessageReaction"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_domain_idx" ON "Tenant"("domain");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "TypingIndicator_conversationId_idx" ON "TypingIndicator"("conversationId");

-- CreateIndex
CREATE INDEX "TypingIndicator_userId_idx" ON "TypingIndicator"("userId");

-- CreateIndex
CREATE INDEX "User_tenantId_email_idx" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "User_lastSeenAt_idx" ON "User"("lastSeenAt");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_tenantId_key" ON "UserRole"("userId", "roleId", "tenantId");

-- AddForeignKey
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageMediaFile" ADD CONSTRAINT "MessageMediaFile_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageMediaFile" ADD CONSTRAINT "MessageMediaFile_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;