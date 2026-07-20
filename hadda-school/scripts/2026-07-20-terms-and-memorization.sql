-- Terms as real records, per-term fee charges, and termly memorization targets.
-- Run in the Supabase SQL Editor. Safe to re-run.

-- Table: Term (a session within an academic year — three per year by default)
CREATE TABLE IF NOT EXISTS "Term" (
  "id"             TEXT PRIMARY KEY,
  "academicYearId" TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "order"          INTEGER NOT NULL,
  "startDate"      TIMESTAMP(3) NOT NULL,
  "endDate"        TIMESTAMP(3) NOT NULL,
  "isCurrent"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Term_academicYearId_order_key" ON "Term" ("academicYearId", "order");
CREATE INDEX IF NOT EXISTS "Term_isCurrent_idx" ON "Term" ("isCurrent");

-- AlterTable: a termly fee is stored as one FeeStructure row per term, so each
-- term carries its own balance. "termGroupId" links the sibling rows so the
-- admin UI can still treat them as a single fee.
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "termId" TEXT;
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "termGroupId" TEXT;
CREATE INDEX IF NOT EXISTS "FeeStructure_termId_idx" ON "FeeStructure" ("termId");
CREATE INDEX IF NOT EXISTS "FeeStructure_termGroupId_idx" ON "FeeStructure" ("termGroupId");

-- Table: MemorizationTarget (one target + one grade per student per term).
-- Replaces day-to-day MemorizationLog entries. Those rows are left untouched.
CREATE TABLE IF NOT EXISTS "MemorizationTarget" (
  "id"              TEXT PRIMARY KEY,
  "studentId"       TEXT NOT NULL,
  "termId"          TEXT NOT NULL,
  "academicYearId"  TEXT NOT NULL,
  "teacherId"       TEXT NOT NULL,
  "surahFromId"     INTEGER NOT NULL,
  "ayahFrom"        INTEGER NOT NULL,
  "surahToId"       INTEGER NOT NULL,
  "ayahTo"          INTEGER NOT NULL,
  "targetPages"     DECIMAL(6,2) NOT NULL,
  "notes"           TEXT,
  "achievedPercent" DECIMAL(5,2),
  "grade"           TEXT,
  "remark"          TEXT,
  "gradedAt"        TIMESTAMP(3),
  "gradedById"      TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "MemorizationTarget_studentId_termId_key" ON "MemorizationTarget" ("studentId", "termId");
CREATE INDEX IF NOT EXISTS "MemorizationTarget_termId_idx" ON "MemorizationTarget" ("termId");
CREATE INDEX IF NOT EXISTS "MemorizationTarget_academicYearId_idx" ON "MemorizationTarget" ("academicYearId");

-- Backfill: give every existing academic year three terms by splitting its date
-- range into equal thirds. Schools can rename or re-date them afterwards in the
-- Terms screen. ON CONFLICT keeps this re-runnable.
INSERT INTO "Term" ("id", "academicYearId", "name", "order", "startDate", "endDate", "isCurrent")
SELECT
  gen_random_uuid()::text,
  y."id",
  t."name",
  t."order",
  y."startDate" + (((y."endDate" - y."startDate") * (t."order" - 1)) / 3),
  y."startDate" + (((y."endDate" - y."startDate") * t."order") / 3),
  false
FROM "AcademicYear" y
CROSS JOIN (VALUES ('First Term', 1), ('Second Term', 2), ('Third Term', 3)) AS t("name", "order")
ON CONFLICT ("academicYearId", "order") DO NOTHING;

-- Mark the term containing today as current, within the current academic year.
UPDATE "Term" SET "isCurrent" = false;
UPDATE "Term" SET "isCurrent" = true
WHERE "id" = (
  SELECT t."id"
  FROM "Term" t
  JOIN "AcademicYear" y ON y."id" = t."academicYearId"
  WHERE y."isCurrent" = true
  ORDER BY
    -- prefer the term whose range covers today, else the nearest upcoming one
    (CURRENT_TIMESTAMP BETWEEN t."startDate" AND t."endDate") DESC,
    t."order" ASC
  LIMIT 1
);
