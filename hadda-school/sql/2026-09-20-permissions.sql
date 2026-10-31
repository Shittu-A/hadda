-- Run once against the production Supabase PostgreSQL database before deploying
-- this release. Existing admin users receive all permissions to avoid lockout.
CREATE TYPE "Permission" AS ENUM (
  'students_manage','applications_manage','classes_manage','student_attendance_manage',
  'teacher_attendance_manage','attendance_photos_manage','leave_requests_manage','fees_manage',
  'fee_balances_view','memorization_manage','promotions_manage','reports_view',
  'teacher_profiles_manage','uploads_manage','communications_manage','activity_monitoring_view',
  'finance_expenses_manage','finance_manual_income_manage','finance_extra_income_manage',
  'finance_reports_view','finance_balance_view'
);
CREATE TABLE "UserPermission" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "permission" "Permission" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserPermission_userId_permission_key" ON "UserPermission"("userId", "permission");
CREATE INDEX "UserPermission_permission_idx" ON "UserPermission"("permission");
INSERT INTO "UserPermission" ("id", "userId", "permission")
SELECT concat('backfill_', u."id", '_', p.permission::text), u."id", p.permission
FROM "User" u CROSS JOIN unnest(enum_range(NULL::"Permission")) AS p(permission)
WHERE u."role" = 'admin'
ON CONFLICT ("userId", "permission") DO NOTHING;
