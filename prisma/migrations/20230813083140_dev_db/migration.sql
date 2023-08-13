/*
  Warnings:

  - You are about to drop the column `recieverID` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the `Queue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_recieverID_fkey";

-- DropForeignKey
ALTER TABLE "Queue" DROP CONSTRAINT "Queue_playerId_fkey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "recieverID";

-- DropTable
DROP TABLE "Queue";
