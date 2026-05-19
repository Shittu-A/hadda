import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { assignFeeToClass, removeFeeAssignment } from '@/lib/actions/fees'

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  termly: 'Termly',
  yearly: 'Yearly',
  one_time: 'One-time',
}

async function handleAssign(formData: FormData): Promise<void> {
  'use server'
  await assignFeeToClass(formData)
}

async function handleRemove(formData: FormData): Promise<void> {
  'use server'
  await removeFeeAssignment(formData)
}

export default async function FeeStructureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [fee, classes] = await Promise.all([
    db.feeStructure.findUnique({
      where: { id },
      include: {
        academicYear: true,
        assignments: {
          include: {
            class: true,
            student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          },
        },
        payments: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
            recordedBy: { select: { name: true } },
          },
          orderBy: { paymentDate: 'desc' },
          take: 50,
        },
        discounts: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    }),
    db.classRoom.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } }),
  ])

  if (!fee) notFound()

  const classAssignments = fee.assignments.filter((a) => a.classId && !a.studentId)
  const assignedClassIds = new Set(classAssignments.map((a) => a.classId!))
  const unassignedClasses = classes.filter((c) => !assignedClassIds.has(c.id))

  const totalCollected = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <Link href="/admin/fees" className="text-coffee-500 text-sm hover:text-coffee-700">
          ← Back to Fee Structures
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-coffee-900">{fee.name}</h1>
          <Badge variant={fee.isActive ? 'success' : 'neutral'}>
            {fee.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <p className="text-coffee-500 text-sm mt-0.5">
          {formatCurrency(Number(fee.amount))} · {FREQ_LABEL[fee.frequency]} · {fee.academicYear.name}
        </p>
        {fee.description && <p className="text-coffee-400 text-sm mt-1">{fee.description}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-coffee-200 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-coffee-900">{fee.payments.length}</p>
          <p className="text-xs text-coffee-500 mt-0.5">Total Payments</p>
        </div>
        <div className="bg-white border border-coffee-200 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-coffee-900">{formatCurrency(totalCollected)}</p>
          <p className="text-xs text-coffee-500 mt-0.5">Total Collected</p>
        </div>
        <div className="bg-white border border-coffee-200 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-coffee-900">{classAssignments.length}</p>
          <p className="text-xs text-coffee-500 mt-0.5">Classes Assigned</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Assignments + Discounts */}
        <div className="space-y-6">
          {/* Class Assignments */}
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
            <h2 className="font-semibold text-coffee-800 mb-4">Class Assignments</h2>
            {classAssignments.length === 0 ? (
              <p className="text-coffee-400 text-sm mb-4">No classes assigned.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {classAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <span className="text-sm text-coffee-900">{a.class?.name}</span>
                    <form action={handleRemove}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="feeStructureId" value={fee.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}

            {unassignedClasses.length > 0 && (
              <form action={handleAssign} className="flex flex-col sm:flex-row gap-2">
                <input type="hidden" name="feeStructureId" value={fee.id} />
                <select
                  name="classId"
                  required
                  className="flex-1 border border-coffee-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
                >
                  <option value="">Assign class…</option>
                  {unassignedClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="sm:w-auto bg-coffee-900 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-coffee-800 transition-colors"
                >
                  Add
                </button>
              </form>
            )}
          </div>

          {/* Discounts */}
          {fee.discounts.length > 0 && (
            <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
              <h2 className="font-semibold text-coffee-800 mb-3">Student Discounts</h2>
              <div className="space-y-2">
                {fee.discounts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <Link
                      href={`/admin/students/${d.student.id}`}
                      className="text-coffee-900 hover:text-coffee-600"
                    >
                      {d.student.firstName} {d.student.lastName}
                    </Link>
                    <span className="text-coffee-600">
                      {d.discountType === 'percent'
                        ? `${Number(d.value)}%`
                        : formatCurrency(Number(d.value))}
                      {' off'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Link
              href={`/admin/fees/payments?feeId=${fee.id}`}
              className="text-sm text-coffee-600 hover:text-coffee-900 underline underline-offset-2"
            >
              Record a payment for this fee →
            </Link>
          </div>
        </div>

        {/* Right: Payment history */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold text-coffee-800 mb-3">Payment History</h2>
          {fee.payments.length === 0 ? (
            <div className="bg-white border border-coffee-200 rounded-xl p-8 text-center text-coffee-400 text-sm">
              No payments recorded for this fee yet.
            </div>
          ) : (
            <div className="bg-white border border-coffee-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-coffee-50 border-b border-coffee-200">
                  <tr>
                    <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Student</th>
                    <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Date</th>
                    <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Amount</th>
                    <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden lg:table-cell">Method</th>
                    <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden lg:table-cell">Period</th>
                    <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden sm:table-cell">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-100">
                  {fee.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-coffee-50 transition-colors">
                      <td className="px-3 sm:px-4 py-2.5">
                        <Link
                          href={`/admin/students/${p.student.id}`}
                          className="font-medium text-coffee-900 hover:text-coffee-600 text-xs sm:text-sm"
                        >
                          {p.student.firstName} {p.student.lastName}
                        </Link>
                        <p className="text-xs text-coffee-400 font-mono">{p.student.admissionNumber}</p>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-coffee-500 text-xs whitespace-nowrap hidden sm:table-cell">
                        {formatDate(p.paymentDate)}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 font-medium text-coffee-900 text-xs sm:text-sm">
                        {formatCurrency(Number(p.amountPaid))}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-coffee-600 capitalize text-xs hidden lg:table-cell">
                        {p.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-coffee-500 text-xs hidden lg:table-cell">{p.period || '—'}</td>
                      <td className="px-3 sm:px-4 py-2.5 text-coffee-400 text-xs hidden sm:table-cell">{p.recordedBy.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
