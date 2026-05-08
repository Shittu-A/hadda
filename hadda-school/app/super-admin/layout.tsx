import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topnav from '@/components/layout/Topnav'
import { db } from '@/lib/db'
import {
  LayoutDashboard, Users, CalendarRange, Calendar, Settings, ClipboardList,
  GraduationCap, UserCheck, CalendarCheck, Banknote, BookOpen, ArrowUpCircle,
  Archive, BarChart3, FileText,
} from 'lucide-react'

const superAdminLinks = [
  { href: '/super-admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/super-admin/users', label: 'Users', icon: <Users size={18} /> },
  { href: '/super-admin/academic-years', label: 'Academic Years', icon: <CalendarRange size={18} /> },
  { href: '/super-admin/events', label: 'Events', icon: <Calendar size={18} /> },
  { href: '/super-admin/settings', label: 'Settings', icon: <Settings size={18} /> },
  { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: <ClipboardList size={18} /> },
  // Admin features
  { href: '/admin/students', label: 'Students', icon: <GraduationCap size={18} /> },
  { href: '/admin/classes', label: 'Classes', icon: <Users size={18} /> },
  { href: '/admin/attendance/students', label: 'Student Attendance', icon: <CalendarCheck size={18} /> },
  { href: '/admin/attendance/teachers', label: 'Teacher Attendance', icon: <UserCheck size={18} /> },
  { href: '/admin/leave-requests', label: 'Leave Requests', icon: <FileText size={18} /> },
  { href: '/admin/fees', label: 'Fees', icon: <Banknote size={18} /> },
  { href: '/admin/memorization', label: 'Memorization', icon: <BookOpen size={18} /> },
  { href: '/admin/promotions', label: 'Promotions', icon: <ArrowUpCircle size={18} /> },
  { href: '/admin/alumni', label: 'Alumni', icon: <Archive size={18} /> },
  { href: '/admin/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
]

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
      <Topnav user={{ name: session.user.name!, role: session.user.role }} notificationCount={notificationCount} />
      <main className="ml-64 pt-16 p-8">
        {children}
      </main>
    </div>
  )
}
