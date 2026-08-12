-- Reserved fee buckets for the registration fee and form fee, auto-assigned to every new student at enrollment.
-- Run in the Supabase SQL Editor.
-- APPLIED to production on 2026-08-12.

ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "isRegistrationFee" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "isFormFee" BOOLEAN NOT NULL DEFAULT false;
