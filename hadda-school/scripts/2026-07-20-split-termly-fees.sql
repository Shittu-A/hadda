-- Split existing termly fees into one charge per term.
--
-- Termly fees used to be a single FeeStructure row covering the whole year, so a
-- parent could only ever pay the lot. Each term is now its own row with its own
-- balance, which is what lets a parent pay for Term 1 and leave Term 2 owing.
--
-- The original row is KEPT and simply pinned to Term 1 — every FeePayment,
-- FeeAssignment and FeeDiscount already pointing at it stays valid. Only the
-- Term 2 and Term 3 rows are new, cloned at the same amount.
--
-- This is correct because a termly fee's "amount" already represents ONE term:
-- that is exactly how lib/fees/balance.ts values a term when pricing arrears.
--
-- Run AFTER 2026-07-20-terms-and-memorization.sql (it needs the terms to exist).
-- Safe to run more than once: already-split fees are skipped.

-- STEP 1 — inspect first. Review this output before running the writes below.
-- Each row listed here will become three: the existing one plus two clones.
select
  f.id            as fee_id,
  f.name          as fee_name,
  f.amount        as amount_per_term,
  y.name          as academic_year,
  f."isActive",
  (select count(*) from "FeePayment" p where p."feeStructureId" = f.id)    as existing_payments,
  (select count(*) from "FeeAssignment" a where a."feeStructureId" = f.id) as existing_assignments
from "FeeStructure" f
join "AcademicYear" y on y.id = f."academicYearId"
where f.frequency = 'termly'
  and f."isArrears" = false
  and f."termId" is null          -- not yet split
order by y.name, f.name;

-- STEP 2 — apply. Uncomment both statements and run once the list above looks right.

-- 2a. Pin each existing termly fee to that year's first term, and stamp a group id
--     so the admin UI can present the three terms as one fee.
-- update "FeeStructure" f
-- set "termId"      = t.id,
--     "termGroupId" = coalesce(f."termGroupId", f.id)
-- from "Term" t
-- where t."academicYearId" = f."academicYearId"
--   and t."order" = 1
--   and f.frequency = 'termly'
--   and f."isArrears" = false
--   and f."termId" is null;

-- 2b. Clone that row for every remaining term of the same year, same amount.
-- insert into "FeeStructure" (
--   "id", "academicYearId", "name", "amount", "frequency",
--   "isActive", "isArrears", "description", "termId", "termGroupId", "createdAt"
-- )
-- select
--   gen_random_uuid()::text,
--   f."academicYearId",
--   f.name,
--   f.amount,
--   f.frequency,
--   f."isActive",
--   false,
--   f.description,
--   t.id,
--   f."termGroupId",
--   CURRENT_TIMESTAMP
-- from "FeeStructure" f
-- join "Term" t on t."academicYearId" = f."academicYearId" and t."order" > 1
-- where f.frequency = 'termly'
--   and f."isArrears" = false
--   and f."termGroupId" is not null
--   and not exists (
--     select 1 from "FeeStructure" x
--     where x."termGroupId" = f."termGroupId" and x."termId" = t.id
--   );

-- 2c. Carry the assignments across. Without this the cloned terms would exist but
--     bill nobody — every FeeAssignment still points at the original (Term 1) row,
--     so students and classes would owe Term 1 only.
-- insert into "FeeAssignment" ("id", "feeStructureId", "studentId", "classId", "createdAt")
-- select
--   gen_random_uuid()::text,
--   sibling.id,
--   a."studentId",
--   a."classId",
--   CURRENT_TIMESTAMP
-- from "FeeAssignment" a
-- join "FeeStructure" orig    on orig.id = a."feeStructureId"
-- join "FeeStructure" sibling on sibling."termGroupId" = orig."termGroupId"
--                            and sibling.id <> orig.id
-- where orig."termGroupId" is not null
--   and not exists (
--     select 1 from "FeeAssignment" x
--     where x."feeStructureId" = sibling.id
--       and x."studentId" is not distinct from a."studentId"
--       and x."classId"   is not distinct from a."classId"
--   );

-- STEP 3 — verify. Every termly fee group should show one row per term, and each
-- term should carry the same number of assignments as the others.
-- select f.name, t.name as term, f.amount,
--        (select count(*) from "FeeAssignment" a where a."feeStructureId" = f.id) as assignments
-- from "FeeStructure" f
-- join "Term" t on t.id = f."termId"
-- where f."termGroupId" is not null
-- order by f.name, t."order";
