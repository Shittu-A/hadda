import NextAuth from 'next-auth'
import { authConfig } from './lib/auth.config'
import { NextResponse } from 'next/server'

const permissionRoutes: Array<[string, string]> = [
  ['/admin/activity-monitoring', 'activity_monitoring_view'],
  ['/admin/finance/expenses', 'finance_expenses_manage'],
  ['/admin/finance/income', 'finance_manual_income_manage'],
  ['/admin/finance', 'finance_balance_view'],
  ['/admin/applications', 'applications_manage'], ['/admin/students', 'students_manage'],
  ['/admin/alumni', 'students_manage'], ['/admin/classes', 'classes_manage'],
  ['/admin/attendance/students', 'student_attendance_manage'], ['/admin/attendance/teachers', 'teacher_attendance_manage'],
  ['/admin/attendance/class-photos', 'attendance_photos_manage'], ['/admin/leave-requests', 'leave_requests_manage'],
  ['/admin/fees', 'fees_manage'], ['/admin/memorization', 'memorization_manage'], ['/admin/promotions', 'promotions_manage'],
  ['/admin/reports', 'reports_view'], ['/admin/teacher-profiles', 'teacher_profiles_manage'],
  ['/api/reports/', 'reports_view'], ['/api/upload', 'uploads_manage'],
]

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  const isPublic =
    pathname === '/' ||
    pathname === '/events' ||
    pathname.startsWith('/events/') ||
    pathname === '/pay' ||
    pathname.startsWith('/pay/') ||
    pathname === '/apply' ||
    pathname === '/teachers' ||
    pathname.startsWith('/api/pay/') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/deactivated'

  if (isPublic) return NextResponse.next()

  const redirectTo = (path: string) => {
    const url = req.nextUrl.clone()
    url.pathname = path
    return NextResponse.redirect(url)
  }

  if (!session) {
    return redirectTo('/login')
  }

  if (!session.user.isActive && pathname !== '/deactivated') {
    return redirectTo('/deactivated')
  }

  const role = session.user.role

  if (pathname.startsWith('/super-admin') && role !== 'super_admin') {
    return redirectTo('/')
  }

  if (pathname.startsWith('/admin') && role !== 'admin' && role !== 'super_admin') {
    return redirectTo('/')
  }

  if (pathname.startsWith('/teacher') && role !== 'teacher' && role !== 'admin' && role !== 'super_admin') {
    return redirectTo('/')
  }

  const requiredPermission = permissionRoutes.find(([prefix]) => pathname.startsWith(prefix))?.[1]
  if (requiredPermission && role !== 'super_admin' && !(session.user.permissions ?? []).includes(requiredPermission)) {
    return redirectTo('/admin/dashboard?denied=1')
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|pdf)).*)'],
}
