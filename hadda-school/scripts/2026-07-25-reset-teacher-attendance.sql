-- One-off: reset teacher attendance to a clean slate.
-- APPLIED to production on 2026-07-25 — deleted 61 rows covering 2026-05-19 to
-- 2026-07-13 for 13 staff. Kept here as the record of what ran.
--
-- From now on this is done from the UI instead: Teacher Attendance →
-- "Reset All Teacher Attendance" (super admin only, writes an audit log entry).

DELETE FROM "TeacherAttendance";
