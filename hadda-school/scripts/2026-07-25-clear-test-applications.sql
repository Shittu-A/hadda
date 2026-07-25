-- One-off: remove the four test online applications left over from July 2026.
-- APPLIED to production on 2026-07-25 — kept here as the record of what ran.
--
-- Three of them were "enrolled" and point at real Student rows
-- (HMS-2026-1243/1244/1245). Those students are deliberately left alone; only
-- the application rows go, so the Applications page starts empty.

DELETE FROM "Applicant"
WHERE "id" IN (
  'cmrhf01mn000204jgaty0hmlk', -- SANI garba      (enrolled)
  'cmrhecy5d000004lfrj6ymq2e', -- Abubakar fadil  (rejected)
  'cmrhdy7av000004l53ptmqfw9', -- SANI            (enrolled)
  'cmradoy22000u04jxlzc83v4j'  -- SANI MUSA       (enrolled)
);
