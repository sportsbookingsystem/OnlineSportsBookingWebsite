-- AlterTable
ALTER TABLE "competitions" ADD COLUMN "sport_type" TEXT NOT NULL DEFAULT 'Multi-sport';

-- AlterTable
ALTER TABLE "competitions" ADD COLUMN "max_teams" INTEGER NOT NULL DEFAULT 8;
