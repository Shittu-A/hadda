import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createLeaveRequest } from '@/lib/actions/leave'
import { redirect } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import ActionForm from '@/components/ui/ActionForm'
import SubmitButton from '@/components/ui/SubmitButton'
import { formatDate } from '@/lib/utils'

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

async function handleCreate(formData: FormData) {
  'use server'
  return createLeaveRequest(formData)
}

export default async function TeacherLeavePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const requests = await db.leaveRequest.findMany({
    where: { userId: session.user.id },
    include: { reviewedBy: true },
    orderBy: { createdAt: 'desc' },
  })

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Leave Requests</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Submit and track your leave requests</p>
      </div>

      {/* Submit form */}
      <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
        <h2 className="font-semibold text-coffee-800 mb-4">Request Leave</h2>
        <ActionForm action={handleCreate} successMessage="Leave request submitted." resetOnSuccess className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Start Date *</label>
              <input
                type="date"
                name="startDate"
                required
                min={today}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">End Date *</label>
              <input
                type="date"
                name="endDate"
                required
                min={today}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Reason *</label>
            <textarea
              name="reason"
              required
              rows={3}
              placeholder="Please provide a reason for your leave request…"
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div className="flex justify-end">
            <SubmitButton
              pendingText="Submitting…"
              className="bg-coffee-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
            >
              Submit Request
            </SubmitButton>
          </div>
        </ActionForm>
      </div>

      {/* History */}
      <div>
        <h2 className="font-semibold text-coffee-800 mb-3">My Requests</h2>
        {requests.length === 0 ? (
          <p className="text-coffee-400 text-sm">No leave requests yet.</p>
        ) : (
          <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-coffee-50 border-b border-coffee-200">
                  <tr>
                    <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold">Dates</th>
                    <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Reason</th>
                    <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold">Status</th>
                    <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-100">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-coffee-50">
                      <td className="px-4 sm:px-5 py-3 text-coffee-600 whitespace-nowrap text-xs sm:text-sm">
                        {formatDate(req.startDate)} → {formatDate(req.endDate)}
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-coffee-700 max-w-xs hidden sm:table-cell">
                        <p className="line-clamp-2">{req.reason}</p>
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <Badge variant={STATUS_VARIANT[req.status]}>{req.status}</Badge>
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-coffee-500 text-xs hidden sm:table-cell">
                        {req.reviewedBy ? (
                          <>
                            <p>{req.reviewedBy.name}</p>
                            {req.reviewNote && (
                              <p className="italic text-coffee-400">{req.reviewNote}</p>
                            )}
                          </>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
