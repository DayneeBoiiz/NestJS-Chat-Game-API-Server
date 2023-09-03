/*
  Warnings:

  - You are about to drop the column `score` on the `Match` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Match" DROP COLUMN "score",
ADD COLUMN     "player1Score" INTEGER,
ADD COLUMN     "player2Score" INTEGER;
