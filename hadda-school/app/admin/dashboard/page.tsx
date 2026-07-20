import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { GraduationCap, Users, Banknote, UserX, Clock, BookOpen, CalendarCheck, Coins, PiggyBank } from 'lucide-react'

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

  const [
    activeStudents,
    presentToday,
    teachersAbsent,
    feesThisMonth,
    feesAllTime,
    otherIncomeAllTime,
    expensesAllTime,
    pendingLeaves,
    recentPayments,
    recentMemo,
    upcomingEvents,
  ] = await Promise.all([
    db.student.count({ where: { status: 'active', deletedAt: null } }),
    db.studentAttendance.count({ where: { date: today, status: 'present' } }),
    db.teacherAttendance.count({ where: { date: today, status: 'absent' } }),
    db.feePayment.aggregate({
      where: { paymentDate: { gte: monthStart, lte: monthEnd } },
      _sum: { amountPaid: true },
    }),
    db.feePayment.aggregate({ _sum: { amountPaid: true } }),
    db.incomeEntry.aggregate({ _sum: { amount: true } }),
    db.expense.aggregate({ _sum: { amount: true } }),
    db.leaveRequest.count({ where: { status: 'pending' } }),
    db.feePayment.findMany({
      take: 5,
      orderBy: { paymentDate: 'desc' },
      include: {
        student: { select: { firstName: true, lastName: true } },
        feeStructure: { select: { name: true } },
      },
    }),
    // Most recently graded termly targets.
    db.memorizationTarget.findMany({
      where: { achievedPercent: { not: null } },
      take: 5,
      orderBy: { gradedAt: 'desc' },
      include: {
        student: { select: { firstName: true, lastName: true } },
        surahFrom: { select: { nameEnglish: true } },
        surahTo: { select: { nameEnglish: true } },
        term: { select: { name: true } },
      },
    }),
    db.event.findMany({
      where: { isPublished: true, eventDate: { gte: today } },
      orderBy: { eventDate: 'asc' },
      take: 3,
    }),
  ])

  const totalIncome =
    Number(feesAllTime._sum.amountPaid ?? 0) + Number(otherIncomeAllTime._sum.amount ?? 0)
  const totalExpenses = Number(expensesAllTime._sum.amount ?? 0)
  const balance = totalIncome - totalExpenses

  const stats = [
    { label: 'Active Students', value: activeStudents, icon: GraduationCap, color: 'text-coffee-700', bg: 'bg-coffee-50', href: '/admin/students' },
    { label: 'Present Today', value: presentToday, icon: Users, color: 'text-green-600', bg: 'bg-green-50', href: '/admin/attendance/students' },
    { label: 'Teachers Absent', value: teachersAbsent, icon: UserX, color: 'text-red-500', bg: 'bg-red-50', href: '/admin/attendance/teachers' },
    { label: 'Fees This Month', value: formatCurrency(Number(feesThisMonth._sum.amountPaid ?? 0)), icon: Banknote, color: 'text-coffee-600', bg: 'bg-coffee-50', href: '/admin/fees/payments' },
    { label: 'Total Income', value: formatCurrency(totalIncome), icon: Coins, color: 'text-green-700', bg: 'bg-green-50', href: '/admin/finance' },
    { label: 'Available Balance', value: formatCurrency(balance), icon: PiggyBank, color: balance >= 0 ? 'text-coffee-700' : 'text-red-600', bg: balance >= 0 ? 'bg-coffee-50' : 'bg-red-50', href: '/admin/finance' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">
          Welcome back, {session.user.name?.split(' ')[0]}
        </h1>
        <p className="text-coffee-500 text-sm mt-0.5">{formatDate(new Date())}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white border border-coffee-200 rounded-xl p-4 flex items-center gap-3 hover:border-coffee-300 transition-colors group"
          >
            <div className={`p-2.5 rounded-xl ${s.bg} ${s.color} shrink-0`}>
              <s.icon size={20} />
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="text-xl font-bold text-coffee-900 leading-tight truncate">{s.value}</p>
              <p className="text-xs text-coffee-500 mt-0.5 truncate">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Alert banner: pending leaves */}
      {pendingLeaves > 0 && (
        <Link
          href="/admin/leave-requests"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 hover:bg-amber-100 transition-colors"
        >
          <Clock size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{pendingLeaves}</span> pending leave request{pendingLeaves !== 1 ? 's' : ''} awaiting review
          </p>
          <span className="ml-auto text-amber-600 text-sm">Review →</span>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="bg-white border border-coffee-200 rounded-xl p-5">
          <h2 className="font-semibold text-coffee-800 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { href: '/admin/students/new', label: '+ Enroll New Student' },
              { href: '/admin/attendance/students', label: 'Mark Student Attendance' },
              { href: '/admin/fees/payments', label: 'Record Fee Payment' },
              { href: '/admin/memorization', label: 'View Memorization Logs' },
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

        {/* Recent payments */}
        <div className="bg-white border border-coffee-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-coffee-800">Recent Payments</h2>
            <Link href="/admin/fees/payments" className="text-xs text-coffee-400 hover:text-coffee-700">View all →</Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-coffee-400 text-sm">No payments yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-coffee-900 truncate">
                      {p.student.firstName} {p.student.lastName}
                    </p>
                    <p className="text-xs text-coffee-400">{p.feeStructure.name}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-medium text-coffee-900">{formatCurrency(Number(p.amountPaid))}</p>
                    <p className="text-xs text-coffee-400">{formatDate(p.paymentDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent memorization */}
        <div className="bg-white border border-coffee-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-coffee-800">Recent Memorization Grades</h2>
            <Link href="/admin/memorization" className="text-xs text-coffee-400 hover:text-coffee-700">View all →</Link>
          </div>
          {recentMemo.length === 0 ? (
            <p className="text-coffee-400 text-sm">No grades recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentMemo.map((target) => {
                const percent = Number(target.achievedPercent)
                return (
                  <div key={target.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-coffee-900">
                        {target.student.firstName} {target.student.lastName}
                      </p>
                      <Badge
                        variant={
                          percent >= 80 ? 'success'
                          : percent >= 70 ? 'info'
                          : percent >= 50 ? 'warning'
                          : 'danger'
                        }
                      >
                        {percent}% · {target.grade}
                      </Badge>
                    </div>
                    <p className="text-xs text-coffee-400 mt-0.5">
                      {target.term.name} · {target.surahFrom.nameEnglish} {target.ayahFrom} → {target.surahTo.nameEnglish} {target.ayahTo}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white border border-coffee-200 rounded-xl p-5">
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
