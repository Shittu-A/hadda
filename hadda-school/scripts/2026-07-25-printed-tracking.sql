-- Track whether an application form / admission letter has already been printed.
-- Run in the Supabase SQL Editor. Safe to re-run.
-- APPLIED to production on 2026-07-25 (purely additive, so old code ignored it).

-- AlterTable: an admin ticks "printed" on an application form. Opening the PDF
-- does not count — only the deliberate mark does.
ALTER TABLE "Applicant" ADD COLUMN IF NOT EXISTS "applicationFormPrintedAt"   TIMESTAMP(3);
ALTER TABLE "Applicant" ADD COLUMN IF NOT EXISTS "applicationFormPrintedById" TEXT;

-- AlterTable: same flag for the admission letter, which is printed per student
-- (both from the application and from the student page).
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "admissionLetterPrintedAt"   TIMESTAMP(3);
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "admissionLetterPrintedById" TEXT;
