import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ReportsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [classes, academicYears] = await Promise.all([
    db.classRoom.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    db.academicYear.findMany({ orderBy: { startDate: 'desc' }, select: { id: true, name: true, isCurrent: true } }),
  ])

  const today = new Date().toISOString().split('T')[0]
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const currentYear = academicYears.find((y) => y.isCurrent)

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Reports & Exports</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Download attendance, fee, and memorization reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Report */}
        <div className="bg-white border border-coffee-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-coffee-800">Attendance Report</h2>
            <p className="text-xs text-coffee-400 mt-0.5">Student attendance summary per class and date range</p>
          </div>
          <form method="GET" action="/api/reports/attendance" className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-coffee-600 mb-1">Class</label>
              <select
                name="classId"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-coffee-600 mb-1">From</label>
                <input
                  type="date"
                  name="from"
                  defaultValue={monthAgo}
                  max={today}
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-coffee-600 mb-1">To</label>
                <input
                  type="date"
                  name="to"
                  defaultValue={today}
                  max={today}
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="submit"
                name="format"
                value="xlsx"
                className="flex-1 bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
              >
                Download Excel
              </button>
            </div>
          </form>
        </div>

        {/* Fee Collection Report */}
        <div className="bg-white border border-coffee-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-coffee-800">Fee Collection Report</h2>
            <p className="text-xs text-coffee-400 mt-0.5">Payments collected and outstanding balances per student</p>
          </div>
          <form method="GET" action="/api/reports/fees" className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-coffee-600 mb-1">Academic Year</label>
              <select
                name="yearId"
                defaultValue={currentYear?.id ?? ''}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="">All years</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}{y.isCurrent ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-coffee-600 mb-1">Class</label>
              <select
                name="classId"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="submit"
                name="format"
                value="xlsx"
                className="flex-1 bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
              >
                Download Excel
              </button>
              <button
                type="submit"
                name="format"
                value="pdf"
                formAction="/api/reports/fees/pdf"
                className="flex-1 border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
              >
                Download PDF
              </button>
            </div>
          </form>
        </div>

        {/* Memorization Report */}
        <div className="bg-white border border-coffee-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-coffee-800">Memorization Report</h2>
            <p className="text-xs text-coffee-400 mt-0.5">Pages memorized per student with sabaq/sabqi/manzil breakdown</p>
          </div>
          <form method="GET" action="/api/reports/memorization" className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-coffee-600 mb-1">Class</label>
              <select
                name="classId"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-coffee-600 mb-1">From</label>
                <input
                  type="date"
                  name="from"
                  defaultValue={monthAgo}
                  max={today}
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-coffee-600 mb-1">To</label>
                <input
                  type="date"
                  name="to"
                  defaultValue={today}
                  max={today}
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="submit"
                name="format"
                value="xlsx"
                className="flex-1 bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
              >
                Download Excel
              </button>
            </div>
          </form>
        </div>

        {/* Teacher Attendance Report */}
        <div className="bg-white border border-coffee-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-coffee-800">Teacher Attendance Report</h2>
            <p className="text-xs text-coffee-400 mt-0.5">Teacher attendance summary for a date range</p>
          </div>
          <form method="GET" action="/api/reports/teacher-attendance" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-coffee-600 mb-1">From</label>
                <input
                  type="date"
                  name="from"
                  defaultValue={monthAgo}
                  max={today}
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-coffee-600 mb-1">To</label>
                <input
                  type="date"
                  name="to"
                  defaultValue={today}
                  max={today}
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="submit"
                name="format"
                value="xlsx"
                className="flex-1 bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
              >
                Download Excel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
