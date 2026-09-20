import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/permissions'

/**
 * The finance overview (income, expenses, balance) belongs to the super admin
 * only. Admins keep Fees — what students owe and pay — but not the school's
 * books, so every /admin/finance route is gated here rather than page by page.
 */
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  const permitted = session.user.role === 'super_admin' || await Promise.all([
    'finance_expenses_manage', 'finance_manual_income_manage', 'finance_extra_income_manage', 'finance_reports_view', 'finance_balance_view',
  ].map(permission => canAccess(session.user.id, session.user.role, permission as any))).then(results => results.some(Boolean))
  if (!permitted) redirect('/admin/dashboard?denied=1')

  return <>{children}</>
}
