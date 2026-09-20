import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import type { Permission, Role } from '@prisma/client'

export type PermissionKey = Permission

export { PERMISSION_GROUPS, ALL_PERMISSIONS } from '@/lib/permission-groups'

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
