import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

const STATUS_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  graduated: 'info',
  withdrawn: 'danger',
  transferred: 'neutral',
  promoted: 'success',
}

export default async function AlumniPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; yearId?: string; q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const sp = await searchParams
  const pageNum = Math.max(1, parseInt(sp.page || '1'))
  const pageSize = 50

  const academicYears = await db.academicYear.findMany({ orderBy: { startDate: 'desc' } })

  const where: any = {
    status: { in: ['graduated', 'withdrawn', 'transferred'] },
  }

  if (sp.status && ['graduated', 'withdrawn', 'transferred'].includes(sp.status)) {
    where.status = sp.status
  }

  if (sp.yearId) {
    where.academicYearId = sp.yearId
  }

  if (sp.q) {
    const q = sp.q.trim()
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { admissionNumber: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [students, total] = await Promise.all([
    db.student.findMany({
      where,
      include: {
        academicYear: { select: { name: true } },
        promotions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { fromClass: { select: { name: true } } },
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: pageSize,
      skip: (pageNum - 1) * pageSize,
    }),
    db.student.count({ where }),
  ])

  // Summary counts
  const [totalGraduated, totalWithdrawn, totalTransferred] = await Promise.all([
    db.student.count({ where: { status: 'graduated' } }),
    db.student.count({ where: { status: 'withdrawn' } }),
    db.student.count({ where: { status: 'transferred' } }),
  ])

  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = {
      status: sp.status,
      yearId: sp.yearId,
      q: sp.q,
      page: String(pageNum),
      ...overrides,
    }
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    return '?' + params.toString()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Alumni & Leavers</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Graduated, withdrawn, and transferred students</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-coffee-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-coffee-900">{totalGraduated}</p>
          <p className="text-xs text-coffee-500 mt-0.5">Graduated</p>
        </div>
        <div className="bg-white border border-coffee-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-coffee-900">{totalWithdrawn}</p>
          <p className="text-xs text-coffee-500 mt-0.5">Withdrawn</p>
        </div>
        <div className="bg-white border border-coffee-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-coffee-900">{totalTransferred}</p>
          <p className="text-xs text-coffee-500 mt-0.5">Transferred</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white border border-coffee-200 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">Search</label>
            <input
              type="text"
              name="q"
              defaultValue={sp.q || ''}
              placeholder="Name or admission no."
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">Status</label>
            <select
              name="status"
              defaultValue={sp.status || ''}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">All</option>
              <option value="graduated">Graduated</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="transferred">Transferred</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">Enrolled Year</label>
            <select
              name="yearId"
              defaultValue={sp.yearId || ''}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">All years</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-coffee-900 text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-coffee-800 transition-colors"
            >
              Filter
            </button>
            <a
              href="/admin/alumni"
              className="flex-1 text-center border border-coffee-200 text-coffee-600 rounded-lg px-3 py-2 text-xs font-medium hover:bg-coffee-50 transition-colors"
            >
              Clear
            </a>
          </div>
        </div>
      </form>

      {students.length === 0 ? (
        <div className="text-center py-16 text-coffee-400">No records found.</div>
      ) : (
        <>
          <div className="flex items-center text-sm text-coffee-600 mb-1">
            <span><span className="font-semibold text-coffee-900">{total}</span> record{total !== 1 ? 's' : ''}</span>
          </div>
          <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-coffee-50 border-b border-coffee-200">
                <tr>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap">Student</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden sm:table-cell">Last Class</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden md:table-cell">Enrolled Year</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden lg:table-cell">Processed</th>
                  <th className="px-4 py-3 whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {students.map((s) => {
                  const lastPromotion = s.promotions[0]
                  return (
                    <tr key={s.id} className="hover:bg-coffee-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-coffee-900">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-coffee-400 font-mono">{s.admissionNumber}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={STATUS_VARIANT[s.status] ?? 'neutral'}>
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-coffee-600 text-xs hidden sm:table-cell">
                        {lastPromotion?.fromClass?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-coffee-500 text-xs hidden md:table-cell">
                        {s.academicYear.name}
                      </td>
                      <td className="px-4 py-2.5 text-coffee-500 text-xs hidden lg:table-cell">
                        {lastPromotion ? formatDate(lastPromotion.createdAt) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/admin/students/${s.id}`}
                          className="text-xs text-coffee-500 hover:text-coffee-800 transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
