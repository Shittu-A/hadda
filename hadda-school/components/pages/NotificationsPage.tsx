import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ActionForm from '@/components/ui/ActionForm'
import SubmitButton from '@/components/ui/SubmitButton'
import { formatDate } from '@/lib/utils'
import { markAllNotificationsRead, markNotificationRead } from '@/lib/actions/notifications'

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  new_leave_request: { label: 'New Leave Request', icon: '📋' },
  leave_request_decided: { label: 'Leave Request Update', icon: '✅' },
}

function getNotificationMessage(type: string, data: unknown): string {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, string>
  if (type === 'new_leave_request') {
    return `A new leave request was submitted${d.startDate ? ` for ${d.startDate} – ${d.endDate}` : ''}.`
  }
  if (type === 'leave_request_decided') {
    return d.decision === 'approved'
      ? 'Your leave request was approved.'
      : `Your leave request was rejected${d.note ? ': ' + d.note : '.'}`
  }
  return 'You have a new notification.'
}

function getNotificationLink(type: string, data: unknown): string {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, string>
  if (type === 'new_leave_request') return '/admin/leave-requests'
  if (type === 'leave_request_decided' && d.leaveId) return '/teacher/leave'
  return '#'
}

async function handleMarkAll() {
  'use server'
  await markAllNotificationsRead()
  return { success: true, message: 'All notifications marked as read.' }
}

async function handleMarkOne(formData: FormData) {
  'use server'
  await markNotificationRead(formData)
  return { success: true, message: 'Notification marked as read.' }
}

export default async function NotificationsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-coffee-500 text-sm mt-0.5">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <ActionForm action={handleMarkAll} successMessage="All notifications marked as read.">
            <SubmitButton
              pendingText="Marking…"
              className="text-sm text-coffee-500 hover:text-coffee-800 underline underline-offset-2 transition-colors"
            >
              Mark all as read
            </SubmitButton>
          </ActionForm>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-coffee-400">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const config = TYPE_CONFIG[n.type] ?? { label: n.type, icon: '🔔' }
            const message = getNotificationMessage(n.type, n.data)
            const link = getNotificationLink(n.type, n.data)
            const isUnread = !n.readAt

            return (
              <div
                key={n.id}
                className={`bg-white border rounded-xl px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 transition-colors ${
                  isUnread ? 'border-coffee-300 bg-coffee-50' : 'border-coffee-100'
                }`}
              >
                <span className="text-xl mt-0.5 shrink-0">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-coffee-900">{config.label}</p>
                    {isUnread && (
                      <span className="inline-block w-2 h-2 rounded-full bg-coffee-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-coffee-600">{message}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1.5">
                    <span className="text-xs text-coffee-400">{formatDate(n.createdAt)}</span>
                    {link !== '#' && (
                      <a
                        href={link}
                        className="text-xs text-coffee-600 hover:text-coffee-900 underline underline-offset-2"
                      >
                        View →
                      </a>
                    )}
                  </div>
                </div>
                {isUnread && (
                  <ActionForm
                    action={handleMarkOne}
                    successMessage="Notification marked as read."
                    className="shrink-0 self-start sm:self-auto"
                  >
                    <input type="hidden" name="id" value={n.id} />
                    <SubmitButton
                      pendingText="Marking…"
                      className="text-xs text-coffee-400 hover:text-coffee-700 transition-colors whitespace-nowrap"
                    >
                      Mark read
                    </SubmitButton>
                  </ActionForm>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
