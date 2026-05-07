import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { markAllNotificationsRead, markNotificationRead } from '@/lib/actions/notifications'

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  new_leave_request: { label: 'New Leave Request', icon: '📋' },
  leave_request_decided: { label: 'Leave Request Update', icon: '✅' },
}

function getNotificationMessage(type: string, data: unknown): string {
  const d = data as Record<string, string>
  if (type === 'new_leave_request') {
    return `A new leave request was submitted for ${d.startDate} – ${d.endDate}.`
  }
  if (type === 'leave_request_decided') {
    return d.decision === 'approved'
      ? 'Your leave request was approved.'
      : `Your leave request was rejected${d.note ? ': ' + d.note : '.'}`
  }
  return 'You have a new notification.'
}

function getNotificationLink(type: string, data: unknown): string {
  const d = data as Record<string, string>
  if (type === 'new_leave_request') return '/admin/leave-requests'
  if (type === 'leave_request_decided' && d.leaveId) return '/teacher/leave'
  return '#'
}

async function handleMarkAll(): Promise<void> {
  'use server'
  await markAllNotificationsRead()
}

async function handleMarkOne(formData: FormData): Promise<void> {
  'use server'
  await markNotificationRead(formData)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-coffee-500 text-sm mt-0.5">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <form action={handleMarkAll}>
            <button
              type="submit"
              className="text-sm text-coffee-500 hover:text-coffee-800 underline underline-offset-2 transition-colors"
            >
              Mark all as read
            </button>
          </form>
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
                className={`bg-white border rounded-xl px-5 py-4 flex items-start gap-4 transition-colors ${
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
                  <div className="flex items-center gap-4 mt-1.5">
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
                  <form action={handleMarkOne} className="shrink-0">
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="text-xs text-coffee-400 hover:text-coffee-700 transition-colors whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
