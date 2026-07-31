import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { balanceInclude, computeStudentBalance, getStudentBalance } from '@/lib/fees/balance'

type StatusFilter = 'all' | 'owing' | 'paid'

export default async function TeacherFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; studentId?: string; classId?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'teacher' && session.user.role !== 'admin' && session.user.role !== 'super_admin') redirect('/')

  const sp = await searchParams
  const q = sp.q?.trim()
  const status: StatusFilter = sp.status === 'owing' || sp.status === 'paid' ? sp.status : 'all'

  const isTeacher = session.user.role === 'teacher'

  // The dropdown lists every class in the current year: a teacher defaults to their
  // own class but may switch to any other.
  const currentYear = await db.academicYear.findFirst({ where: { isCurrent: true }, select: { id: true } })

  const [classes, links] = await Promise.all([
    db.classRoom.findMany({
      where: currentYear ? { academicYearId: currentYear.id } : {},
      select: { id: true, name: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    }),
    db.classTeacher.findMany({
      where: { userId: session.user.id },
      select: { classId: true, isPrimary: true },
      orderBy: { isPrimary: 'desc' },
    }),
  ])

  // A teacher's own class, used as the default view. Only links pointing at a class
  // in the current year count — links left on a previous year's class have no students.
  const ownClassId = links.find((l) => classes.some((c) => c.id === l.classId))?.classId

  // "all" is an explicit choice; anything unrecognised falls back to the teacher's own class.
  const classId =
    sp.classId === 'all'
      ? undefined
      : sp.classId && classes.some((c) => c.id === sp.classId)
        ? sp.classId
        : ownClassId

  const where: any = { deletedAt: null, status: 'active' }
  if (classId) where.currentClassId = classId
  else if (currentYear) where.currentClass = { academicYearId: currentYear.id }
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { admissionNumber: { contains: q, mode: 'insensitive' } },
    ]
  }

  const studentRecords = await db.student.findMany({
    where,
    include: balanceInclude,
    orderBy: [{ firstName: 'asc' }],
  })

  // Balances for the whole list, so fee status is visible without opening each student.
  const rows = studentRecords.map((s) => {
    const bal = computeStudentBalance(s)!
    const currentOutstanding = bal.fees
      .filter((f) => f.isCurrent)
      .reduce((sum, f) => sum + f.outstanding, 0)
    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      admissionNumber: s.admissionNumber,
      className: bal.className,
      outstanding: bal.total,
      // Everything owed that is not this term's fee: previous-terms arrears,
      // other terms and non-term fees.
      currentOutstanding,
      otherOutstanding: bal.total - currentOutstanding,
      scholarship: s.scholarship,
    }
  })

  const owingCount = rows.filter((r) => r.outstanding > 0).length
  const paidCount = rows.length - owingCount
  const totalOutstanding = rows.reduce((sum, r) => sum + r.outstanding, 0)
  const currentTermOutstanding = rows.reduce((sum, r) => sum + r.currentOutstanding, 0)
  const otherOutstanding = totalOutstanding - currentTermOutstanding

  const visibleRows = rows.filter((r) =>
    status === 'owing' ? r.outstanding > 0 : status === 'paid' ? r.outstanding === 0 : true
  )

  // Owing students first, largest debt at the top, so follow-ups are obvious.
  visibleRows.sort((a, b) => b.outstanding - a.outstanding || a.firstName.localeCompare(b.firstName))

  // Carried in links so "all classes" survives navigation instead of snapping back
  // to the teacher's own class.
  const classParam = sp.classId === 'all' ? 'all' : classId

  const buildHref = (params: Record<string, string | undefined>) => {
    const next = new URLSearchParams()
    const merged = { q, classId: classParam, status: status === 'all' ? undefined : status, studentId: sp.studentId, ...params }
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v)
    const qs = next.toString()
    return qs ? `/teacher/fees?${qs}` : '/teacher/fees'
  }

  const paymentHistoryQuery = (studentId: string) =>
    db.feePayment.findMany({
      where: { studentId },
      include: { feeStructure: { select: { name: true } } },
      orderBy: { paymentDate: 'desc' as const },
      take: 15,
    })

  const selectedStudentId = sp.studentId
  let selectedStudent: { firstName: string; lastName: string; admissionNumber: string; currentClass: { name: string } | null; id: string } | null = null
  let balance: Awaited<ReturnType<typeof getStudentBalance>> = null
  let recentPayments: Awaited<ReturnType<typeof paymentHistoryQuery>> = []

  if (selectedStudentId) {
    selectedStudent = await db.student.findFirst({
      where: { id: selectedStudentId, deletedAt: null },
      include: { currentClass: { select: { name: true } } },
    })

    if (selectedStudent) {
      ;[balance, recentPayments] = await Promise.all([
        getStudentBalance(selectedStudent.id),
        paymentHistoryQuery(selectedStudent.id),
      ])
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Fees &amp; Payments</h1>
        <p className="text-coffee-600 text-sm mt-0.5">
          See at a glance who has paid and who still owes, per class (read-only).
        </p>
      </div>

      {/* Search + class filter */}
      <form method="GET" className="bg-white border border-coffee-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
        <input
          name="q"
          defaultValue={q || ''}
          placeholder="Search name or admission no…"
          className="w-full sm:w-72 border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
        />
        <select
          name="classId"
          defaultValue={classParam || 'all'}
          className="w-full sm:w-56 border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.id === ownClassId ? ' (my class)' : ''}
            </option>
          ))}
          <option value="all">All classes</option>
        </select>
        {status !== 'all' && <input type="hidden" name="status" value={status} />}
        <button
          type="submit"
          className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-coffee-200 rounded-xl p-4">
          <p className="text-xs text-coffee-500">Students</p>
          <p className="text-xl font-bold text-coffee-900 mt-0.5">{rows.length}</p>
        </div>
        <div className="bg-white border border-coffee-200 rounded-xl p-4">
          <p className="text-xs text-coffee-500">Owing</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{owingCount}</p>
        </div>
        <div className="bg-white border border-coffee-200 rounded-xl p-4">
          <p className="text-xs text-coffee-500">Current term due</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{formatCurrency(currentTermOutstanding)}</p>
        </div>
        <div className="bg-white border border-coffee-200 rounded-xl p-4">
          <p className="text-xs text-coffee-500">Arrears / other</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{formatCurrency(otherOutstanding)}</p>
        </div>
        <div className="bg-white border border-coffee-200 rounded-xl p-4">
          <p className="text-xs text-coffee-500">Total outstanding</p>
          <p className="text-xl font-bold text-coffee-900 mt-0.5">{formatCurrency(totalOutstanding)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student list */}
        <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-coffee-800 mb-3">
            {classId ? classes.find((c) => c.id === classId)?.name : 'All classes'}
          </h2>

          {/* Status filter */}
          <div className="flex gap-1.5 mb-3">
            {([
              ['all', `All (${rows.length})`],
              ['owing', `Owing (${owingCount})`],
              ['paid', `Paid (${paidCount})`],
            ] as const).map(([value, label]) => (
              <Link
                key={value}
                href={buildHref({ status: value === 'all' ? undefined : value, studentId: undefined })}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  status === value ? 'bg-coffee-900 text-white' : 'bg-coffee-50 text-coffee-600 hover:bg-coffee-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {visibleRows.length === 0 ? (
            <p className="text-sm text-coffee-400 py-4 text-center">No students found.</p>
          ) : (
            <div className="space-y-1.5 max-h-[32rem] overflow-y-auto">
              {visibleRows.map((s) => {
                const isSelected = s.id === selectedStudentId
                return (
                  <Link
                    key={s.id}
                    href={buildHref({ studentId: s.id })}
                    className={`flex items-start justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isSelected ? 'bg-coffee-900 text-white' : 'bg-coffee-50 text-coffee-800 hover:bg-coffee-100'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="font-medium block truncate">{s.firstName} {s.lastName}</span>
                      <span className={`block text-xs mt-0.5 ${isSelected ? 'text-coffee-200' : 'text-coffee-400'}`}>
                        {s.admissionNumber} · {s.className}
                      </span>
                      {s.outstanding > 0 && s.otherOutstanding > 0 && (
                        <span className={`block text-xs mt-0.5 ${isSelected ? 'text-coffee-200' : 'text-coffee-500'}`}>
                          Term {formatCurrency(s.currentOutstanding)} · Arrears/other {formatCurrency(s.otherOutstanding)}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                        s.outstanding > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {s.outstanding > 0 ? formatCurrency(s.outstanding) : s.scholarship ? 'Scholarship' : 'Paid'}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected student detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedStudent ? (
            <div className="bg-white border border-coffee-200 rounded-xl p-8 text-center text-coffee-400 text-sm">
              Select a student to view their outstanding fees and payment history.
            </div>
          ) : (
            <>
              <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
                <h2 className="font-semibold text-coffee-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
                <p className="text-coffee-500 font-mono text-sm mt-0.5">{selectedStudent.admissionNumber}</p>
                <p className="text-coffee-500 text-sm mt-0.5">{selectedStudent.currentClass?.name ?? 'Unassigned'}</p>
              </div>

              {/* Outstanding fees, split into this term vs everything else owed */}
              <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-coffee-800">Outstanding Fees</h2>
                  {balance && balance.total > 0 && (
                    <span className="text-sm font-bold text-coffee-900">{formatCurrency(balance.total)}</span>
                  )}
                </div>
                {!balance || balance.total === 0 ? (
                  <p className="text-sm text-coffee-400 py-2">No outstanding fees — fully paid up.</p>
                ) : (
                  (() => {
                    // balance.fees also carries settled lines now (so the parent
                    // portal can show "paid in full"); this panel only cares about
                    // what is still owed.
                    const currentFees = balance.fees.filter((f) => f.isCurrent && f.outstanding > 0)
                    const otherFees = balance.fees.filter((f) => !f.isCurrent && f.outstanding > 0)
                    const currentTotal = currentFees.reduce((s, f) => s + f.outstanding, 0)
                    const otherTotal = otherFees.reduce((s, f) => s + f.outstanding, 0)

                    const feeRow = (f: (typeof balance.fees)[number]) => (
                      <div key={f.feeStructureId} className="flex items-center justify-between p-2.5 bg-coffee-50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium text-coffee-900">{f.name}</p>
                          <p className="text-xs text-coffee-500">
                            {formatCurrency(f.netAmount)} total · {formatCurrency(f.paid)} paid
                            {f.isUpcoming ? ' · upcoming term' : ''}
                          </p>
                        </div>
                        <span className="font-semibold text-red-600">{formatCurrency(f.outstanding)}</span>
                      </div>
                    )

                    return (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-coffee-700 uppercase tracking-wide">Current term</p>
                            <span className="text-sm font-bold text-red-600">{formatCurrency(currentTotal)}</span>
                          </div>
                          {currentFees.length === 0 ? (
                            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                              This term&apos;s fee is fully paid.
                            </p>
                          ) : (
                            <div className="space-y-2">{currentFees.map(feeRow)}</div>
                          )}
                        </div>

                        {otherFees.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-coffee-700 uppercase tracking-wide">
                                Arrears &amp; other terms
                              </p>
                              <span className="text-sm font-bold text-amber-600">{formatCurrency(otherTotal)}</span>
                            </div>
                            <div className="space-y-2">{otherFees.map(feeRow)}</div>
                          </div>
                        )}
                      </div>
                    )
                  })()
                )}
              </div>

              {/* Recent payment history */}
              <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5 overflow-x-auto">
                <h2 className="font-semibold text-coffee-800 mb-3">Recent Payment History</h2>
                {recentPayments.length === 0 ? (
                  <p className="text-sm text-coffee-400 py-2">No payments recorded yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-coffee-100">
                        <th className="text-left pb-2 text-coffee-500 font-medium">Fee</th>
                        <th className="text-left pb-2 text-coffee-500 font-medium">Date</th>
                        <th className="text-right pb-2 text-coffee-500 font-medium">Amount</th>
                        <th className="text-left pb-2 text-coffee-500 font-medium">Method</th>
                        <th className="text-left pb-2 text-coffee-500 font-medium">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coffee-50">
                      {recentPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2 text-coffee-900">{p.feeStructure.name}</td>
                          <td className="py-2 text-coffee-600 whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                          <td className="py-2 text-coffee-900 text-right font-medium whitespace-nowrap">
                            {formatCurrency(Number(p.amountPaid))}
                          </td>
                          <td className="py-2 text-coffee-500 capitalize">{p.paymentMethod.replace('_', ' ')}</td>
                          <td className="py-2 text-coffee-400 font-mono text-xs">{p.reference || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
