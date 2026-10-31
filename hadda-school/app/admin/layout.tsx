import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topnav from '@/components/layout/Topnav'
import { db } from '@/lib/db'
import { adminLinks, superAdminLinks } from '@/lib/nav-links'
import { getUserPermissions } from '@/lib/permissions'
import { Presentation } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'admin' && session.user.role !== 'super_admin') redirect('/')

  const [notificationCount, teachingClasses] = await Promise.all([
    db.notification.count({ where: { userId: session.user.id, readAt: null } }),
    db.classTeacher.count({ where: { userId: session.user.id, class: { academicYear: { isCurrent: true } } } }),
  ])

  const isSuperAdmin = session.user.role === 'super_admin'
  const granted = isSuperAdmin ? null : await getUserPermissions(session.user.id, session.user.role)
  // A link's `permission` is one key, or a list where any one grants it.
  const links = isSuperAdmin ? superAdminLinks : adminLinks.filter(link =>
    !('permission' in link) || !link.permission || ([] as string[]).concat(link.permission).some(p => granted!.has(p as any))
  )
  const role = isSuperAdmin ? 'super_admin' : 'admin'
  // An admin who also teaches uses the same login for the teacher portal
  // (attendance, class photo clock-in, memorization) instead of a second account.
  const navLinks = teachingClasses > 0
    ? [...links, { href: '/teacher', label: 'My Teaching', icon: <Presentation size={18} /> }]
    : links

  return (
    <div className="min-h-screen bg-coffee-100">
      <Sidebar links={navLinks} role={role} />
      <Topnav user={{ name: session.user.name!, role: session.user.role }} notificationCount={notificationCount} links={navLinks} role={role} />
      <main className="ml-0 md:ml-64 pt-16 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}
