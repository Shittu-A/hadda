import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topnav from '@/components/layout/Topnav'
import { db } from '@/lib/db'
import {
  Users, GraduationCap, CalendarCheck, UserCheck, Banknote,
  BookOpen, ArrowUpCircle, Archive, BarChart3, LayoutDashboard, IdCard,
} from 'lucide-react'

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/admin/students', label: 'Students', icon: <GraduationCap size={18} /> },
  { href: '/admin/classes', label: 'Classes', icon: <Users size={18} /> },
  { href: '/admin/attendance/students', label: 'Student Attendance', icon: <CalendarCheck size={18} /> },
  { href: '/admin/attendance/teachers', label: 'Teacher Attendance', icon: <UserCheck size={18} /> },
  { href: '/admin/leave-requests', label: 'Leave Requests', icon: <CalendarCheck size={18} /> },
  { href: '/admin/fees', label: 'Fees', icon: <Banknote size={18} /> },
  { href: '/admin/memorization', label: 'Memorization', icon: <BookOpen size={18} /> },
  { href: '/admin/promotions', label: 'Promotions', icon: <ArrowUpCircle size={18} /> },
  { href: '/admin/alumni', label: 'Alumni', icon: <Archive size={18} /> },
  { href: '/admin/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
  { href: '/admin/teacher-profiles', label: 'Teacher Profiles', icon: <IdCard size={18} /> },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'admin' && session.user.role !== 'super_admin') redirect('/')

  const notificationCount = await db.notification.count({
    where: { userId: session.user.id, readAt: null },
  })

  return (
    <div className="min-h-screen bg-coffee-100">
      <Sidebar links={adminLinks} role="admin" />
      <Topnav user={{ name: session.user.name!, role: session.user.role }} notificationCount={notificationCount} />
      <main className="ml-0 md:ml-64 pt-16 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}
