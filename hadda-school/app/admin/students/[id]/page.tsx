import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Badge from '@/components/ui/Badge'
import PrintedToggle from '@/components/ui/PrintedToggle'
import { formatDate, formatCurrency } from '@/lib/utils'
import { deleteStudent, toggleAdmissionLetterPrinted } from '@/lib/actions/students'
import { setStudentArrears, toggleStudentScholarship } from '@/lib/actions/fees'
import { sendBalanceReminder } from '@/lib/actions/sms'
import { computeTermlyValue } from '@/lib/fees/balance'
import { redirect } from 'next/navigation'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  promoted: 'info',
  graduated: 'info',
  withdrawn: 'danger',
  transferred: 'neutral',
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ smsResult?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const student = await db.student.findFirst({
    where: { id, deletedAt: null },
    include: {
      // feeStructure.term is needed so the arrears valuation can tell terms apart.
      currentClass: {
        include: { feeAssignments: { include: { feeStructure: { include: { term: true } } } } },
      },
      academicYear: true,
      guardians: true,
      feeAssignments: { include: { feeStructure: { include: { term: true } } } },
      feeDiscounts: true,
      feePayments: {
        include: { feeStructure: { include: { term: true } } },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      },
      // One target per term, newest term first.
      memTargets: {
        include: { surahFrom: true, surahTo: true, term: true },
        orderBy: [{ term: { academicYear: { startDate: 'desc' } } }, { term: { order: 'desc' } }],
        take: 6,
      },
    },
  })

  if (!student) notFound()

  // Previous-terms arrears: terms owing × one term's fee, less any arrears
  // payments made. The per-term valuation is shared with the balance module so
  // this page and the parent's bill can never disagree.
  const termlyValue = computeTermlyValue(student)

  const arrearsPaidAgg = await db.feePayment.aggregate({
    where: { studentId: id, feeStructure: { isArrears: true } },
    _sum: { amountPaid: true },
  })
  const arrearsGross = student.arrearsTerms * termlyValue
  const arrearsPaid = Number(arrearsPaidAgg._sum.amountPaid ?? 0)
  const arrearsOutstanding = Math.max(0, arrearsGross - arrearsPaid)

  async function handleDelete() {
    'use server'
    await deleteStudent(id)
    redirect('/admin/students')
  }

  async function handleSetArrears(formData: FormData) {
    'use server'
    await setStudentArrears(formData)
  }

  async function handleToggleScholarship(formData: FormData) {
    'use server'
    await toggleStudentScholarship(formData)
  }

  async function handleSendBalanceSms() {
    'use server'
    const result = await sendBalanceReminder(id)
    const status = result.success ? 'sent' : result.skipped ? 'skipped' : 'failed'
    redirect(`/admin/students/${id}?smsResult=${status}${result.error ? `:${encodeURIComponent(result.error)}` : ''}`)
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          {student.photoUrl ? (
            <Image
              src={student.photoUrl}
              alt={`${student.firstName} ${student.lastName}`}
              width={72}
              height={88}
              className="rounded-lg object-cover shrink-0 border border-coffee-200"
              unoptimized
            />
          ) : (
            <div className="w-16 h-20 rounded-lg bg-coffee-100 border border-coffee-200 flex items-center justify-center shrink-0">
              <span className="text-coffee-400 text-2xl font-bold">{student.firstName[0]}</span>
            </div>
          )}
          <div>
            <Link href="/admin/students" className="text-coffee-500 text-sm hover:text-coffee-700">
              ← Back to Students
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-coffee-900 mt-2">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-coffee-500 font-mono text-sm mt-0.5">{student.admissionNumber}</p>
            {student.gender && (
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-coffee-100 text-coffee-700">
                {student.gender === 'M' ? 'Male' : 'Female'}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={STATUS_VARIANT[student.status] ?? 'neutral'}>{student.status}</Badge>
          <Link
            href={`/admin/students/${student.id}/edit`}
            className="w-full sm:w-auto text-center border border-coffee-200 text-coffee-700 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-coffee-50"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Info */}
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
            <h2 className="font-semibold text-coffee-800 mb-4">Student Information</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-coffee-500">Gender</dt>
                <dd className="text-coffee-900 font-medium">
                  {student.gender === 'M' ? 'Male' : student.gender === 'F' ? 'Female' : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-coffee-500">Date of Birth</dt>
                <dd className="text-coffee-900 font-medium">
                  {student.dateOfBirth ? formatDate(student.dateOfBirth) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-coffee-500">Enrollment Date</dt>
                <dd className="text-coffee-900 font-medium">{formatDate(student.enrollmentDate)}</dd>
              </div>
              <div>
                <dt className="text-coffee-500">Academic Year</dt>
                <dd className="text-coffee-900 font-medium">{student.academicYear.name}</dd>
              </div>
              <div>
                <dt className="text-coffee-500">Class</dt>
                <dd className="text-coffee-900 font-medium">{student.currentClass?.name ?? 'Unassigned'}</dd>
              </div>
              {student.address && (
                <div className="col-span-2">
                  <dt className="text-coffee-500">Address</dt>
                  <dd className="text-coffee-900 font-medium">{student.address}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Guardians */}
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
            <h2 className="font-semibold text-coffee-800 mb-4">Guardians</h2>
            <div className="space-y-3">
              {student.guardians.map((g) => (
                <div key={g.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3 bg-coffee-50 rounded-lg">
                  <div>
                    <p className="font-medium text-coffee-900 text-sm">{g.name}</p>
                    <p className="text-coffee-500 text-xs">{g.relationship}{g.isPrimary ? ' · Primary' : ''}</p>
                  </div>
                  <div className="text-left sm:text-right text-xs text-coffee-600">
                    {g.phone && <p>{g.phone}</p>}
                    {g.email && <p>{g.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Previous-terms arrears */}
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-coffee-800">Outstanding from Previous Terms</h2>
              {arrearsOutstanding > 0 && (
                <span className="text-sm font-bold text-red-600">{formatCurrency(arrearsOutstanding)}</span>
              )}
            </div>
            <p className="text-xs text-coffee-500 mb-4">
              Fees owed from before this system. Owed amount = terms owing × the student&apos;s termly fee
              {termlyValue > 0 ? ` (${formatCurrency(termlyValue)}/term)` : ''}. Record payments via the Record Payment button using the &ldquo;Previous Terms (Arrears)&rdquo; fee.
            </p>

            {student.arrearsTerms > 0 && (
              <dl className="grid grid-cols-3 gap-3 text-sm mb-4">
                <div>
                  <dt className="text-coffee-500 text-xs">Terms owing</dt>
                  <dd className="text-coffee-900 font-semibold">{student.arrearsTerms}</dd>
                </div>
                <div>
                  <dt className="text-coffee-500 text-xs">Total owed</dt>
                  <dd className="text-coffee-900 font-semibold">{formatCurrency(arrearsGross)}</dd>
                </div>
                <div>
                  <dt className="text-coffee-500 text-xs">Paid so far</dt>
                  <dd className="text-coffee-900 font-semibold">{formatCurrency(arrearsPaid)}</dd>
                </div>
              </dl>
            )}
            {student.arrearsTerms > 0 && termlyValue === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                No termly fee is assigned to this student yet, so the owed amount shows as ₦0. Assign a termly fee to value the arrears.
              </p>
            )}

            <form action={handleSetArrears} className="flex flex-col sm:flex-row sm:items-end gap-3">
              <input type="hidden" name="studentId" value={student.id} />
              <div className="w-full sm:w-32">
                <label className="block text-xs font-medium text-coffee-600 mb-1">Terms owing</label>
                <input
                  type="number"
                  name="arrearsTerms"
                  min={0}
                  defaultValue={student.arrearsTerms}
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-coffee-600 mb-1">Note (optional)</label>
                <input
                  type="text"
                  name="arrearsNote"
                  defaultValue={student.arrearsNote ?? ''}
                  placeholder="e.g. 2024/25 Term 2 & 3"
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
              >
                Save
              </button>
            </form>
          </div>

          {/* Recent Payments */}
          {student.feePayments.length > 0 && (
            <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5 overflow-x-auto">
              <h2 className="font-semibold text-coffee-800 mb-4">Recent Payments</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-coffee-100">
                    <th className="text-left pb-2 text-coffee-500 font-medium">Fee</th>
                    <th className="text-left pb-2 text-coffee-500 font-medium">Date</th>
                    <th className="text-right pb-2 text-coffee-500 font-medium">Amount</th>
                    <th className="text-left pb-2 text-coffee-500 font-medium">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-50">
                  {student.feePayments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 text-coffee-900">{p.feeStructure.name}</td>
                      <td className="py-2 text-coffee-600">{formatDate(p.paymentDate)}</td>
                      <td className="py-2 text-coffee-900 text-right font-medium">
                        {formatCurrency(Number(p.amountPaid))}
                      </td>
                      <td className="py-2 text-coffee-500 capitalize">{p.paymentMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Memorization by term */}
          {student.memTargets.length > 0 && (
            <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
              <h2 className="font-semibold text-coffee-800 mb-4">Memorization by Term</h2>
              <div className="space-y-2">
                {student.memTargets.map((target) => {
                  const percent = target.achievedPercent != null ? Number(target.achievedPercent) : null
                  return (
                    <div key={target.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-coffee-50 rounded-lg text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-coffee-900">{target.term.name}</span>
                        <span className="text-coffee-600 ml-2 break-words">
                          {target.surahFrom.nameEnglish} {target.ayahFrom} → {target.surahTo.nameEnglish} {target.ayahTo}
                        </span>
                        <p className="text-coffee-400 text-xs mt-0.5">
                          Target {Number(target.targetPages)} pages
                          {target.remark ? ` · ${target.remark}` : ''}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        {percent != null ? (
                          <>
                            <Badge
                              variant={
                                percent >= 80 ? 'success'
                                : percent >= 70 ? 'info'
                                : percent >= 50 ? 'warning'
                                : 'danger'
                              }
                            >
                              {percent}% · {target.grade}
                            </Badge>
                            {target.gradedAt && (
                              <p className="text-coffee-400 text-xs mt-1">{formatDate(target.gradedAt)}</p>
                            )}
                          </>
                        ) : (
                          <Badge variant="neutral">Awaiting grade</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
            <h2 className="font-semibold text-coffee-800 mb-3">Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/admin/students/${student.id}/edit`}
                className="block w-full text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
              >
                Edit Student
              </Link>
              <Link
                href={`/admin/fees/payments?studentId=${student.id}`}
                className="block w-full text-center bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
              >
                Record Payment
              </Link>
              <a
                href={`/api/students/${student.id}/admission-letter`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-amber-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-800 transition-colors"
              >
                Print Admission Letter
              </a>
              {/* Printed record — ticked by hand once the paper copy exists. */}
              <div className="flex justify-center">
                <PrintedToggle
                  action={toggleAdmissionLetterPrinted}
                  id={student.id}
                  printedAt={student.admissionLetterPrintedAt}
                  label="Letter not printed"
                />
              </div>
              <form action={handleSendBalanceSms}>
                <button
                  type="submit"
                  className="block w-full text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
                >
                  Send Balance SMS
                </button>
              </form>
              {sp.smsResult && (() => {
                const [status, errorRaw] = sp.smsResult.split(':')
                const error = errorRaw ? decodeURIComponent(errorRaw) : null
                if (status === 'sent') {
                  return <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Balance reminder SMS sent.</p>
                }
                if (status === 'skipped') {
                  return <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">SMS not sent — SMS provider not configured yet.</p>
                }
                return <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">Could not send SMS{error ? `: ${error}` : ''}.</p>
              })()}
            </div>
          </div>

          {/* Scholarship */}
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-coffee-800">Scholarship</h2>
              {student.scholarship && <Badge variant="info">On scholarship</Badge>}
            </div>
            <p className="text-xs text-coffee-500 mb-3">
              {student.scholarship
                ? 'This student owes no fees and is skipped when applying fees to all paying students.'
                : 'Place this student on scholarship to exempt them from fees.'}
            </p>
            {student.scholarship && student.scholarshipNote && (
              <p className="text-xs text-coffee-600 bg-coffee-50 border border-coffee-100 rounded-lg px-3 py-2 mb-3">
                {student.scholarshipNote}
              </p>
            )}
            {student.scholarship ? (
              <form action={handleToggleScholarship}>
                <input type="hidden" name="studentId" value={student.id} />
                <input type="hidden" name="scholarship" value="false" />
                <button
                  type="submit"
                  className="w-full border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
                >
                  Remove from scholarship
                </button>
              </form>
            ) : (
              <form action={handleToggleScholarship} className="space-y-2">
                <input type="hidden" name="studentId" value={student.id} />
                <input type="hidden" name="scholarship" value="true" />
                <input
                  type="text"
                  name="scholarshipNote"
                  placeholder="Note (e.g. sponsor name)"
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
                <button
                  type="submit"
                  className="w-full bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
                >
                  Place on scholarship
                </button>
              </form>
            )}
          </div>

          {student.status === 'active' && (
            <div className="bg-white border border-red-100 rounded-xl p-4 sm:p-5">
              <h2 className="font-semibold text-red-700 mb-3">Danger Zone</h2>
              <p className="text-xs text-coffee-500 mb-3">
                Withdrawing a student will mark them as withdrawn and remove them from class rosters.
              </p>
              <form action={handleDelete}>
                <button
                  type="submit"
                  className="w-full bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Withdraw Student
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
