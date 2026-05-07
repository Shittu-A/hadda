import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createMemorizationLog, deleteMemorizationLog } from '@/lib/actions/memorization'
import { redirect } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  sabaq: 'Sabaq (New)',
  sabqi: 'Sabqi (Recent)',
  manzil: 'Manzil (Long-term)',
}
const QUALITY_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  excellent: 'success',
  good: 'info',
  average: 'warning',
  weak: 'danger',
}

async function handleCreate(formData: FormData): Promise<void> {
  'use server'
  await createMemorizationLog(formData)
}

async function handleDelete(formData: FormData): Promise<void> {
  'use server'
  const id = formData.get('id') as string
  await deleteMemorizationLog(id)
}

export default async function TeacherMemorizationPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [myClasses, surahs, recentLogs] = await Promise.all([
    db.classRoom.findMany({
      where: { teachers: { some: { userId: session.user.id } } },
      include: {
        students: {
          where: { deletedAt: null, status: 'active' },
          orderBy: [{ firstName: 'asc' }],
        },
      },
      orderBy: { order: 'asc' },
    }),
    db.surah.findMany({ orderBy: { id: 'asc' } }),
    db.memorizationLog.findMany({
      where: { teacherId: session.user.id },
      include: {
        student: true,
        surahFrom: true,
        surahTo: true,
      },
      orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    }),
  ])

  const allStudents = myClasses.flatMap((c) =>
    c.students.map((s) => ({ ...s, className: c.name }))
  )

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Memorization Logs</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Log sabaq, sabqi, and manzil sessions</p>
      </div>

      {/* Log Form */}
      <div className="bg-white border border-coffee-200 rounded-xl p-5">
        <h2 className="font-semibold text-coffee-800 mb-4">Log a Session</h2>

        {allStudents.length === 0 ? (
          <p className="text-coffee-400 text-sm">
            You have no students assigned. Contact the admin.
          </p>
        ) : (
          <form action={handleCreate} className="space-y-4">
            {/* Row 1: student, date, type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-1">Student *</label>
                <select
                  name="studentId"
                  required
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                >
                  <option value="">Select student</option>
                  {myClasses.map((cls) => (
                    <optgroup key={cls.id} label={cls.name}>
                      {cls.students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.firstName} {s.lastName}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-1">Date *</label>
                <input
                  type="date"
                  name="logDate"
                  required
                  defaultValue={today}
                  max={today}
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-1">Session Type *</label>
                <select
                  name="type"
                  required
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                >
                  <option value="sabaq">Sabaq — New lesson</option>
                  <option value="sabqi">Sabqi — Recent revision</option>
                  <option value="manzil">Manzil — Long-term revision</option>
                </select>
              </div>
            </div>

            {/* Row 2: surah from/to */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-coffee-700">From</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-coffee-500 mb-1">Surah *</label>
                    <select
                      name="surahFromId"
                      required
                      className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
                    >
                      <option value="">Select</option>
                      {surahs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id}. {s.nameEnglish} ({s.nameArabic})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-500 mb-1">Ayah *</label>
                    <input
                      type="number"
                      name="ayahFrom"
                      required
                      min={1}
                      placeholder="1"
                      className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-coffee-700">To</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-coffee-500 mb-1">Surah *</label>
                    <select
                      name="surahToId"
                      required
                      className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
                    >
                      <option value="">Select</option>
                      {surahs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id}. {s.nameEnglish} ({s.nameArabic})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-500 mb-1">Ayah *</label>
                    <input
                      type="number"
                      name="ayahTo"
                      required
                      min={1}
                      placeholder="7"
                      className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: pages, quality, notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-1">Pages *</label>
                <input
                  type="number"
                  name="pages"
                  required
                  min={0.25}
                  step={0.25}
                  placeholder="e.g. 1.5"
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-1">Quality *</label>
                <select
                  name="quality"
                  required
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="weak">Weak / Needs Work</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-1">Notes</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Optional notes…"
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-coffee-900 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
              >
                Save Log
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Recent logs */}
      <div>
        <h2 className="font-semibold text-coffee-800 mb-3">Recent Logs</h2>
        {recentLogs.length === 0 ? (
          <p className="text-coffee-400 text-sm">No logs yet.</p>
        ) : (
          <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-coffee-50 border-b border-coffee-200">
                <tr>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Student</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Range</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Pages</th>
                  <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Quality</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-coffee-50 transition-colors">
                    <td className="px-4 py-2.5 text-coffee-500 whitespace-nowrap">
                      {formatDate(log.logDate)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-coffee-900">
                      {log.student.firstName} {log.student.lastName}
                    </td>
                    <td className="px-4 py-2.5 text-coffee-600 capitalize">
                      {TYPE_LABELS[log.type] || log.type}
                    </td>
                    <td className="px-4 py-2.5 text-coffee-600 text-xs">
                      <span className="font-medium">{log.surahFrom.nameEnglish}</span>
                      {' '}:{log.ayahFrom}
                      {' → '}
                      <span className="font-medium">{log.surahTo.nameEnglish}</span>
                      {' '}:{log.ayahTo}
                    </td>
                    <td className="px-4 py-2.5 text-coffee-700 font-medium">
                      {Number(log.pages).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={QUALITY_VARIANT[log.quality]}>{log.quality}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={handleDelete}>
                        <input type="hidden" name="id" value={log.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
