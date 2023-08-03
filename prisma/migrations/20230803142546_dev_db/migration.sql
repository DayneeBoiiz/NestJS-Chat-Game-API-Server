-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_ownerID_fkey";

-- AlterTable
ALTER TABLE "Room" ALTER COLUMN "ownerID" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_ownerID_fkey" FOREIGN KEY ("ownerID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
