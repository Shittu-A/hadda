import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

/**
 * The finance overview (income, expenses, balance) belongs to the super admin
 * only. Admins keep Fees — what students owe and pay — but not the school's
 * books, so every /admin/finance route is gated here rather than page by page.
 */
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'super_admin') redirect('/admin/dashboard')

  return <>{children}</>
}
