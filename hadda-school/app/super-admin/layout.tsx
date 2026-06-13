import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topnav from '@/components/layout/Topnav'
import { db } from '@/lib/db'
import { superAdminLinks } from '@/lib/nav-links'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'super_admin') redirect('/')

  const notificationCount = await db.notification.count({
    where: { userId: session.user.id, readAt: null },
  })

  return (
    <div className="min-h-screen bg-coffee-100">
      <Sidebar links={superAdminLinks} role="super_admin" />
      <Topnav user={{ name: session.user.name!, role: session.user.role }} notificationCount={notificationCount} links={superAdminLinks} role="super_admin" />
      <main className="ml-0 md:ml-64 pt-16 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}
