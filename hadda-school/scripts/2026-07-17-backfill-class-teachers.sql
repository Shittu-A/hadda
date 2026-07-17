-- Backfill teacher assignments onto the current year's classes.
--
-- cloneClasses() used to copy only the class row, not its ClassTeacher links, so
-- classes cloned into the current year came out with no teachers. Once students
-- were promoted into those classes, every teacher's class-scoped view (fees,
-- dashboard) went empty. The code now clones the links; this repairs the rows
-- that were already created.
--
-- Matches old class -> new class by name (same rule cloneClasses uses).
-- Safe to run more than once: ON CONFLICT DO NOTHING.

-- STEP 1 — inspect first. Review this output before running the INSERT below.
select
  u.email,
  old_c.name  as class_name,
  old_y.name  as from_year,
  new_c.name  as to_class,
  new_y.name  as to_year,
  ct."isPrimary"
from "ClassTeacher" ct
join "ClassRoom"    old_c on old_c.id = ct."classId"
join "AcademicYear" old_y on old_y.id = old_c."academicYearId"
join "User"         u     on u.id = ct."userId"
join "AcademicYear" new_y on new_y."isCurrent" = true
join "ClassRoom"    new_c on new_c."academicYearId" = new_y.id
                         and lower(trim(new_c.name)) = lower(trim(old_c.name))
where old_y."isCurrent" = false
  and not exists (
    select 1 from "ClassTeacher" x
    where x."classId" = new_c.id and x."userId" = ct."userId"
  )
order by u.email, new_c.name;

-- STEP 2 — apply. Uncomment and run once the list above looks right.
-- insert into "ClassTeacher" ("classId", "userId", "isPrimary")
-- select distinct on (new_c.id, ct."userId")
--   new_c.id, ct."userId", ct."isPrimary"
-- from "ClassTeacher" ct
-- join "ClassRoom"    old_c on old_c.id = ct."classId"
-- join "AcademicYear" old_y on old_y.id = old_c."academicYearId"
-- join "AcademicYear" new_y on new_y."isCurrent" = true
-- join "ClassRoom"    new_c on new_c."academicYearId" = new_y.id
--                          and lower(trim(new_c.name)) = lower(trim(old_c.name))
-- where old_y."isCurrent" = false
-- on conflict ("classId", "userId") do nothing;
