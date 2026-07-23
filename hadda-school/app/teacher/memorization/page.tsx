import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { upsertMemorizationTarget, gradeMemorizationTarget } from '@/lib/actions/memorization'
import { getCurrentTerm } from '@/lib/current-term'
import { redirect } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { GRADE_VARIANT, GRADE_SCALE_LABEL } from '@/lib/grades'
import BulkTargetForm from './BulkTargetForm'

async function handleSetTarget(formData: FormData): Promise<void> {
  'use server'
  await upsertMemorizationTarget(formData)
}

async function handleGrade(formData: FormData): Promise<void> {
  'use server'
  await gradeMemorizationTarget(formData)
}

export default async function TeacherMemorizationPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const term = await getCurrentTerm()

  const [myClasses, surahs, targets] = await Promise.all([
    db.classRoom.findMany({
      // Current session only — past cloned classes have no students.
      where: { teachers: { some: { userId: session.user.id } }, academicYear: { isCurrent: true } },
      include: {
        students: {
          where: { deletedAt: null, status: 'active' },
          orderBy: [{ firstName: 'asc' }],
        },
      },
      orderBy: { order: 'asc' },
    }),
    db.surah.findMany({ orderBy: { id: 'asc' } }),
    term
      ? db.memorizationTarget.findMany({
          where: { termId: term.id },
          include: { surahFrom: true, surahTo: true },
        })
      : Promise.resolve([]),
  ])

  const allStudents = myClasses.flatMap((c) =>
    c.students.map((s) => ({ ...s, className: c.name }))
  )

  const targetByStudent = new Map(targets.map((t) => [t.studentId, t]))

  const withTarget = allStudents.filter((s) => targetByStudent.has(s.id))
  const graded = withTarget.filter((s) => targetByStudent.get(s.id)?.achievedPercent != null)

  if (!term) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Memorization</h1>
          <p className="text-coffee-600 text-sm mt-0.5">Termly targets and grades</p>
        </div>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          No current term has been set yet. Ask an administrator to set the current term before
          recording memorization targets.
        </p>
      </div>
    )
  }

  const termEnded = new Date(term.endDate) < new Date()

  return (
    <div className="p-4 sm:p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Memorization</h1>
          <p className="text-coffee-600 text-sm mt-0.5">
            Set each student a target for the term, then grade what they achieved
          </p>
        </div>
        <div className="text-left sm:text-right">
          <Badge variant="info">{term.name}</Badge>
          <p className="text-coffee-500 text-xs mt-1">
            {formatDate(term.startDate)} – {formatDate(term.endDate)}
          </p>
        </div>
      </div>

      {/* Progress at a glance */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-coffee-200 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-coffee-900">{allStudents.length}</p>
          <p className="text-xs text-coffee-500 mt-0.5">Students</p>
        </div>
        <div className="bg-white border border-coffee-200 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-coffee-900">{withTarget.length}</p>
          <p className="text-xs text-coffee-500 mt-0.5">Targets set</p>
        </div>
        <div className="bg-white border border-coffee-200 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-coffee-900">{graded.length}</p>
          <p className="text-xs text-coffee-500 mt-0.5">Graded</p>
        </div>
      </div>

      {termEnded && graded.length < withTarget.length && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {term.name} has ended and {withTarget.length - graded.length} student
          {withTarget.length - graded.length !== 1 ? 's are' : ' is'} still ungraded.
        </p>
      )}

      {allStudents.length === 0 ? (
        <p className="text-coffee-400 text-sm">
          You have no students in the current academic session.
        </p>
      ) : (
        <>
        {!termEnded && (
          <BulkTargetForm
            students={allStudents.map((s) => ({
              id: s.id,
              firstName: s.firstName,
              lastName: s.lastName,
              admissionNumber: s.admissionNumber,
              className: s.className,
              hasTarget: targetByStudent.has(s.id),
            }))}
            surahs={surahs.map((s) => ({ id: s.id, nameEnglish: s.nameEnglish }))}
          />
        )}
        <div className="space-y-4">
          {allStudents.map((student) => {
            const target = targetByStudent.get(student.id)
            const percent = target?.achievedPercent != null ? Number(target.achievedPercent) : null

            return (
              <div key={student.id} className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <p className="font-semibold text-coffee-900">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-coffee-500 text-xs">
                      {student.admissionNumber} · {student.className}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {percent != null ? (
                      <>
                        <span className="text-sm font-bold text-coffee-900">{percent}%</span>
                        <Badge variant={GRADE_VARIANT[target!.grade ?? 'F'] ?? 'neutral'}>
                          {target!.grade}
                        </Badge>
                      </>
                    ) : target ? (
                      <Badge variant="warning">Awaiting grade</Badge>
                    ) : (
                      <Badge variant="neutral">No target set</Badge>
                    )}
                  </div>
                </div>

                {target && (
                  <div className="bg-coffee-50 rounded-lg px-3 py-2 mb-4 text-sm">
                    <p className="text-coffee-800">
                      {target.surahFrom.nameEnglish} {target.ayahFrom} → {target.surahTo.nameEnglish}{' '}
                      {target.ayahTo}
                      <span className="text-coffee-500"> · {Number(target.targetPages)} pages</span>
                    </p>
                    {target.notes && <p className="text-coffee-500 text-xs mt-0.5">{target.notes}</p>}
                    {target.remark && (
                      <p className="text-coffee-600 text-xs mt-1">Remark: {target.remark}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Set / update the target */}
                  <form action={handleSetTarget} className="space-y-3">
                    <input type="hidden" name="studentId" value={student.id} />
                    <p className="text-xs font-semibold text-coffee-700 uppercase tracking-wide">
                      {target ? 'Update target' : 'Set target'}
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-coffee-600 mb-1">From surah</label>
                        <select
                          name="surahFromId"
                          required
                          defaultValue={target?.surahFromId ?? ''}
                          className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                        >
                          <option value="">Select</option>
                          {surahs.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id}. {s.nameEnglish}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-coffee-600 mb-1">Ayah</label>
                        <input
                          type="number"
                          name="ayahFrom"
                          required
                          min={1}
                          defaultValue={target?.ayahFrom ?? ''}
                          className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-coffee-600 mb-1">To surah</label>
                        <select
                          name="surahToId"
                          required
                          defaultValue={target?.surahToId ?? ''}
                          className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                        >
                          <option value="">Select</option>
                          {surahs.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id}. {s.nameEnglish}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-coffee-600 mb-1">Ayah</label>
                        <input
                          type="number"
                          name="ayahTo"
                          required
                          min={1}
                          defaultValue={target?.ayahTo ?? ''}
                          className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-coffee-600 mb-1">Target pages</label>
                      <input
                        type="number"
                        name="targetPages"
                        required
                        min={0.25}
                        step={0.25}
                        defaultValue={target ? Number(target.targetPages) : ''}
                        className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-coffee-600 mb-1">Notes (optional)</label>
                      <input
                        type="text"
                        name="notes"
                        defaultValue={target?.notes ?? ''}
                        className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
                    >
                      {target ? 'Update Target' : 'Set Target'}
                    </button>
                  </form>

                  {/* Grade at term end */}
                  <form action={handleGrade} className="space-y-3">
                    <p className="text-xs font-semibold text-coffee-700 uppercase tracking-wide">
                      End-of-term grade
                    </p>

                    {!target ? (
                      <p className="text-coffee-400 text-sm">Set a target first.</p>
                    ) : (
                      <>
                        <input type="hidden" name="targetId" value={target.id} />
                        <div>
                          <label className="block text-xs font-medium text-coffee-600 mb-1">
                            Achieved (%)
                          </label>
                          <input
                            type="number"
                            name="achievedPercent"
                            required
                            min={0}
                            max={100}
                            step={1}
                            defaultValue={percent ?? ''}
                            className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                          />
                          <p className="text-xs text-coffee-400 mt-1">{GRADE_SCALE_LABEL}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-coffee-600 mb-1">
                            Remark (optional)
                          </label>
                          <input
                            type="text"
                            name="remark"
                            defaultValue={target.remark ?? ''}
                            className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                          />
                        </div>

                        {target.gradedAt && (
                          <p className="text-xs text-coffee-400">
                            Last graded {formatDate(target.gradedAt)}
                          </p>
                        )}

                        <button
                          type="submit"
                          className="w-full border border-coffee-300 text-coffee-800 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
                        >
                          {percent != null ? 'Update Grade' : 'Save Grade'}
                        </button>
                      </>
                    )}
                  </form>
                </div>
              </div>
            )
          })}
        </div>
        </>
      )}
    </div>
  )
}
