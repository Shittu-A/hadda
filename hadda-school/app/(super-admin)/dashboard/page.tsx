import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Users, GraduationCap, Banknote, ClipboardList, BookOpen, CalendarCheck } from 'lucide-react'

export default async function SuperAdminDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    totalStudents,
    totalUsers,
    totalAuditLogs,
    feesTotal,
    recentAuditLogs,
    upcomingEvents,
    totalMemoToday,
    pendingLeaves,
  ] = await Promise.all([
    db.student.count({ where: { status: 'active', deletedAt: null } }),
    db.user.count({ where: { isActive: true } }),
    db.auditLog.count(),
    db.feePayment.aggregate({ _sum: { amountPaid: true } }),
    db.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    }),
    db.event.findMany({
      where: { isPublished: true, eventDate: { gte: today } },
      orderBy: { eventDate: 'asc' },
      take: 4,
    }),
    db.memorizationLog.count({ where: { createdAt: { gte: today } } }),
    db.leaveRequest.count({ where: { status: 'pending' } }),
  ])

  const stats = [
    { label: 'Active Students', value: totalStudents, icon: GraduationCap, color: 'text-coffee-700', bg: 'bg-coffee-50', href: '/admin/students' },
    { label: 'Active Staff', value: totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/super-admin/users' },
    { label: 'Total Fees Collected', value: formatCurrency(Number(feesTotal._sum.amountPaid ?? 0)), icon: Banknote, color: 'text-green-600', bg: 'bg-green-50', href: '/admin/fees/payments' },
    { label: 'Audit Entries', value: totalAuditLogs.toLocaleString(), icon: ClipboardList, color: 'text-coffee-500', bg: 'bg-coffee-50', href: '/super-admin/audit-logs' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Super Admin Dashboard</h1>
        <p className="text-coffee-500 text-sm mt-0.5">{formatDate(new Date())}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white border border-coffee-200 rounded-xl p-4 flex items-center gap-3 hover:border-coffee-300 transition-colors"
          >
            <div className={`p-2.5 rounded-xl ${s.bg} ${s.color} shrink-0`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-coffee-900 leading-tight">{s.value}</p>
              <p className="text-xs text-coffee-500 mt-0.5">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Today's pulse row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-coffee-200 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-coffee-50 rounded-xl text-coffee-700 shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-coffee-900">{totalMemoToday}</p>
            <p className="text-xs text-coffee-500">Memorization logs today</p>
          </div>
        </div>
        <Link
          href="/admin/leave-requests"
          className="bg-white border border-coffee-200 rounded-xl p-4 flex items-center gap-3 hover:border-coffee-300 transition-colors"
        >
          <div className={`p-2.5 rounded-xl shrink-0 ${pendingLeaves > 0 ? 'bg-amber-50 text-amber-600' : 'bg-coffee-50 text-coffee-700'}`}>
            <CalendarCheck size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-coffee-900">{pendingLeaves}</p>
            <p className="text-xs text-coffee-500">Pending leave requests</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent audit activity */}
        <div className="lg:col-span-2 bg-white border border-coffee-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-coffee-800">Recent Audit Activity</h2>
            <Link href="/super-admin/audit-logs" className="text-xs text-coffee-400 hover:text-coffee-700">View all →</Link>
          </div>
          {recentAuditLogs.length === 0 ? (
            <p className="text-coffee-400 text-sm">No audit logs yet.</p>
          ) : (
            <div className="space-y-2">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2.5 bg-coffee-50 rounded-lg text-sm">
                  <div className="min-w-0 flex-1">
                    <code className="text-xs bg-coffee-100 text-coffee-700 rounded px-1.5 py-0.5 font-mono">
                      {log.action}
                    </code>
                    {log.description && (
                      <span className="text-coffee-500 text-xs ml-2 truncate">{log.description}</span>
                    )}
                  </div>
                  <div className="text-right text-xs text-coffee-400 ml-3 shrink-0">
                    <div>{log.user?.name ?? 'System'}</div>
                    <div>{formatDate(log.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming events + Quick links */}
        <div className="space-y-4">
          <div className="bg-white border border-coffee-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-coffee-800">Upcoming Events</h2>
              <Link href="/super-admin/events" className="text-xs text-coffee-400 hover:text-coffee-700">Manage →</Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-coffee-400 text-sm">No upcoming events.</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((e) => (
                  <div key={e.id} className="p-2.5 bg-coffee-50 rounded-lg">
                    <p className="text-xs text-coffee-400">{formatDate(e.eventDate)}</p>
                    <p className="text-sm font-medium text-coffee-900 mt-0.5 line-clamp-1">{e.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-coffee-200 rounded-xl p-5">
            <h2 className="font-semibold text-coffee-800 mb-3">Quick Links</h2>
            <div className="space-y-2">
              {[
                { href: '/super-admin/users', label: 'Manage Users' },
                { href: '/super-admin/academic-years', label: 'Academic Years' },
                { href: '/super-admin/settings', label: 'System Settings' },
                { href: '/admin/reports', label: 'Download Reports' },
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
        </div>
      </div>
    </div>
  )
}
