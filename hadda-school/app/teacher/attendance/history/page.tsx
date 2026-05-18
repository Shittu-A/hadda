import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  excused: 'neutral',
}

export default async function AttendanceHistoryPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string }
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const fromDate = searchParams.from
    ? new Date(searchParams.from)
    : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // last 14 days
  const toDate = searchParams.to ? new Date(searchParams.to) : new Date()

  // Get classes where this teacher is assigned
  const myClasses = await db.classRoom.findMany({
    where: { teachers: { some: { userId: session.user.id } } },
    select: { id: true, name: true },
  })

  if (myClasses.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-coffee-900 mb-4">Attendance History</h1>
        <p className="text-coffee-400 text-sm">You are not assigned to any class.</p>
      </div>
    )
  }

  const classIds = myClasses.map((c) => c.id)

  // Get attendance records submitted by this teacher
  const records = await db.studentAttendance.findMany({
    where: {
      recordedById: session.user.id,
      classId: { in: classIds },
      date: { gte: fromDate, lte: toDate },
    },
    include: { student: true, class: true },
    orderBy: [{ date: 'desc' }, { class: { name: 'asc' } }],
  })

  // Group by date
  const byDate = records.reduce<Record<string, typeof records>>((acc, r) => {
    const d = r.date.toISOString().split('T')[0]
    if (!acc[d]) acc[d] = []
    acc[d].push(r)
    return acc
  }, {})

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Attendance History</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Your submitted attendance records</p>
      </div>

      <form method="GET" className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-coffee-600 mb-1">From</label>
          <input
            type="date"
            name="from"
            defaultValue={fromDate.toISOString().split('T')[0]}
            max={today}
            className="border border-coffee-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coffee-400 w-full sm:w-auto"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-coffee-600 mb-1">To</label>
          <input
            type="date"
            name="to"
            defaultValue={toDate.toISOString().split('T')[0]}
            max={today}
            className="border border-coffee-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coffee-400 w-full sm:w-auto"
          />
        </div>
        <button
          type="submit"
          className="bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 w-full sm:w-auto"
        >
          Filter
        </button>
      </form>

      {dates.length === 0 ? (
        <div className="text-center py-16 text-coffee-400">
          No attendance records in this date range.
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => {
            const dayRecords = byDate[date]
            const counts = dayRecords.reduce<Record<string, number>>((a, r) => {
              a[r.status] = (a[r.status] || 0) + 1
              return a
            }, {})
            return (
              <div key={date} className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
                <div className="px-4 sm:px-5 py-3 bg-coffee-50 border-b border-coffee-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="font-semibold text-coffee-800">{formatDate(new Date(date))}</span>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                    {Object.entries(counts).map(([status, n]) => (
                      <Badge key={status} variant={STATUS_VARIANT[status]}>
                        {n} {status}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-coffee-50">
                      {dayRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-coffee-50">
                          <td className="px-4 sm:px-5 py-2.5 font-medium text-coffee-900">
                            {r.student.firstName} {r.student.lastName}
                          </td>
                          <td className="px-4 sm:px-5 py-2.5 text-coffee-500 text-xs font-mono hidden sm:table-cell">
                            {r.student.admissionNumber}
                          </td>
                          <td className="px-4 sm:px-5 py-2.5 text-coffee-500 hidden sm:table-cell">{r.class.name}</td>
                          <td className="px-4 sm:px-5 py-2.5">
                            <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                          </td>
                          <td className="px-4 sm:px-5 py-2.5 text-coffee-400 text-xs hidden sm:table-cell">{r.note || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
