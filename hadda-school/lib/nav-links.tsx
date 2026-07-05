import {
  LayoutDashboard, Users, CalendarRange, Calendar, Settings, ClipboardList,
  GraduationCap, UserCheck, CalendarCheck, Banknote, BookOpen, ArrowUpCircle,
  Archive, BarChart3, FileText, IdCard, CalendarDays, Camera, Coins, Inbox,
} from 'lucide-react'

export const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/admin/applications', label: 'Applications', icon: <Inbox size={18} /> },
  { href: '/admin/students', label: 'Students', icon: <GraduationCap size={18} /> },
  { href: '/admin/classes', label: 'Classes', icon: <Users size={18} /> },
  { href: '/admin/attendance/students', label: 'Student Attendance', icon: <CalendarCheck size={18} /> },
  { href: '/admin/attendance/teachers', label: 'Teacher Attendance', icon: <UserCheck size={18} /> },
  { href: '/admin/attendance/class-photos', label: 'Class Photos', icon: <Camera size={18} /> },
  { href: '/admin/leave-requests', label: 'Leave Requests', icon: <CalendarCheck size={18} /> },
  { href: '/admin/fees', label: 'Fees', icon: <Banknote size={18} /> },
  { href: '/admin/finance', label: 'Finance', icon: <Coins size={18} /> },
  { href: '/admin/memorization', label: 'Memorization', icon: <BookOpen size={18} /> },
  { href: '/admin/promotions', label: 'Promotions', icon: <ArrowUpCircle size={18} /> },
  { href: '/admin/alumni', label: 'Alumni', icon: <Archive size={18} /> },
  { href: '/admin/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
  { href: '/admin/teacher-profiles', label: 'Teacher Profiles', icon: <IdCard size={18} /> },
  { href: '/calendar-2026.pdf', label: 'School Calendar', icon: <CalendarDays size={18} /> },
]

export const superAdminLinks = [
  { href: '/super-admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/super-admin/users', label: 'Users', icon: <Users size={18} /> },
  { href: '/super-admin/academic-years', label: 'Academic Years', icon: <CalendarRange size={18} /> },
  { href: '/super-admin/events', label: 'Events', icon: <Calendar size={18} /> },
  { href: '/super-admin/settings', label: 'Settings', icon: <Settings size={18} /> },
  { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: <ClipboardList size={18} /> },
  // Admin features
  { href: '/admin/applications', label: 'Applications', icon: <Inbox size={18} /> },
  { href: '/admin/students', label: 'Students', icon: <GraduationCap size={18} /> },
  { href: '/admin/classes', label: 'Classes', icon: <Users size={18} /> },
  { href: '/admin/attendance/students', label: 'Student Attendance', icon: <CalendarCheck size={18} /> },
  { href: '/admin/attendance/teachers', label: 'Teacher Attendance', icon: <UserCheck size={18} /> },
  { href: '/admin/leave-requests', label: 'Leave Requests', icon: <FileText size={18} /> },
  { href: '/admin/fees', label: 'Fees', icon: <Banknote size={18} /> },
  { href: '/admin/finance', label: 'Finance', icon: <Coins size={18} /> },
  { href: '/admin/memorization', label: 'Memorization', icon: <BookOpen size={18} /> },
  { href: '/admin/promotions', label: 'Promotions', icon: <ArrowUpCircle size={18} /> },
  { href: '/admin/alumni', label: 'Alumni', icon: <Archive size={18} /> },
  { href: '/admin/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
]
