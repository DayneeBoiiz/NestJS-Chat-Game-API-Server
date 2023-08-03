/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `Room` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "isGroup" BOOLEAN,
ADD COLUMN     "uid" TEXT,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "isPrivate" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Room_uid_key" ON "Room"("uid");
