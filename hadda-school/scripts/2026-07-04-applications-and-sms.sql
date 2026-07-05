-- Online admission applications + SMS log.
-- Run in the Supabase SQL Editor.

-- Enum: application lifecycle
DO $$ BEGIN
  CREATE TYPE "ApplicationStatus" AS ENUM ('submitted', 'shortlisted', 'interviewed', 'accepted', 'rejected', 'enrolled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Table: Applicant (public online application form submissions)
CREATE TABLE IF NOT EXISTS "Applicant" (
  "id"               TEXT PRIMARY KEY,
  "fullName"         TEXT NOT NULL,
  "gender"           TEXT,
  "maritalStatus"    TEXT,
  "dateOfBirth"      TIMESTAMP(3),
  "residence"        TEXT,
  "phone"            TEXT,
  "hizbMemorized"    INTEGER,
  "formerSchool"     TEXT,
  "reasonForLeaving" TEXT,
  "guardianName"     TEXT,
  "guardianPhone"    TEXT,
  "photoUrl"         TEXT,
  "status"           "ApplicationStatus" NOT NULL DEFAULT 'submitted',
  "interviewNotes"   TEXT,
  "reviewedById"     TEXT,
  "academicYearId"   TEXT,
  "assignedClassId"  TEXT,
  "admissionNumber"  TEXT,
  "studentId"        TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Applicant_status_idx" ON "Applicant" ("status");
CREATE INDEX IF NOT EXISTS "Applicant_createdAt_idx" ON "Applicant" ("createdAt");

-- Table: SmsLog (audit trail / queue for every SMS attempt)
CREATE TABLE IF NOT EXISTS "SmsLog" (
  "id"                TEXT PRIMARY KEY,
  "toPhone"           TEXT NOT NULL,
  "body"              TEXT NOT NULL,
  "purpose"           TEXT NOT NULL,
  "studentId"         TEXT,
  "status"            TEXT NOT NULL DEFAULT 'queued',
  "provider"          TEXT,
  "providerReference" TEXT,
  "error"             TEXT,
  "createdById"       TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SmsLog_status_idx" ON "SmsLog" ("status");
CREATE INDEX IF NOT EXISTS "SmsLog_createdAt_idx" ON "SmsLog" ("createdAt");
