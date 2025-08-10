/*
  Warnings:

  - You are about to drop the column `domain` on the `Tenant` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Tenant_domain_key";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "domain";
