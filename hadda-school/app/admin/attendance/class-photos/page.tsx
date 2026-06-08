import { db } from '@/lib/db'
import Badge from '@/components/ui/Badge'
import {
  verifyAttendancePhoto,
  rejectAttendancePhoto,
  purgeExpiredAttendancePhotos,
} from '@/lib/actions/attendance-photos'

export const dynamic = 'force-dynamic'

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
}

function fmt(d: Date) {
  return new Date(d).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminClassPhotosPage() {
  // Delete-on-read: free storage for verified photos older than 72h.
  await purgeExpiredAttendancePhotos()

  const [pending, recent] = await Promise.all([
    db.classAttendancePhoto.findMany({
      where: { status: 'pending' },
      include: { user: { select: { name: true } }, class: { select: { name: true } } },
      orderBy: { capturedAt: 'desc' },
    }),
    db.classAttendancePhoto.findMany({
      where: { status: { in: ['verified', 'rejected'] } },
      include: { user: { select: { name: true } }, class: { select: { name: true } } },
      orderBy: { verifiedAt: 'desc' },
      take: 20,
    }),
  ])

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Class Photo Verification</h1>
        <p className="text-coffee-600 text-sm mt-0.5">
          Confirm each photo is a genuine class shot. Verifying marks the teacher present/late
          from the photo&apos;s capture time. Verified photos are auto-deleted from storage
          after 72 hours.
        </p>
      </div>

      {/* Pending review */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-coffee-700">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="bg-white border border-coffee-200 rounded-xl px-4 py-6 text-sm text-coffee-400">
            Nothing awaiting verification.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pending.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-coffee-200 rounded-xl overflow-hidden flex flex-col sm:flex-row"
              >
                {p.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a
                    href={p.photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.photoUrl}
                      alt="Class photo"
                      className="w-full sm:w-40 h-40 object-cover"
                    />
                  </a>
                )}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold text-coffee-900">{p.user.name}</p>
                    <p className="text-xs text-coffee-500">{p.class.name}</p>
                    <p className="text-xs text-coffee-500 mt-1">Captured {fmt(p.capturedAt)}</p>
                  </div>

                  <div className="mt-auto flex flex-col gap-2">
                    <form action={verifyAttendancePhoto}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="w-full bg-green-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-green-800 transition-colors"
                      >
                        Verify &amp; Mark Attendance
                      </button>
                    </form>
                    <form action={rejectAttendancePhoto} className="flex gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        type="text"
                        name="note"
                        placeholder="Reason (optional)"
                        className="flex-1 min-w-0 border border-coffee-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-coffee-400"
                      />
                      <button
                        type="submit"
                        className="bg-red-100 text-red-700 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-200 transition-colors whitespace-nowrap"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent decisions */}
      <details className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
        <summary className="px-4 sm:px-5 py-3 bg-coffee-50 border-b border-coffee-200 text-sm font-semibold text-coffee-700 cursor-pointer select-none">
          Recently Reviewed
        </summary>
        {recent.length === 0 ? (
          <div className="px-4 sm:px-5 py-4 text-sm text-coffee-400">No history yet.</div>
        ) : (
          <div className="divide-y divide-coffee-100">
            {recent.map((p) => (
              <div key={p.id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-coffee-900">
                    {p.user.name} <span className="text-coffee-400">·</span> {p.class.name}
                  </p>
                  <p className="text-xs text-coffee-500">
                    Captured {fmt(p.capturedAt)}
                    {p.photoDeletedAt ? ' · photo purged' : ''}
                    {p.reviewNote ? ` · ${p.reviewNote}` : ''}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </details>
    </div>
  )
}
