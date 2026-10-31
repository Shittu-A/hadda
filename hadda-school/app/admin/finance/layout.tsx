import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserPermissions, FINANCE_PAGE_PERMISSIONS } from '@/lib/permissions'

/**
 * The school's books are super-admin only unless an admin has been granted one
 * of the finance permissions. Each page then checks its own permission.
 */
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  const granted = await getUserPermissions(session.user.id, session.user.role)
  if (!FINANCE_PAGE_PERMISSIONS.some(p => granted.has(p))) redirect('/admin/dashboard?denied=1')

  return <>{children}</>
}
