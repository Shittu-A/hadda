import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { updateEvent } from '@/lib/actions/events'

async function handleUpdate(formData: FormData): Promise<void> {
  'use server'
  await updateEvent(formData)
}

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const event = await db.event.findUnique({ where: { id: params.id } })
  if (!event) notFound()

  const eventDateStr = event.eventDate.toISOString().split('T')[0]

  return (
    <div className="p-4 sm:p-6 max-w-xl">
      <Link href="/super-admin/events" className="text-coffee-500 text-sm hover:text-coffee-700">
        ← Back to Events
      </Link>
      <h1 className="text-2xl font-bold text-coffee-900 mt-3 mb-6">Edit Event</h1>

      <form action={handleUpdate} className="space-y-4 bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
        <input type="hidden" name="id" value={event.id} />

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Title *</label>
          <input
            type="text"
            name="title"
            required
            defaultValue={event.title}
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Event Date *</label>
          <input
            type="date"
            name="eventDate"
            required
            defaultValue={eventDateStr}
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={event.description ?? ''}
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">YouTube URL</label>
          <input
            type="url"
            name="youtubeUrl"
            defaultValue={event.youtubeUrl}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-coffee-700">
          <input
            type="checkbox"
            name="isPublished"
            value="true"
            defaultChecked={event.isPublished}
            className="rounded border-coffee-300"
          />
          Published (visible on public site)
        </label>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-coffee-900 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
