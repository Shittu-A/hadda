import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import PhotoAttendanceUploader from '@/components/attendance/PhotoAttendanceUploader'

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
}

export default async function TeacherPhotoAttendancePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [myClasses, submissions] = await Promise.all([
    db.classRoom.findMany({
      where: { teachers: { some: { userId: session.user.id } } },
      select: { id: true, name: true },
      orderBy: { order: 'asc' },
    }),
    db.classAttendancePhoto.findMany({
      where: { userId: session.user.id },
      include: { class: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Class Photo Attendance</h1>
        <p className="text-coffee-600 text-sm mt-0.5">
          Snap a photo of your class to clock in. Your attendance time is read from the
          photo&apos;s capture time and confirmed by an admin.
        </p>
      </div>

      {myClasses.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          You are not assigned to any class. Contact the admin.
        </div>
      ) : (
        <PhotoAttendanceUploader classes={myClasses} />
      )}

      <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3 bg-coffee-50 border-b border-coffee-200">
          <span className="text-sm font-semibold text-coffee-700">My Submissions</span>
        </div>
        {submissions.length === 0 ? (
          <div className="px-4 sm:px-5 py-4 text-sm text-coffee-400">No submissions yet.</div>
        ) : (
          <div className="divide-y divide-coffee-100">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="px-4 sm:px-5 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-coffee-900">{s.class.name}</p>
                  <p className="text-xs text-coffee-500">
                    Captured{' '}
                    {new Date(s.capturedAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {s.status === 'rejected' && s.reviewNote && (
                    <p className="text-xs text-red-600 mt-0.5">Reason: {s.reviewNote}</p>
                  )}
                </div>
                <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
