import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import SubmitButton from '@/components/ui/SubmitButton'
import { processPromotions, undoPromotions } from '@/lib/actions/promotions'

const OUTCOME_LABEL: Record<string, string> = {
  promoted: 'Promoted',
  retained: 'Retained',
  graduated: 'Graduated',
  withdrawn: 'Withdrawn',
  transferred: 'Transferred',
}

const OUTCOME_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  promoted: 'success',
  retained: 'info',
  graduated: 'info',
  withdrawn: 'danger',
  transferred: 'neutral',
}

async function handleProcess(formData: FormData): Promise<void> {
  'use server'
  await processPromotions(formData)
}

async function handleUndo(formData: FormData): Promise<void> {
  'use server'
  await undoPromotions(formData)
}

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ fromYearId?: string; toYearId?: string; done?: string; undone?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const sp = await searchParams
  const academicYears = await db.academicYear.findMany({ orderBy: { startDate: 'desc' } })
  const currentYear = academicYears.find((y) => y.isCurrent)

  const fromYearId = sp.fromYearId || currentYear?.id || ''
  const toYearId = sp.toYearId || ''
  const isDone = sp.done === '1'
  const undoneCount = sp.undone ? Number(sp.undone) : null

  let students: any[] = []
  let classes: { id: string; name: string }[] = []
  let alreadyProcessed: Set<string> = new Set()

  if (fromYearId && toYearId && fromYearId !== toYearId) {
    ;[students, classes] = await Promise.all([
      db.student.findMany({
        where: { deletedAt: null, status: 'active' },
        include: { currentClass: true },
        orderBy: [{ currentClass: { order: 'asc' } }, { firstName: 'asc' }],
      }),
      db.classRoom.findMany({
        where: { academicYearId: toYearId },
        orderBy: { order: 'asc' },
        select: { id: true, name: true },
      }),
    ])

    const existingPromotions = await db.promotion.findMany({
      where: { fromAcademicYearId: fromYearId, studentId: { in: students.map((s) => s.id) } },
      select: { studentId: true },
    })
    alreadyProcessed = new Set(existingPromotions.map((p) => p.studentId))
  }

  // Group active students by class
  const pendingStudents = students.filter((s) => !alreadyProcessed.has(s.id))
  const byClass = pendingStudents.reduce<Record<string, typeof students>>((acc, s) => {
    const key = s.currentClassId ?? '__none__'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const processedCount = alreadyProcessed.size

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Promotions</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Process end-of-year student outcomes</p>
      </div>

      {isDone && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-green-800 text-sm font-medium">
          Promotions processed successfully.
          {processedCount > 0 && (
            <span className="ml-1 text-green-600">({processedCount} already processed)</span>
          )}
        </div>
      )}

      {undoneCount !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-blue-800 text-sm font-medium">
          Reversed {undoneCount} promotion{undoneCount === 1 ? '' : 's'}. Those students are back in
          their previous class and year, and can be processed again.
        </div>
      )}

      {/* Year selector */}
      <form method="GET" className="bg-white border border-coffee-200 rounded-xl p-5">
        <h2 className="font-semibold text-coffee-800 mb-4">Select Academic Years</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">From Year *</label>
            <select
              name="fromYearId"
              defaultValue={fromYearId}
              required
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">Select year</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}{y.isCurrent ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">To Year *</label>
            <select
              name="toYearId"
              defaultValue={toYearId}
              required
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">Select year</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}{y.isCurrent ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
            >
              Load Students
            </button>
          </div>
        </div>
      </form>

      {fromYearId && toYearId && fromYearId === toYearId && (
        <p className="text-red-500 text-sm">From year and To year must be different.</p>
      )}

      {fromYearId && toYearId && fromYearId !== toYearId && classes.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-amber-800 text-sm">
          The destination year has no classes yet. Create the classes for the new
          year first (in{' '}
          <a href="/admin/classes" className="underline font-medium">Classes</a>),
          otherwise promoted students can't be placed into the new session.
        </div>
      )}

      {/* Promotion form */}
      {fromYearId && toYearId && fromYearId !== toYearId && students.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-coffee-600">
                <span className="font-semibold text-coffee-900">{pendingStudents.length}</span> student
                {pendingStudents.length !== 1 ? 's' : ''} pending
                {processedCount > 0 && (
                  <span className="text-coffee-400 ml-2">· {processedCount} already processed</span>
                )}
              </p>
            </div>
          </div>

          {pendingStudents.length === 0 ? (
            <div className="bg-white border border-coffee-200 rounded-xl p-8 text-center text-coffee-400">
              All active students have already been processed for this year transition.
            </div>
          ) : (
            <form action={handleProcess} className="space-y-4">
              <input type="hidden" name="fromYearId" value={fromYearId} />
              <input type="hidden" name="toYearId" value={toYearId} />

              {Object.entries(byClass).map(([classId, classStudents]) => {
                const className =
                  classId === '__none__'
                    ? 'Unassigned'
                    : classStudents[0]?.currentClass?.name ?? 'Unknown'
                return (
                  <div key={classId} className="bg-white border border-coffee-200 rounded-xl overflow-hidden overflow-x-auto">
                    <div className="px-5 py-3 bg-coffee-50 border-b border-coffee-200">
                      <span className="font-semibold text-coffee-800">{className}</span>
                      <span className="text-coffee-400 text-sm ml-2">({classStudents.length} students)</span>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-coffee-100">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-coffee-600 font-medium whitespace-nowrap">Student</th>
                          <th className="text-left px-4 py-2.5 text-coffee-600 font-medium whitespace-nowrap w-40">Outcome *</th>
                          <th className="text-left px-4 py-2.5 text-coffee-600 font-medium whitespace-nowrap w-44">To Class</th>
                          <th className="text-left px-4 py-2.5 text-coffee-600 font-medium whitespace-nowrap hidden sm:table-cell">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-coffee-50">
                        {classStudents.map((s) => (
                          <tr key={s.id} className="hover:bg-coffee-50">
                            <td className="px-4 py-2.5">
                              <input type="hidden" name="studentId" value={s.id} />
                              <p className="font-medium text-coffee-900">
                                {s.firstName} {s.lastName}
                              </p>
                              <p className="text-xs text-coffee-400 font-mono">{s.admissionNumber}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                name={`outcome_${s.id}`}
                                required
                                defaultValue="promoted"
                                className="w-full border border-coffee-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
                              >
                                <option value="promoted">Promoted</option>
                                <option value="retained">Retained</option>
                                <option value="graduated">Graduated</option>
                                <option value="withdrawn">Withdrawn</option>
                                <option value="transferred">Transferred</option>
                              </select>
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                name={`toClassId_${s.id}`}
                                className="w-full border border-coffee-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
                              >
                                <option value="">— same class —</option>
                                {classes.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2.5 hidden sm:table-cell">
                              <input
                                type="text"
                                name={`notes_${s.id}`}
                                placeholder="Optional notes"
                                className="w-full border border-coffee-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )
              })}

              <div className="flex justify-end pt-2">
                <SubmitButton
                  pendingText="Processing…"
                  className="bg-coffee-900 text-white rounded-lg px-8 py-2.5 text-sm font-medium hover:bg-coffee-800 transition-colors"
                >
                  Process {pendingStudents.length} Student{pendingStudents.length !== 1 ? 's' : ''}
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      )}

      {fromYearId && toYearId && fromYearId !== toYearId && students.length === 0 && !isDone && (
        <div className="text-center py-16 text-coffee-400 text-sm">
          No active students found to process.
        </div>
      )}

      {/* Promotion history */}
      {fromYearId && processedCount > 0 && (
        <div className="overflow-x-auto">
          <PromotionHistory fromYearId={fromYearId} toYearId={toYearId} />
        </div>
      )}
    </div>
  )
}

async function PromotionHistory({ fromYearId, toYearId }: { fromYearId: string; toYearId: string }) {
  const promotions = await db.promotion.findMany({
    where: { fromAcademicYearId: fromYearId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      fromClass: { select: { name: true } },
      toClass: { select: { name: true } },
      toAcademicYear: { select: { name: true } },
      processedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (promotions.length === 0) return null

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="font-semibold text-coffee-800">Processed ({promotions.length})</h2>
        <form action={handleUndo}>
          <input type="hidden" name="fromYearId" value={fromYearId} />
          <input type="hidden" name="toYearId" value={toYearId} />
          <SubmitButton
            pendingText="Undoing…"
            className="border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Undo all {promotions.length} & re-run
          </SubmitButton>
        </form>
      </div>
      <p className="text-coffee-500 text-xs mb-3">
        Undoing returns each student to the class and year they were promoted from, so you can
        process them again.
      </p>
      <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-coffee-50 border-b border-coffee-200">
            <tr>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap">Student</th>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden sm:table-cell">From Class</th>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap">Outcome</th>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden sm:table-cell">To Class</th>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden md:table-cell">To Year</th>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden lg:table-cell">Notes</th>
              <th className="text-left px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap hidden lg:table-cell">By</th>
              <th className="text-right px-4 py-3 text-coffee-700 font-semibold whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-coffee-100">
            {promotions.map((p) => (
              <tr key={p.id} className="hover:bg-coffee-50">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-coffee-900">
                    {p.student.firstName} {p.student.lastName}
                  </p>
                  <p className="text-xs text-coffee-400 font-mono">{p.student.admissionNumber}</p>
                </td>
                <td className="px-4 py-2.5 text-coffee-600 text-xs hidden sm:table-cell">{p.fromClass?.name ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={OUTCOME_VARIANT[p.outcome]}>{OUTCOME_LABEL[p.outcome]}</Badge>
                </td>
                <td className="px-4 py-2.5 text-coffee-600 text-xs hidden sm:table-cell">{p.toClass?.name ?? '—'}</td>
                <td className="px-4 py-2.5 text-coffee-600 text-xs hidden md:table-cell">{p.toAcademicYear.name}</td>
                <td className="px-4 py-2.5 text-coffee-400 text-xs hidden lg:table-cell">{p.notes || '—'}</td>
                <td className="px-4 py-2.5 text-coffee-400 text-xs hidden lg:table-cell">{p.processedBy.name}</td>
                <td className="px-4 py-2.5 text-right">
                  <form action={handleUndo}>
                    <input type="hidden" name="fromYearId" value={fromYearId} />
                    <input type="hidden" name="toYearId" value={toYearId} />
                    <input type="hidden" name="studentId" value={p.student.id} />
                    <SubmitButton
                      pendingText="Undoing…"
                      className="text-red-600 text-xs font-medium hover:underline whitespace-nowrap"
                    >
                      Undo
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
