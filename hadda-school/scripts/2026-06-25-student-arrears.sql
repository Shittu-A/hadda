-- Previous-terms arrears: per-student "terms owing" + a reserved fee bucket for arrears payments.
-- Run in the Supabase SQL Editor.

-- AlterTable: Student gets a manual "terms owing from before this system" count + note
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "arrearsTerms" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "arrearsNote" TEXT;

-- AlterTable: mark a FeeStructure as the reserved arrears bucket
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "isArrears" BOOLEAN NOT NULL DEFAULT false;
