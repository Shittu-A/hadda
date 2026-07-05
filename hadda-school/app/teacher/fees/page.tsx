import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getStudentBalance } from '@/lib/fees/balance'

export default async function TeacherFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; studentId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'teacher' && session.user.role !== 'admin' && session.user.role !== 'super_admin') redirect('/')

  const sp = await searchParams
  const q = sp.q?.trim()

  // Teachers only see students in classes they're linked to (via ClassTeacher).
  // Admins/super_admins can see every active student.
  const isTeacher = session.user.role === 'teacher'
  let classIds: string[] | null = null
  if (isTeacher) {
    const links = await db.classTeacher.findMany({ where: { userId: session.user.id }, select: { classId: true } })
    classIds = links.map((l) => l.classId)
  }

  const where: any = { deletedAt: null, status: 'active' }
  if (classIds) where.currentClassId = { in: classIds }
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { admissionNumber: { contains: q, mode: 'insensitive' } },
    ]
  }

  const students = await db.student.findMany({
    where,
    include: { currentClass: { select: { name: true } } },
    orderBy: [{ firstName: 'asc' }],
    take: 50,
  })

  const paymentHistoryQuery = (studentId: string) =>
    db.feePayment.findMany({
      where: { studentId },
      include: { feeStructure: { select: { name: true } } },
      orderBy: { paymentDate: 'desc' as const },
      take: 15,
    })

  const selectedStudentId = sp.studentId
  let selectedStudent: (typeof students)[number] | null = null
  let balance: Awaited<ReturnType<typeof getStudentBalance>> = null
  let recentPayments: Awaited<ReturnType<typeof paymentHistoryQuery>> = []

  if (selectedStudentId) {
    // Make sure a selected student is one the teacher is actually allowed to view.
    selectedStudent = await db.student.findFirst({
      where: { id: selectedStudentId, deletedAt: null, ...(classIds ? { currentClassId: { in: classIds } } : {}) },
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
          Look up a student&apos;s outstanding fees and payment history (read-only).
        </p>
      </div>

      {/* Search */}
      <form method="GET" className="bg-white border border-coffee-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
        <input
          name="q"
          defaultValue={sp.q || ''}
          placeholder="Search name or admission no…"
          className="w-full sm:w-72 border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
        />
        <button
          type="submit"
          className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
        >
          Search
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student list */}
        <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-coffee-800 mb-3">
            {isTeacher ? 'Students in your classes' : 'Students'}
          </h2>
          {students.length === 0 ? (
            <p className="text-sm text-coffee-400 py-4 text-center">No students found.</p>
          ) : (
            <div className="space-y-1.5 max-h-[32rem] overflow-y-auto">
              {students.map((s) => (
                <Link
                  key={s.id}
                  href={`/teacher/fees?${new URLSearchParams({ ...(q ? { q } : {}), studentId: s.id }).toString()}`}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    s.id === selectedStudentId ? 'bg-coffee-900 text-white' : 'bg-coffee-50 text-coffee-800 hover:bg-coffee-100'
                  }`}
                >
                  <span className="font-medium">{s.firstName} {s.lastName}</span>
                  <span className={`block text-xs mt-0.5 ${s.id === selectedStudentId ? 'text-coffee-200' : 'text-coffee-400'}`}>
                    {s.admissionNumber} · {s.currentClass?.name ?? 'Unassigned'}
                  </span>
                </Link>
              ))}
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

              {/* Outstanding fees */}
              <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-coffee-800">Outstanding Fees</h2>
                  {balance && balance.total > 0 && (
                    <span className="text-sm font-bold text-red-600">{formatCurrency(balance.total)}</span>
                  )}
                </div>
                {!balance || balance.fees.length === 0 ? (
                  <p className="text-sm text-coffee-400 py-2">No outstanding fees — fully paid up.</p>
                ) : (
                  <div className="space-y-2">
                    {balance.fees.map((f) => (
                      <div key={f.feeStructureId} className="flex items-center justify-between p-2.5 bg-coffee-50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium text-coffee-900">{f.name}</p>
                          <p className="text-xs text-coffee-500">
                            {formatCurrency(f.netAmount)} total · {formatCurrency(f.paid)} paid
                          </p>
                        </div>
                        <span className="font-semibold text-red-600">{formatCurrency(f.outstanding)}</span>
                      </div>
                    ))}
                  </div>
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
