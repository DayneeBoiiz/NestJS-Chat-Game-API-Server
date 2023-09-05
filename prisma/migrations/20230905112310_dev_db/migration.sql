-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isBlackListed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMute" BOOLEAN NOT NULL DEFAULT false;
