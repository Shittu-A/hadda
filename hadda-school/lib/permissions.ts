import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import type { Permission, Role } from '@prisma/client'

export type PermissionKey = Permission

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

export async function hasPermission(userId: string, role: Role, permission: PermissionKey) {
  if (role === 'super_admin') return true
  if (role !== 'admin') return false
  const row = await db.userPermission.findUnique({ where: { userId_permission: { userId, permission } } })
  return !!row
}

export async function requirePermission(permission: PermissionKey) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!(await hasPermission(session.user.id, session.user.role, permission))) redirect('/admin/dashboard?denied=1')
  return session
}

export async function canAccess(userId: string, role: Role, permission: PermissionKey) {
  return hasPermission(userId, role, permission)
}
