/*
  Warnings:

  - A unique constraint covering the columns `[isPrivateKey]` on the table `Room` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "isPrivateKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Room_isPrivateKey_key" ON "Room"("isPrivateKey");
