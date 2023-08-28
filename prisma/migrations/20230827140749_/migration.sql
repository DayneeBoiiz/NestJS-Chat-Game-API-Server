-- AlterTable
ALTER TABLE "User" ADD COLUMN     "duration" INTEGER,
ALTER COLUMN "muteAt" DROP NOT NULL;
