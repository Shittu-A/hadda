import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topnav from '@/components/layout/Topnav'
import { db } from '@/lib/db'
import { LayoutDashboard, CalendarCheck, Clock, BookOpen, FileText } from 'lucide-react'

const teacherLinks = [
  { href: '/teacher', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/teacher/attendance', label: 'Take Attendance', icon: <CalendarCheck size={18} /> },
  { href: '/teacher/attendance/history', label: 'Attendance History', icon: <Clock size={18} /> },
  { href: '/teacher/memorization', label: 'Memorization Logs', icon: <BookOpen size={18} /> },
  { href: '/teacher/leave', label: 'Leave Requests', icon: <FileText size={18} /> },
]

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'teacher' && session.user.role !== 'admin' && session.user.role !== 'super_admin') redirect('/')

  const notificationCount = await db.notification.count({
    where: { userId: session.user.id, readAt: null },
  })

  return (
    <div className="min-h-screen bg-coffee-100">
      <Sidebar links={teacherLinks} role="teacher" />
      <Topnav user={{ name: session.user.name!, role: session.user.role }} notificationCount={notificationCount} />
      <main className="ml-64 pt-16 p-8">
        {children}
      </main>
    </div>
  )
}
