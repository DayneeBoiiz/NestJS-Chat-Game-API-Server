/*
  Warnings:

  - You are about to drop the column `duration` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isMute` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `muteAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "duration",
DROP COLUMN "isMute",
DROP COLUMN "muteAt";
