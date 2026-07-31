import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import ActionForm from '@/components/ui/ActionForm'
import SubmitButton from '@/components/ui/SubmitButton'
import { formatDate } from '@/lib/utils'
import { createEvent, deleteEvent, toggleEventPublish } from '@/lib/actions/events'

async function handleCreate(formData: FormData) {
  'use server'
  await createEvent(formData)
  return { success: true }
}

async function handleDelete(formData: FormData) {
  'use server'
  await deleteEvent(formData)
  return { success: true }
}

async function handleToggle(formData: FormData) {
  'use server'
  await toggleEventPublish(formData)
  return { success: true }
}

export default async function EventsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const events = await db.event.findMany({ orderBy: { eventDate: 'desc' } })
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-4 sm:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Events</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Manage school events and announcements</p>
      </div>

      {/* Create form */}
      <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
        <h2 className="font-semibold text-coffee-800 mb-4">Create Event</h2>
        <ActionForm action={handleCreate} successMessage="Event created." resetOnSuccess className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Title *</label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Annual Qur'an Competition"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Event Date *</label>
              <input
                type="date"
                name="eventDate"
                required
                min={today}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={2}
              placeholder="Optional description…"
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">YouTube URL</label>
            <input
              type="url"
              name="youtubeUrl"
              placeholder="https://youtube.com/watch?v=..."
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-coffee-700">
              <input
                type="checkbox"
                name="isPublished"
                value="true"
                className="rounded border-coffee-300"
              />
              Publish immediately
            </label>
            <SubmitButton
              pendingText="Creating…"
              className="bg-coffee-900 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
            >
              Create Event
            </SubmitButton>
          </div>
        </ActionForm>
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <p className="text-coffee-400 text-sm">No events yet.</p>
      ) : (
        <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-coffee-50 border-b border-coffee-200">
                <tr>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Title</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Video</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-coffee-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-coffee-900 text-sm">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-coffee-400 mt-0.5 max-w-xs truncate">{event.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-coffee-600 text-xs whitespace-nowrap hidden sm:table-cell">
                      {formatDate(event.eventDate)}
                    </td>
                    <td className="px-4 py-3 text-xs hidden sm:table-cell">
                      {event.youtubeUrl ? (
                        <a
                          href={event.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-500 hover:text-red-700 underline underline-offset-2"
                        >
                          YouTube ↗
                        </a>
                      ) : (
                        <span className="text-coffee-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={event.isPublished ? 'success' : 'neutral'}>
                        {event.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 justify-end">
                        <Link
                          href={`/super-admin/events/${event.id}/edit`}
                          className="text-xs text-coffee-500 hover:text-coffee-800 transition-colors"
                        >
                          Edit
                        </Link>
                        <ActionForm action={handleToggle} successMessage={event.isPublished ? 'Event unpublished.' : 'Event published.'}>
                          <input type="hidden" name="id" value={event.id} />
                          <SubmitButton pendingText="Saving…" className="text-xs text-coffee-500 hover:text-coffee-800 transition-colors">
                            {event.isPublished ? 'Unpublish' : 'Publish'}
                          </SubmitButton>
                        </ActionForm>
                        <ActionForm action={handleDelete} successMessage="Event deleted.">
                          <input type="hidden" name="id" value={event.id} />
                          <SubmitButton pendingText="Deleting…" className="text-xs text-red-400 hover:text-red-600 transition-colors">
                            Delete
                          </SubmitButton>
                        </ActionForm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
