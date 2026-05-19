import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  sabaq: 'Sabaq (New)',
  sabqi: 'Sabqi (Recent)',
  manzil: 'Manzil (Long-term)',
}
const QUALITY_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  excellent: 'success',
  good: 'info',
  average: 'warning',
  weak: 'danger',
}

export default async function AdminMemorizationPage({
  searchParams,
}: {
  searchParams: Promise<{
    classId?: string
    studentId?: string
    type?: string
    quality?: string
    from?: string
    to?: string
    page?: string
  }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const sp = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const pageNum = Math.max(1, parseInt(sp.page || '1'))
  const pageSize = 50

  const fromDate = sp.from ? new Date(sp.from) : undefined
  const toDate = sp.to ? new Date(sp.to + 'T23:59:59') : undefined

  const [classes, currentYear] = await Promise.all([
    db.classRoom.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    db.academicYear.findFirst({ where: { isCurrent: true } }),
  ])

  // Build where clause
  const where: any = {}
  if (sp.classId) {
    where.student = { currentClassId: sp.classId }
  }
  if (sp.studentId) {
    where.studentId = sp.studentId
  }
  if (sp.type) {
    where.type = sp.type
  }
  if (sp.quality) {
    where.quality = sp.quality
  }
  if (fromDate || toDate) {
    where.logDate = {}
    if (fromDate) where.logDate.gte = fromDate
    if (toDate) where.logDate.lte = toDate
  }

  // Fetch students in selected class for student filter dropdown
  const classStudents = sp.classId
    ? await db.student.findMany({
        where: { currentClassId: sp.classId, deletedAt: null, status: 'active' },
        orderBy: [{ firstName: 'asc' }],
        select: { id: true, firstName: true, lastName: true },
      })
    : []

  const [logs, total] = await Promise.all([
    db.memorizationLog.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        teacher: { select: { id: true, name: true } },
        surahFrom: true,
        surahTo: true,
      },
      orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }],
      take: pageSize,
      skip: (pageNum - 1) * pageSize,
    }),
    db.memorizationLog.count({ where }),
  ])

  // Summary stats (for current academic year, all students)
  const statsWhere = currentYear ? { academicYearId: currentYear.id, ...where } : where
  const [totalPages, totalSabaq, totalSabqi, totalManzil] = await Promise.all([
    Promise.resolve(Math.ceil(total / pageSize)),
    db.memorizationLog.count({ where: { ...statsWhere, type: 'sabaq' } }),
    db.memorizationLog.count({ where: { ...statsWhere, type: 'sabqi' } }),
    db.memorizationLog.count({ where: { ...statsWhere, type: 'manzil' } }),
  ])

  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = {
      classId: sp.classId,
      studentId: sp.studentId,
      type: sp.type,
      quality: sp.quality,
      from: sp.from,
      to: sp.to,
      page: String(pageNum),
      ...overrides,
    }
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    return '?' + params.toString()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Memorization Logs</h1>
        <p className="text-coffee-600 text-sm mt-0.5">View all sabaq, sabqi, and manzil sessions</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Logs', value: total, variant: 'neutral' as const },
          { label: 'Sabaq', value: totalSabaq, variant: 'info' as const },
          { label: 'Sabqi', value: totalSabqi, variant: 'warning' as const },
          { label: 'Manzil', value: totalManzil, variant: 'success' as const },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-coffee-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-coffee-900">{s.value}</p>
            <p className="text-xs text-coffee-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white border border-coffee-200 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">Class</label>
            <select
              name="classId"
              defaultValue={sp.classId || ''}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">Type</label>
            <select
              name="type"
              defaultValue={sp.type || ''}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">All types</option>
              <option value="sabaq">Sabaq</option>
              <option value="sabqi">Sabqi</option>
              <option value="manzil">Manzil</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">Quality</label>
            <select
              name="quality"
              defaultValue={sp.quality || ''}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">All quality</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="average">Average</option>
              <option value="weak">Weak</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">From</label>
            <input
              type="date"
              name="from"
              defaultValue={sp.from || ''}
              max={today}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">To</label>
            <input
              type="date"
              name="to"
              defaultValue={sp.to || ''}
              max={today}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-coffee-900 text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-coffee-800 transition-colors"
            >
              Filter
            </button>
            <a
              href="/admin/memorization"
              className="flex-1 text-center border border-coffee-200 text-coffee-600 rounded-lg px-3 py-2 text-xs font-medium hover:bg-coffee-50 transition-colors"
            >
              Clear
            </a>
          </div>
        </div>
      </form>

      {/* Logs table */}
      {logs.length === 0 ? (
        <div className="text-center py-16 text-coffee-400">No memorization logs found.</div>
      ) : (
        <>
          <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden overflow-x-auto">
            <div className="px-5 py-3 bg-coffee-50 border-b border-coffee-200 flex items-center justify-between">
              <span className="text-sm text-coffee-600">
                {total} log{total !== 1 ? 's' : ''} found
              </span>
              <span className="text-xs text-coffee-400">
                Page {pageNum} of {Math.ceil(total / pageSize) || 1}
              </span>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-coffee-50 border-b border-coffee-200">
                <tr>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap">Date</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap">Student</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden sm:table-cell">Teacher</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden md:table-cell">Range</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden md:table-cell">Pages</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap">Quality</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden lg:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-coffee-50 transition-colors">
                    <td className="px-4 py-2.5 text-coffee-500 whitespace-nowrap text-xs">
                      {formatDate(log.logDate)}
                    </td>
                    <td className="px-4 py-2.5">
                      <a
                        href={`/admin/students/${log.student.id}`}
                        className="font-medium text-coffee-900 hover:text-coffee-600 transition-colors"
                      >
                        {log.student.firstName} {log.student.lastName}
                      </a>
                      <p className="text-xs text-coffee-400 font-mono">{log.student.admissionNumber}</p>
                    </td>
                    <td className="px-4 py-2.5 text-coffee-600 text-xs hidden sm:table-cell">{log.teacher.name}</td>
                    <td className="px-4 py-2.5 text-coffee-600 text-xs hidden sm:table-cell">
                      {TYPE_LABELS[log.type] || log.type}
                    </td>
                    <td className="px-4 py-2.5 text-coffee-600 text-xs whitespace-nowrap hidden md:table-cell">
                      <span className="font-medium">{log.surahFrom.nameEnglish}</span>
                      {' '}:{log.ayahFrom}
                      {' → '}
                      <span className="font-medium">{log.surahTo.nameEnglish}</span>
                      {' '}:{log.ayahTo}
                    </td>
                    <td className="px-4 py-2.5 text-coffee-700 font-medium text-xs hidden md:table-cell">
                      {Number(log.pages).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={QUALITY_VARIANT[log.quality]}>{log.quality}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-coffee-400 text-xs max-w-[150px] truncate hidden lg:table-cell">
                      {log.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          {Math.ceil(total / pageSize) > 1 && (
            <div className="flex items-center justify-center gap-2">
              {pageNum > 1 && (
                <a
                  href={buildQuery({ page: String(pageNum - 1) })}
                  className="px-4 py-2 text-sm border border-coffee-200 rounded-lg text-coffee-600 hover:bg-coffee-50 transition-colors"
                >
                  Previous
                </a>
              )}
              <span className="text-sm text-coffee-500">
                Page {pageNum} of {Math.ceil(total / pageSize)}
              </span>
              {pageNum < Math.ceil(total / pageSize) && (
                <a
                  href={buildQuery({ page: String(pageNum + 1) })}
                  className="px-4 py-2 text-sm border border-coffee-200 rounded-lg text-coffee-600 hover:bg-coffee-50 transition-colors"
                >
                  Next
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
