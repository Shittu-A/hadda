import { db } from '@/lib/db'
import { approveLeaveRequest, rejectLeaveRequest } from '@/lib/actions/leave'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

export default async function LeaveRequestsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const filter = searchParams.status || 'pending'

  const requests = await db.leaveRequest.findMany({
    where: filter === 'all' ? {} : { status: filter as any },
    include: { user: true, reviewedBy: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Leave Requests</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Review and approve staff leave requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-coffee-200 overflow-x-auto">
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <a
            key={s}
            href={`?status=${s}`}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium capitalize transition-colors whitespace-nowrap ${
              filter === s
                ? 'border-b-2 border-coffee-900 text-coffee-900'
                : 'text-coffee-500 hover:text-coffee-700'
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      <div className="bg-white border border-coffee-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-coffee-50 border-b border-coffee-200">
            <tr>
              <th className="text-left px-3 sm:px-5 py-3 text-coffee-700 font-semibold">Staff</th>
              <th className="text-left px-3 sm:px-5 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Dates</th>
              <th className="text-left px-3 sm:px-5 py-3 text-coffee-700 font-semibold hidden lg:table-cell">Reason</th>
              <th className="text-left px-3 sm:px-5 py-3 text-coffee-700 font-semibold">Status</th>
              <th className="text-left px-3 sm:px-5 py-3 text-coffee-700 font-semibold hidden md:table-cell">Reviewer</th>
              <th className="px-3 sm:px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-coffee-100">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-coffee-400 text-xs sm:text-sm">
                  No {filter} requests.
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-coffee-50 transition-colors">
                  <td className="px-3 sm:px-5 py-3">
                    <p className="font-medium text-coffee-900 text-xs sm:text-sm">{req.user.name}</p>
                    <p className="text-xs text-coffee-400 capitalize">
                      {req.user.role.replace('_', ' ')}
                    </p>
                  </td>
                  <td className="px-3 sm:px-5 py-3 text-coffee-600 text-xs hidden sm:table-cell whitespace-nowrap">
                    {formatDate(req.startDate)} → {formatDate(req.endDate)}
                  </td>
                  <td className="px-3 sm:px-5 py-3 text-coffee-700 text-xs max-w-xs hidden lg:table-cell">
                    <p className="line-clamp-2">{req.reason}</p>
                    {req.reviewNote && (
                      <p className="text-xs text-coffee-400 mt-1 italic">
                        Note: {req.reviewNote}
                      </p>
                    )}
                  </td>
                  <td className="px-3 sm:px-5 py-3">
                    <Badge variant={STATUS_VARIANT[req.status]}>{req.status}</Badge>
                  </td>
                  <td className="px-3 sm:px-5 py-3 text-coffee-500 text-xs hidden md:table-cell">
                    {req.reviewedBy ? (
                      <>
                        <p>{req.reviewedBy.name}</p>
                        <p>{req.reviewedAt ? formatDate(req.reviewedAt) : ''}</p>
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-3 sm:px-5 py-3">
                    {req.status === 'pending' && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 sm:justify-end">
                        <form action={approveLeaveRequest}>
                          <input type="hidden" name="id" value={req.id} />
                          <button
                            type="submit"
                            className="w-full text-xs font-medium text-green-600 border border-green-200 rounded-lg px-2 sm:px-3 py-1.5 hover:bg-green-50 transition-colors whitespace-nowrap"
                          >
                            Approve
                          </button>
                        </form>
                        <RejectForm id={req.id} />
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RejectForm({ id }: { id: string }) {
  return (
    <form action={rejectLeaveRequest} className="flex flex-col sm:flex-row sm:items-center gap-1 w-full sm:w-auto">
      <input type="hidden" name="id" value={id} />
      <input
        type="text"
        name="reviewNote"
        placeholder="Reason (optional)"
        className="w-full sm:w-32 border border-coffee-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-coffee-400"
      />
      <button
        type="submit"
        className="w-full sm:w-auto text-xs font-medium text-red-600 border border-red-200 rounded-lg px-2 sm:px-3 py-1.5 hover:bg-red-50 transition-colors whitespace-nowrap"
      >
        Reject
      </button>
    </form>
  )
}
