-- Add qualification pipeline status for competition teams.
-- Default QUALIFIED preserves existing enrollments as main-draw participants.

ALTER TABLE "competition_teams" ADD COLUMN "qualification_status" TEXT NOT NULL DEFAULT 'QUALIFIED';
