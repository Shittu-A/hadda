import { db } from '@/lib/db'
import { markTeacherAttendance } from '@/lib/actions/attendance'
import Badge from '@/components/ui/Badge'

const STATUS_OPTIONS = ['present', 'absent', 'late', 'on_leave'] as const
const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  on_leave: 'neutral',
}

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const sp = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const selectedDate = sp.date || today
  const attendanceDate = new Date(selectedDate)

  const teachers = await db.user.findMany({
    where: { role: { in: ['teacher', 'admin'] }, isActive: true },
    orderBy: { name: 'asc' },
  })

  const records = await db.teacherAttendance.findMany({
    where: {
      date: attendanceDate,
      userId: { in: teachers.map((t) => t.id) },
    },
  })

  const existing = Object.fromEntries(records.map((r) => [r.userId, r]))
  const alreadySaved = records.length > 0

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Teacher Attendance</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Mark daily staff attendance</p>
      </div>

      {/* Date selector */}
      <form method="GET" className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-coffee-600 mb-1">Date</label>
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            max={today}
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
        >
          Load
        </button>
      </form>

      <form action={markTeacherAttendance} className="space-y-4">
        <input type="hidden" name="date" value={selectedDate} />

        {alreadySaved && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
            Attendance already recorded for this date. Submitting will update existing records.
          </div>
        )}

        <div className="bg-white border border-coffee-200 rounded-xl overflow-x-auto">
          <div className="px-4 sm:px-5 py-3 bg-coffee-50 border-b border-coffee-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-sm font-semibold text-coffee-700">
              {teachers.length} staff member{teachers.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-coffee-500">{selectedDate}</span>
          </div>

          <div className="divide-y divide-coffee-100">
            {teachers.map((teacher) => {
              const rec = existing[teacher.id]
              return (
                <div key={teacher.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <input type="hidden" name="teacherId" value={teacher.id} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-coffee-900">{teacher.name}</p>
                    <p className="text-xs text-coffee-400 capitalize">{teacher.role.replace('_', ' ')}</p>
                  </div>

                  {rec && (
                    <Badge variant={STATUS_VARIANT[rec.status]}>
                      {rec.status.replace('_', ' ')}
                    </Badge>
                  )}

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {STATUS_OPTIONS.map((status) => (
                      <label key={status} className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                        <input
                          type="radio"
                          name={`status_${teacher.id}`}
                          value={status}
                          defaultChecked={rec ? rec.status === status : status === 'present'}
                          className="w-3.5 h-3.5 accent-coffee-700"
                        />
                        <span className="text-xs text-coffee-600 capitalize">
                          {status.replace('_', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>

                  <input
                    type="text"
                    name={`note_${teacher.id}`}
                    defaultValue={rec?.note ?? ''}
                    placeholder="Note"
                    className="w-full sm:w-32 border border-coffee-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-coffee-400"
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
          >
            {alreadySaved ? 'Update Attendance' : 'Save Attendance'}
          </button>
        </div>
      </form>
    </div>
  )
}
