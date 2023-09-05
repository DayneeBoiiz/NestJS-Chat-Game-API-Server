/*
  Warnings:

  - You are about to drop the column `isBlackListed` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isMute` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "isBlackListed",
DROP COLUMN "isMute";

-- CreateTable
CREATE TABLE "_mutedUsers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_mutedUsers_AB_unique" ON "_mutedUsers"("A", "B");

-- CreateIndex
CREATE INDEX "_mutedUsers_B_index" ON "_mutedUsers"("B");

-- AddForeignKey
ALTER TABLE "_mutedUsers" ADD CONSTRAINT "_mutedUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_mutedUsers" ADD CONSTRAINT "_mutedUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
