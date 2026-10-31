import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { markTeacherAttendance, markTeacherArrival, resetTeacherAttendance } from '@/lib/actions/attendance'
import { getTeacherAttendanceReport } from '@/lib/reports/teacher-attendance'
import Badge from '@/components/ui/Badge'
import LiveClock from '@/components/attendance/LiveClock'
import ActionForm from '@/components/ui/ActionForm'
import SubmitButton from '@/components/ui/SubmitButton'

const STATUS_OPTIONS = ['present', 'absent', 'late', 'on_leave'] as const
const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  on_leave: 'neutral',
}

async function handleMarkArrival(formData: FormData) {
  'use server'
  await markTeacherArrival(formData)
  return { success: true, message: 'Arrival recorded.' }
}

async function handleMarkAttendance(formData: FormData) {
  'use server'
  await markTeacherAttendance(formData)
  return { success: true, message: 'Attendance saved.' }
}

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; reset?: string; from?: string; to?: string }>
}) {
  const session = await auth()
  const isSuperAdmin = session?.user.role === 'super_admin'

  const sp = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const selectedDate = sp.date || today
  const attendanceDate = new Date(selectedDate)
  const isToday = selectedDate === today

  // Summary range defaults to the last 30 days so the page opens with something
  // meaningful without the admin having to pick dates first.
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const summaryFrom = sp.from || monthAgo
  const summaryTo = sp.to || today

  const teachers = await db.user.findMany({
    where: { role: { in: ['teacher', 'admin'] }, isActive: true },
    orderBy: { name: 'asc' },
  })

  const teacherIds = teachers.map((t) => t.id)

  const [records, thresholdSetting, summary] = await Promise.all([
    db.teacherAttendance.findMany({
      where: { date: attendanceDate, userId: { in: teacherIds } },
    }),
    db.setting.findUnique({ where: { key: 'teacher_late_threshold' } }),
    // Same builder the Excel/PDF exports use, so the on-screen figures and the
    // downloaded report can never drift apart.
    getTeacherAttendanceReport(summaryFrom, summaryTo),
  ])

  const existing = Object.fromEntries(records.map((r) => [r.userId, r]))
  const alreadySaved = records.length > 0
  const lateThreshold = thresholdSetting?.value ?? '08:00'

  // Only the super admin can wipe the history, so only they need the total.
  const totalRecords = isSuperAdmin ? await db.teacherAttendance.count() : 0

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Teacher Attendance</h1>
          <p className="text-coffee-600 text-sm mt-0.5">Mark daily staff attendance</p>
        </div>
        {isToday && <LiveClock lateThreshold={lateThreshold} />}
      </div>

      {isToday && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          <strong>Auto Late Detection:</strong> Arrivals after <strong>{lateThreshold}</strong> will be automatically marked as <em>Late</em>. Use &ldquo;Mark Arrived&rdquo; buttons for real-time clock-in.
        </div>
      )}

      {/* Date selector */}
      <form method="GET" className="flex flex-col sm:flex-row sm:items-end gap-3">
        {/* Keep the summary range when only the marking date changes. */}
        <input type="hidden" name="from" value={summaryFrom} />
        <input type="hidden" name="to" value={summaryTo} />
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

      {/* Per-teacher arrival rows */}
      <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3 bg-coffee-50 border-b border-coffee-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-sm font-semibold text-coffee-700">
            {teachers.length} staff member{teachers.length !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-coffee-500">{selectedDate}</span>
        </div>

        <div className="divide-y divide-coffee-100">
          {teachers.map((teacher) => {
            const rec = existing[teacher.id]
            const arrivalStr = rec?.arrivalTime
              ? new Date(rec.arrivalTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              : null

            return (
              <div key={teacher.id} className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-coffee-900">{teacher.name}</p>
                  <p className="text-xs text-coffee-400 capitalize">{teacher.role.replace('_', ' ')}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {rec ? (
                    <>
                      <Badge variant={STATUS_VARIANT[rec.status]}>
                        {rec.status.replace('_', ' ')}
                      </Badge>
                      {arrivalStr && (
                        <span className="text-xs text-coffee-500">arrived {arrivalStr}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-coffee-400 italic">Not marked</span>
                  )}
                </div>

                {/* Mark Arrived (auto late detection) */}
                {isToday && (
                  <ActionForm action={handleMarkArrival} successMessage="Arrival recorded.">
                    <input type="hidden" name="teacherId" value={teacher.id} />
                    <input type="hidden" name="date" value={selectedDate} />
                    <SubmitButton
                      pendingText="Marking…"
                      className="w-full sm:w-auto bg-green-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-green-800 transition-colors"
                    >
                      {rec?.status === 'present' || rec?.status === 'late' ? 'Re-clock In' : 'Mark Arrived'}
                    </SubmitButton>
                  </ActionForm>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Attendance rates over a range */}
      <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3 bg-coffee-50 border-b border-coffee-200">
          <h2 className="text-sm font-semibold text-coffee-700">Attendance Summary</h2>
          <p className="text-xs text-coffee-500 mt-0.5">
            Attendance and lateness rates across every day school was in session in this range
          </p>
        </div>

        <form method="GET" className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-end gap-3 border-b border-coffee-100">
          {/* Keep the marking date when only the summary range changes. */}
          <input type="hidden" name="date" value={selectedDate} />
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-coffee-600 mb-1">From</label>
            <input
              type="date"
              name="from"
              defaultValue={summaryFrom}
              max={today}
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-coffee-600 mb-1">To</label>
            <input
              type="date"
              name="to"
              defaultValue={summaryTo}
              max={today}
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
          >
            Apply
          </button>
        </form>

        {summary.length === 0 ? (
          <p className="px-4 sm:px-5 py-8 text-sm text-coffee-400 text-center">
            No staff records for this range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-coffee-50/60 border-b border-coffee-200">
                <tr>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap">Teacher</th>
                  <th className="text-center px-3 py-3 text-coffee-700 font-semibold whitespace-nowrap">Present</th>
                  <th className="text-center px-3 py-3 text-coffee-700 font-semibold whitespace-nowrap">Absent</th>
                  <th className="text-center px-3 py-3 text-coffee-700 font-semibold whitespace-nowrap">Late</th>
                  <th className="text-center px-3 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden sm:table-cell">On Leave</th>
                  <th className="text-center px-3 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden md:table-cell">Days</th>
                  <th className="text-right px-3 py-3 text-coffee-700 font-semibold whitespace-nowrap">Attendance</th>
                  <th className="text-right px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap">Lateness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {summary.map((r) => (
                  <tr key={r.userId} className="hover:bg-coffee-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-coffee-900">{r.name}</p>
                      <p className="text-xs text-coffee-400">{r.email}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center text-coffee-600">{r.present}</td>
                    <td className="px-3 py-2.5 text-center text-coffee-600">{r.absent}</td>
                    <td className="px-3 py-2.5 text-center text-coffee-600">{r.late}</td>
                    <td className="px-3 py-2.5 text-center text-coffee-600 hidden sm:table-cell">{r.onLeave}</td>
                    <td className="px-3 py-2.5 text-center text-coffee-500 hidden md:table-cell">{r.total}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-coffee-800">{r.attendanceRate}</td>
                    <td
                      className={`px-4 py-2.5 text-right font-medium ${
                        r.late > 0 ? 'text-amber-700' : 'text-coffee-400'
                      }`}
                    >
                      {r.latenessRate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual bulk override form */}
      <details className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
        <summary className="px-4 sm:px-5 py-3 bg-coffee-50 border-b border-coffee-200 text-sm font-semibold text-coffee-700 cursor-pointer select-none">
          Manual Override (Absent / On Leave / Bulk Edit)
        </summary>
        <ActionForm action={handleMarkAttendance} successMessage="Attendance saved." className="p-4 sm:p-5 space-y-4">
          <input type="hidden" name="date" value={selectedDate} />

          {alreadySaved && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
              Attendance already recorded for this date. Submitting will update existing records.
            </div>
          )}

          <div className="divide-y divide-coffee-100 border border-coffee-100 rounded-xl overflow-hidden">
            {teachers.map((teacher) => {
              const rec = existing[teacher.id]
              return (
                <div key={teacher.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <input type="hidden" name="teacherId" value={teacher.id} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-coffee-900">{teacher.name}</p>
                  </div>

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

          <div className="flex justify-end">
            <SubmitButton
              pendingText="Saving…"
              className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
            >
              {alreadySaved ? 'Update Attendance' : 'Save Attendance'}
            </SubmitButton>
          </div>
        </ActionForm>
      </details>

      {/* Reset — super admin only, so a day-to-day admin cannot wipe the history */}
      {isSuperAdmin && (
        <details className="bg-white border border-red-200 rounded-xl overflow-hidden">
          <summary className="px-4 sm:px-5 py-3 bg-red-50 border-b border-red-200 text-sm font-semibold text-red-700 cursor-pointer select-none">
            Reset All Teacher Attendance
          </summary>
          <form action={resetTeacherAttendance} className="p-4 sm:p-5 space-y-3">
            {sp.reset === 'unconfirmed' && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Nothing was deleted — you must type <strong>RESET</strong> to confirm.
              </p>
            )}
            {sp.reset === 'unauthorized' && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Only the super admin can reset teacher attendance.
              </p>
            )}
            {sp.reset && /^\d+$/.test(sp.reset) && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Teacher attendance reset — {sp.reset} record{sp.reset !== '1' ? 's' : ''} deleted.
              </p>
            )}

            <p className="text-sm text-coffee-600">
              Permanently deletes every teacher attendance record
              {totalRecords > 0 ? ` (${totalRecords} currently stored)` : ''}. Staff start from a
              clean slate. This cannot be undone.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="w-full sm:w-56">
                <label className="block text-xs font-medium text-coffee-600 mb-1">
                  Type RESET to confirm
                </label>
                <input
                  type="text"
                  name="confirm"
                  placeholder="RESET"
                  autoComplete="off"
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <SubmitButton
                pendingText="Resetting…"
                disabled={totalRecords === 0}
                className="w-full sm:w-auto bg-red-600 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reset Attendance
              </SubmitButton>
            </div>
          </form>
        </details>
      )}
    </div>
  )
}
