/*
  Warnings:

  - A unique constraint covering the columns `[userId,conversationId]` on the table `FrequentConversation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Invitation" ALTER COLUMN "updatedAt" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FrequentConversation_userId_conversationId_key" ON "FrequentConversation"("userId", "conversationId");
