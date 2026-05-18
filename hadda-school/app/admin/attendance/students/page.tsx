import { db } from '@/lib/db'
import { markStudentAttendance } from '@/lib/actions/attendance'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'] as const
const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  excused: 'neutral',
}

async function handleMark(formData: FormData): Promise<void> {
  'use server'
  await markStudentAttendance(formData)
}

export default async function StudentAttendancePage({
  searchParams,
}: {
  searchParams: { classId?: string; date?: string }
}) {
  const today = new Date().toISOString().split('T')[0]
  const selectedDate = searchParams.date || today
  const selectedClassId = searchParams.classId

  const currentYear = await db.academicYear.findFirst({ where: { isCurrent: true } })
  const classes = await db.classRoom.findMany({
    where: currentYear ? { academicYearId: currentYear.id } : {},
    orderBy: { order: 'asc' },
  })

  let students: any[] = []
  let existingAttendance: Record<string, any> = {}

  if (selectedClassId) {
    const attendanceDate = new Date(selectedDate)

    ;[students] = await Promise.all([
      db.student.findMany({
        where: { currentClassId: selectedClassId, deletedAt: null, status: 'active' },
        orderBy: [{ firstName: 'asc' }],
      }),
    ])

    const records = await db.studentAttendance.findMany({
      where: {
        classId: selectedClassId,
        date: attendanceDate,
        studentId: { in: students.map((s) => s.id) },
      },
    })

    existingAttendance = Object.fromEntries(records.map((r) => [r.studentId, r]))
  }

  const alreadySaved = Object.keys(existingAttendance).length > 0

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Student Attendance</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Mark daily attendance by class</p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-coffee-600 mb-1">Class</label>
          <select
            name="classId"
            defaultValue={selectedClassId}
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coffee-400"
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
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

      {selectedClassId && students.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          No active students in this class.
        </div>
      )}

      {selectedClassId && students.length > 0 && (
        <form action={handleMark} className="space-y-4">
          <input type="hidden" name="classId" value={selectedClassId} />
          <input type="hidden" name="date" value={selectedDate} />

          {alreadySaved && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
              Attendance already recorded for this date. Submitting will update existing records.
            </div>
          )}

          <div className="bg-white border border-coffee-200 rounded-xl overflow-x-auto">
            <div className="px-4 sm:px-5 py-3 bg-coffee-50 border-b border-coffee-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm font-semibold text-coffee-700">
                {students.length} student{students.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-coffee-500">{selectedDate}</span>
            </div>

            <div className="divide-y divide-coffee-100">
              {students.map((s) => {
                const existing = existingAttendance[s.id]
                return (
                  <div key={s.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <input type="hidden" name="studentId" value={s.id} />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-coffee-900">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-xs text-coffee-400 font-mono">{s.admissionNumber}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {STATUS_OPTIONS.map((status) => (
                        <label key={status} className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name={`status_${s.id}`}
                            value={status}
                            defaultChecked={
                              existing ? existing.status === status : status === 'present'
                            }
                            className="w-3.5 h-3.5 accent-coffee-700"
                          />
                          <span className="text-xs text-coffee-600 capitalize">{status}</span>
                        </label>
                      ))}
                    </div>

                    <input
                      type="text"
                      name={`note_${s.id}`}
                      defaultValue={existing?.note ?? ''}
                      placeholder="Note (optional)"
                      className="w-full sm:w-36 border border-coffee-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-coffee-400"
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
      )}

      {!selectedClassId && (
        <div className="text-center py-16 text-coffee-400">
          Select a class and date to mark attendance.
        </div>
      )}
    </div>
  )
}
