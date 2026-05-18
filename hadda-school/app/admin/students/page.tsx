import { db } from '@/lib/db'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  promoted: 'info',
  graduated: 'info',
  withdrawn: 'danger',
  transferred: 'neutral',
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { q?: string; classId?: string; status?: string; page?: string }
}) {
  const page = Math.max(1, Number(searchParams.page) || 1)
  const perPage = 25

  const where: any = { deletedAt: null }
  if (searchParams.q) {
    const q = searchParams.q.trim()
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { admissionNumber: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (searchParams.classId) where.currentClassId = searchParams.classId
  if (searchParams.status) where.status = searchParams.status

  const [students, total, classes] = await Promise.all([
    db.student.findMany({
      where,
      include: {
        currentClass: true,
        guardians: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.student.count({ where }),
    db.classRoom.findMany({
      include: { academicYear: true },
      orderBy: [{ academicYear: { startDate: 'desc' } }, { order: 'asc' }],
    }),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-coffee-900">Students</h1>
          <p className="text-coffee-600 text-sm mt-0.5">{total} total students</p>
        </div>
        <Link
          href="/admin/students/new"
          className="w-full sm:w-auto text-center bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
        >
          + Enroll Student
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-col sm:flex-row flex-wrap gap-3">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search name or admission no…"
          className="w-full sm:w-64 border border-coffee-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coffee-400"
        />
        <select
          name="classId"
          defaultValue={searchParams.classId}
          className="w-full sm:w-auto border border-coffee-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coffee-400"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.academicYear.name})
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={searchParams.status}
          className="w-full sm:w-auto border border-coffee-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coffee-400"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="promoted">Promoted</option>
          <option value="graduated">Graduated</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="transferred">Transferred</option>
        </select>
        <button
          type="submit"
          className="w-full sm:w-auto bg-coffee-100 text-coffee-800 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-200 transition-colors"
        >
          Filter
        </button>
        {(searchParams.q || searchParams.classId || searchParams.status) && (
          <Link
            href="/admin/students"
            className="text-coffee-500 text-sm flex items-center hover:text-coffee-700"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white border border-coffee-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-coffee-50 border-b border-coffee-200">
            <tr>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Admission No.</th>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Name</th>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Class</th>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Guardian</th>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Enrolled</th>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-coffee-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-coffee-400">
                  No students found.
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="hover:bg-coffee-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-coffee-600">{s.admissionNumber}</td>
                  <td className="px-4 py-3 font-medium text-coffee-900">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-4 py-3 text-coffee-600">{s.currentClass?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-coffee-600">
                    {s.guardians[0] ? (
                      <span>
                        {s.guardians[0].name}
                        {s.guardians[0].phone && (
                          <span className="text-coffee-400 text-xs ml-1">· {s.guardians[0].phone}</span>
                        )}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-coffee-500">{formatDate(s.enrollmentDate)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[s.status] ?? 'neutral'}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/students/${s.id}`}
                      className="text-coffee-600 hover:text-coffee-900 font-medium text-xs"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-coffee-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}${searchParams.q ? `&q=${searchParams.q}` : ''}${searchParams.classId ? `&classId=${searchParams.classId}` : ''}${searchParams.status ? `&status=${searchParams.status}` : ''}`}
                className="border border-coffee-200 rounded-lg px-3 py-1.5 hover:bg-coffee-50"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}${searchParams.q ? `&q=${searchParams.q}` : ''}${searchParams.classId ? `&classId=${searchParams.classId}` : ''}${searchParams.status ? `&status=${searchParams.status}` : ''}`}
                className="border border-coffee-200 rounded-lg px-3 py-1.5 hover:bg-coffee-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
