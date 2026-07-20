import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { GRADE_VARIANT } from '@/lib/grades'

export default async function AdminMemorizationPage({
  searchParams,
}: {
  searchParams: Promise<{
    classId?: string
    studentId?: string
    termId?: string
    grade?: string
    status?: string
    page?: string
  }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const sp = await searchParams
  const pageNum = Math.max(1, parseInt(sp.page || '1'))
  const pageSize = 50

  const [classes, terms] = await Promise.all([
    db.classRoom.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    db.term.findMany({
      orderBy: [{ academicYear: { startDate: 'desc' } }, { order: 'asc' }],
      include: { academicYear: { select: { name: true } } },
    }),
  ])

  // Default to the current term rather than every term ever recorded — a whole
  // year of targets at once is rarely what an admin wants to look at.
  const currentTerm = terms.find((t) => t.isCurrent)
  const activeTermId = sp.termId || currentTerm?.id

  // Build where clause
  const where: any = {}
  if (activeTermId) where.termId = activeTermId
  if (sp.classId) where.student = { currentClassId: sp.classId }
  if (sp.studentId) where.studentId = sp.studentId
  if (sp.grade) where.grade = sp.grade
  if (sp.status === 'graded') where.achievedPercent = { not: null }
  if (sp.status === 'pending') where.achievedPercent = null

  const [targets, total, gradedCount, pendingCount, avgAgg] = await Promise.all([
    db.memorizationTarget.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        teacher: { select: { id: true, name: true } },
        term: { select: { name: true } },
        surahFrom: true,
        surahTo: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: pageSize,
      skip: (pageNum - 1) * pageSize,
    }),
    db.memorizationTarget.count({ where }),
    db.memorizationTarget.count({ where: { ...where, achievedPercent: { not: null } } }),
    db.memorizationTarget.count({ where: { ...where, achievedPercent: null } }),
    db.memorizationTarget.aggregate({
      where: { ...where, achievedPercent: { not: null } },
      _avg: { achievedPercent: true },
    }),
  ])

  const averagePercent = avgAgg._avg.achievedPercent
    ? Math.round(Number(avgAgg._avg.achievedPercent))
    : 0

  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = {
      classId: sp.classId,
      studentId: sp.studentId,
      termId: sp.termId,
      grade: sp.grade,
      status: sp.status,
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
        <h1 className="text-2xl font-bold text-coffee-900">Memorization</h1>
        <p className="text-coffee-600 text-sm mt-0.5">
          Termly targets set by class teachers and the grades they awarded
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Targets Set', value: total },
          { label: 'Graded', value: gradedCount },
          { label: 'Awaiting Grade', value: pendingCount },
          { label: 'Average Achieved', value: `${averagePercent}%` },
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
            <label className="block text-xs font-medium text-coffee-600 mb-1">Term</label>
            <select
              name="termId"
              defaultValue={activeTermId || ''}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">All terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.academicYear.name} — {t.name}{t.isCurrent ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </div>

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
            <label className="block text-xs font-medium text-coffee-600 mb-1">Status</label>
            <select
              name="status"
              defaultValue={sp.status || ''}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">All</option>
              <option value="graded">Graded</option>
              <option value="pending">Awaiting grade</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">Grade</label>
            <select
              name="grade"
              defaultValue={sp.grade || ''}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">All grades</option>
              {['A', 'B', 'C', 'D', 'F'].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2 lg:col-span-2">
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

      {/* Targets table */}
      {targets.length === 0 ? (
        <div className="text-center py-16 text-coffee-400">No memorization targets found.</div>
      ) : (
        <>
          <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden overflow-x-auto">
            <div className="px-5 py-3 bg-coffee-50 border-b border-coffee-200 flex items-center justify-between">
              <span className="text-sm text-coffee-600">
                {total} target{total !== 1 ? 's' : ''} found
              </span>
              <span className="text-xs text-coffee-400">
                Page {pageNum} of {Math.ceil(total / pageSize) || 1}
              </span>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-coffee-50 border-b border-coffee-200">
                <tr>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap">Student</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden sm:table-cell">Term</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden sm:table-cell">Teacher</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden md:table-cell">Target Portion</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden md:table-cell">Pages</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap">Achieved</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden lg:table-cell">Graded</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden lg:table-cell">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {targets.map((target) => {
                  const percent = target.achievedPercent != null ? Number(target.achievedPercent) : null
                  return (
                    <tr key={target.id} className="hover:bg-coffee-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <a
                          href={`/admin/students/${target.student.id}`}
                          className="font-medium text-coffee-900 hover:text-coffee-600 transition-colors"
                        >
                          {target.student.firstName} {target.student.lastName}
                        </a>
                        <p className="text-xs text-coffee-400 font-mono">{target.student.admissionNumber}</p>
                      </td>
                      <td className="px-4 py-2.5 text-coffee-600 text-xs hidden sm:table-cell">{target.term.name}</td>
                      <td className="px-4 py-2.5 text-coffee-600 text-xs hidden sm:table-cell">{target.teacher.name}</td>
                      <td className="px-4 py-2.5 text-coffee-600 text-xs whitespace-nowrap hidden md:table-cell">
                        <span className="font-medium">{target.surahFrom.nameEnglish}</span>
                        {' '}:{target.ayahFrom}
                        {' → '}
                        <span className="font-medium">{target.surahTo.nameEnglish}</span>
                        {' '}:{target.ayahTo}
                      </td>
                      <td className="px-4 py-2.5 text-coffee-700 font-medium text-xs hidden md:table-cell">
                        {Number(target.targetPages)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {percent != null ? (
                          <Badge variant={GRADE_VARIANT[target.grade ?? 'F'] ?? 'neutral'}>
                            {percent}% · {target.grade}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Pending</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-coffee-500 text-xs whitespace-nowrap hidden lg:table-cell">
                        {target.gradedAt ? formatDate(target.gradedAt) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-coffee-400 text-xs max-w-[150px] truncate hidden lg:table-cell">
                        {target.remark || target.notes || '—'}
                      </td>
                    </tr>
                  )
                })}
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
