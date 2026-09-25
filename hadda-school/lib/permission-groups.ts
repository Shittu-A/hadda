// Client-safe: no db/auth imports, so client components (e.g. the new-user form)
// can import the permission list without pulling the Prisma/pg driver into the browser bundle.
import type { Permission } from '@prisma/client'

type PermissionKey = Permission

export const PERMISSION_GROUPS = [
  { label: 'Students & academics', items: [
    ['students_manage', 'Manage students'], ['applications_manage', 'Manage applications'],
    ['classes_manage', 'Manage classes'], ['memorization_manage', 'Manage memorization'],
    ['promotions_manage', 'Manage promotions'],
  ] },
  { label: 'Teachers', items: [
    ['student_attendance_manage', 'Manage student attendance'], ['teacher_attendance_manage', 'Manage teacher attendance'],
    ['attendance_photos_manage', 'Review class photos'], ['leave_requests_manage', 'Manage leave requests'],
    ['teacher_profiles_manage', 'Manage teacher profiles'], ['activity_monitoring_view', 'View activity monitoring'],
  ] },
  { label: 'Fees, reports & communication', items: [
    ['fees_manage', 'Manage fees and payments'], ['fee_balances_view', 'View student balances'],
    ['reports_view', 'View and export academic reports'], ['uploads_manage', 'Upload videos and media'],
    ['communications_manage', 'Send SMS and notifications'],
  ] },
  { label: 'Finance (separate controls)', items: [
    ['finance_expenses_manage', 'Manage expenses'], ['finance_manual_income_manage', 'Record manual income'],
    ['finance_extra_income_manage', 'Manage extra income'], ['finance_reports_view', 'View financial reports'],
    ['finance_balance_view', 'View overall balances'],
  ] },
] as const satisfies ReadonlyArray<{ label: string; items: readonly (readonly [PermissionKey, string])[] }>

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(group => group.items.map(([key]) => key))

// Any one of these opens the Finance section; each page then checks its own permission.
export const FINANCE_PAGE_PERMISSIONS = ['finance_balance_view', 'finance_expenses_manage', 'finance_manual_income_manage'] as const satisfies readonly PermissionKey[]
