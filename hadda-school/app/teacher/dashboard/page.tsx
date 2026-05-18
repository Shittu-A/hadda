import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { GraduationCap, CalendarCheck, FileText, BookOpen } from 'lucide-react'

const QUALITY_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  excellent: 'success',
  good: 'info',
  average: 'warning',
  weak: 'danger',
}

export default async function TeacherDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [teacherClasses, pendingLeaves, recentLogs, upcomingEvents] = await Promise.all([
    db.classTeacher.findMany({
      where: { userId: session.user.id },
      include: {
        class: {
          include: {
            _count: { select: { students: { where: { deletedAt: null, status: 'active' } } } },
          },
        },
      },
    }),
    db.leaveRequest.count({ where: { userId: session.user.id, status: 'pending' } }),
    db.memorizationLog.findMany({
      where: { teacherId: session.user.id },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { firstName: true, lastName: true } },
        surahFrom: { select: { nameEnglish: true } },
        surahTo: { select: { nameEnglish: true } },
      },
    }),
    db.event.findMany({
      where: { isPublished: true, eventDate: { gte: today } },
      orderBy: { eventDate: 'asc' },
      take: 3,
    }),
  ])

  const classIds = teacherClasses.map((tc) => tc.classId)

  const todayAttendanceTaken = classIds.length > 0
    ? await db.studentAttendance.count({ where: { classId: { in: classIds }, date: today } })
    : 0

  const totalStudents = teacherClasses.reduce((acc, tc) => acc + (tc.class._count?.students ?? 0), 0)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">
          Good day, {session.user.name?.split(' ')[0]}!
        </h1>
        <p className="text-coffee-500 text-sm mt-0.5">{formatDate(new Date())}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-coffee-200 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-coffee-50 rounded-xl text-coffee-700 shrink-0">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-coffee-900">{totalStudents}</p>
            <p className="text-xs text-coffee-500">Students in your class{teacherClasses.length !== 1 ? 'es' : ''}</p>
          </div>
        </div>

        <Link
          href="/teacher/attendance"
          className={`bg-white border rounded-xl p-4 flex items-center gap-3 hover:border-coffee-300 transition-colors ${
            todayAttendanceTaken > 0 ? 'border-green-200' : 'border-amber-200'
          }`}
        >
          <div className={`p-2.5 rounded-xl shrink-0 ${todayAttendanceTaken > 0 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
            <CalendarCheck size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-coffee-900">{todayAttendanceTaken > 0 ? 'Done' : 'Pending'}</p>
            <p className="text-xs text-coffee-500">Today&apos;s attendance</p>
          </div>
        </Link>

        <Link
          href="/teacher/leave"
          className="bg-white border border-coffee-200 rounded-xl p-4 flex items-center gap-3 hover:border-coffee-300 transition-colors"
        >
          <div className="p-2.5 bg-coffee-50 rounded-xl text-coffee-700 shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-coffee-900">{pendingLeaves}</p>
            <p className="text-xs text-coffee-500">Pending leave request{pendingLeaves !== 1 ? 's' : ''}</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions + My classes */}
        <div className="space-y-4">
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
            <h2 className="font-semibold text-coffee-800 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: '/teacher/attendance', label: 'Take Today\'s Attendance' },
                { href: '/teacher/memorization', label: 'Log Memorization Session' },
                { href: '/teacher/attendance/history', label: 'Attendance History' },
                { href: '/teacher/leave', label: 'Submit Leave Request' },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="block px-3 py-2 rounded-lg bg-coffee-50 text-coffee-700 text-sm hover:bg-coffee-100 transition-colors"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {teacherClasses.length > 0 && (
            <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
              <h2 className="font-semibold text-coffee-800 mb-3">My Classes</h2>
              <div className="space-y-2">
                {teacherClasses.map((tc) => (
                  <div key={tc.classId} className="flex items-center justify-between p-2.5 bg-coffee-50 rounded-lg">
                    <span className="font-medium text-coffee-900 text-sm">{tc.class.name}</span>
                    <span className="text-coffee-500 text-xs">{tc.class._count?.students ?? 0} students</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent memorization logs */}
        <div className="lg:col-span-2 bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
            <h2 className="font-semibold text-coffee-800">Recent Memorization Logs</h2>
            <Link href="/teacher/memorization" className="text-xs text-coffee-400 hover:text-coffee-700">
              View all →
            </Link>
          </div>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-coffee-400 text-sm">
              No memorization logs yet.{' '}
              <Link href="/teacher/memorization" className="text-coffee-600 underline underline-offset-2">
                Log a session
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-coffee-50 rounded-xl">
                  <div className="p-2 bg-white rounded-lg text-coffee-600 shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <p className="font-medium text-coffee-900 text-sm truncate">
                        {log.student.firstName} {log.student.lastName}
                      </p>
                      <span className="text-xs text-coffee-400 capitalize shrink-0">{log.type}</span>
                    </div>
                    <p className="text-xs text-coffee-500 mt-0.5">
                      {log.surahFrom.nameEnglish} :{log.ayahFrom} → {log.surahTo.nameEnglish} :{log.ayahTo}
                      {' · '}{Number(log.pages).toFixed(2)} pages
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant={QUALITY_VARIANT[log.quality]}>{log.quality}</Badge>
                    <p className="text-xs text-coffee-400 mt-1">{formatDate(log.logDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-coffee-800 mb-3">Upcoming Events</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {upcomingEvents.map((e) => (
              <div key={e.id} className="bg-coffee-50 rounded-xl p-4">
                <p className="text-xs font-medium text-coffee-500 mb-1">{formatDate(e.eventDate)}</p>
                <p className="font-semibold text-coffee-900 text-sm">{e.title}</p>
                {e.description && (
                  <p className="text-xs text-coffee-400 mt-1 line-clamp-2">{e.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
