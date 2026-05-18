import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { markStudentAttendance } from '@/lib/actions/attendance'
import { redirect } from 'next/navigation'

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'] as const

async function handleMark(formData: FormData): Promise<void> {
  'use server'
  await markStudentAttendance(formData)
}

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const selectedDate = searchParams.date || today
  const attendanceDate = new Date(selectedDate)

  // Get classes where this teacher is assigned
  const myClasses = await db.classRoom.findMany({
    where: {
      teachers: { some: { userId: session.user.id } },
    },
    include: {
      students: {
        where: { deletedAt: null, status: 'active' },
        orderBy: [{ firstName: 'asc' }],
      },
    },
    orderBy: { order: 'asc' },
  })

  if (myClasses.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-coffee-900 mb-4">Mark Attendance</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          You are not assigned to any class. Contact the admin.
        </div>
      </div>
    )
  }

  // Get existing attendance records across all teacher's classes for this date
  const allStudentIds = myClasses.flatMap((c) => c.students.map((s) => s.id))
  const existingRecords = await db.studentAttendance.findMany({
    where: { studentId: { in: allStudentIds }, date: attendanceDate },
  })
  const existing = Object.fromEntries(existingRecords.map((r) => [r.studentId, r]))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Mark Attendance</h1>
          <p className="text-coffee-600 text-sm mt-0.5">Mark attendance for your students</p>
        </div>
        <form method="GET" className="flex items-end gap-2">
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            max={today}
            className="border border-coffee-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
          <button
            type="submit"
            className="bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
          >
            Load
          </button>
        </form>
      </div>

      {myClasses.map((cls) => {
        const classStudents = cls.students
        const classSaved = classStudents.some((s) => existing[s.id])

        return (
          <form key={cls.id} action={handleMark} className="space-y-3">
            <input type="hidden" name="classId" value={cls.id} />
            <input type="hidden" name="date" value={selectedDate} />

            <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-coffee-50 border-b border-coffee-200 flex items-center justify-between">
                <span className="font-semibold text-coffee-800">{cls.name}</span>
                <div className="flex items-center gap-3">
                  {classSaved && (
                    <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                      Already saved
                    </span>
                  )}
                  <span className="text-xs text-coffee-500">
                    {classStudents.length} student{classStudents.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {classStudents.length === 0 ? (
                <div className="px-5 py-4 text-sm text-coffee-400">No active students.</div>
              ) : (
                <div className="divide-y divide-coffee-100">
                  {classStudents.map((s) => {
                    const rec = existing[s.id]
                    return (
                      <div key={s.id} className="px-5 py-3 flex items-center gap-4">
                        <input type="hidden" name="studentId" value={s.id} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-coffee-900">
                            {s.firstName} {s.lastName}
                          </p>
                          <p className="text-xs font-mono text-coffee-400">{s.admissionNumber}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {STATUS_OPTIONS.map((status) => (
                            <label key={status} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`status_${s.id}`}
                                value={status}
                                defaultChecked={rec ? rec.status === status : status === 'present'}
                                className="w-3.5 h-3.5 accent-coffee-700"
                              />
                              <span className="text-xs text-coffee-600 capitalize">{status}</span>
                            </label>
                          ))}
                        </div>
                        <input
                          type="text"
                          name={`note_${s.id}`}
                          defaultValue={rec?.note ?? ''}
                          placeholder="Note"
                          className="border border-coffee-200 rounded px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-coffee-400"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {classStudents.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-coffee-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
                >
                  {classSaved ? 'Update' : 'Save'} — {cls.name}
                </button>
              </div>
            )}
          </form>
        )
      })}
    </div>
  )
}
