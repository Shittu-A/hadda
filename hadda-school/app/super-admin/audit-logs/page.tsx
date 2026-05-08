import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { q?: string; userId?: string; from?: string; to?: string; page?: string }
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const pageNum = Math.max(1, parseInt(searchParams.page || '1'))
  const pageSize = 50
  const today = new Date().toISOString().split('T')[0]

  const users = await db.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true },
  })

  const where: any = {}
  if (searchParams.userId) where.userId = searchParams.userId
  if (searchParams.q) {
    const q = searchParams.q.trim()
    where.OR = [
      { action: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { auditableType: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (searchParams.from || searchParams.to) {
    where.createdAt = {}
    if (searchParams.from) where.createdAt.gte = new Date(searchParams.from)
    if (searchParams.to) where.createdAt.lte = new Date(searchParams.to + 'T23:59:59')
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (pageNum - 1) * pageSize,
    }),
    db.auditLog.count({ where }),
  ])

  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = {
      q: searchParams.q,
      userId: searchParams.userId,
      from: searchParams.from,
      to: searchParams.to,
      page: String(pageNum),
      ...overrides,
    }
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    return '?' + params.toString()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Audit Logs</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Full history of all system actions</p>
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white border border-coffee-200 rounded-xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-coffee-600 mb-1">Search action / description</label>
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q || ''}
              placeholder="e.g. leave.approved"
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">User</label>
            <select
              name="userId"
              defaultValue={searchParams.userId || ''}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">From</label>
            <input
              type="date"
              name="from"
              defaultValue={searchParams.from || ''}
              max={today}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">To</label>
            <input
              type="date"
              name="to"
              defaultValue={searchParams.to || ''}
              max={today}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            type="submit"
            className="bg-coffee-900 text-white rounded-lg px-4 py-2 text-xs font-medium hover:bg-coffee-800 transition-colors"
          >
            Filter
          </button>
          <a
            href="/super-admin/audit-logs"
            className="border border-coffee-200 text-coffee-600 rounded-lg px-4 py-2 text-xs font-medium hover:bg-coffee-50 transition-colors"
          >
            Clear
          </a>
        </div>
      </form>

      {/* Count */}
      {total > 0 && (
        <p className="text-sm text-coffee-600">
          <span className="font-semibold text-coffee-900">{total.toLocaleString()}</span> log{total !== 1 ? 's' : ''}
        </p>
      )}

      {/* Table */}
      {logs.length === 0 ? (
        <div className="text-center py-16 text-coffee-400">No audit logs found.</div>
      ) : (
        <>
          <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-coffee-50 border-b border-coffee-200">
                <tr>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold w-36">Date</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold w-36">User</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold w-48">Action</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold w-28">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-coffee-50 transition-colors">
                    <td className="px-4 py-2.5 text-coffee-400 text-xs whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-coffee-600 text-xs truncate max-w-[130px]">
                      {log.user?.name ?? <span className="text-coffee-300">System</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="text-xs bg-coffee-100 text-coffee-700 rounded px-1.5 py-0.5 font-mono">
                        {log.action}
                      </code>
                    </td>
                    <td className="px-4 py-2.5 text-coffee-600 text-xs max-w-xs truncate">
                      {log.description || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-coffee-400 text-xs">
                      {log.auditableType ?? '—'}
                    </td>
                  </tr>
                ))}
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
