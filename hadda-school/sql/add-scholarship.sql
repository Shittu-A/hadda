-- Adds student-level scholarship support (run in Supabase SQL Editor).
-- Scholarship students owe no fees and are skipped by "apply to all paying students".

ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "scholarship" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "scholarshipNote" TEXT;
