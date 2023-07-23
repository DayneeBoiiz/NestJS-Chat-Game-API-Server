/*
  Warnings:

  - You are about to drop the column `createdAT` on the `BlockedTokens` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BlockedTokens" DROP COLUMN "createdAT",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
