import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topnav from '@/components/layout/Topnav'
import { db } from '@/lib/db'
import { adminLinks, superAdminLinks } from '@/lib/nav-links'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'admin' && session.user.role !== 'super_admin') redirect('/')

  const notificationCount = await db.notification.count({
    where: { userId: session.user.id, readAt: null },
  })

  const isSuperAdmin = session.user.role === 'super_admin'
  const links = isSuperAdmin ? superAdminLinks : adminLinks
  const role = isSuperAdmin ? 'super_admin' : 'admin'

  return (
    <div className="min-h-screen bg-coffee-100">
      <Sidebar links={links} role={role} />
      <Topnav user={{ name: session.user.name!, role: session.user.role }} notificationCount={notificationCount} links={links} role={role} />
      <main className="ml-0 md:ml-64 pt-16 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}
