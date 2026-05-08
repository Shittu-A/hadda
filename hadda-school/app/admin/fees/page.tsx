import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { createFeeStructure, toggleFeeStructure, deleteFeeStructure } from '@/lib/actions/fees'

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  termly: 'Termly',
  yearly: 'Yearly',
  one_time: 'One-time',
}

async function handleToggle(formData: FormData): Promise<void> {
  'use server'
  await toggleFeeStructure(formData)
}

async function handleDelete(formData: FormData): Promise<void> {
  'use server'
  await deleteFeeStructure(formData)
}

async function handleCreate(formData: FormData): Promise<void> {
  'use server'
  await createFeeStructure(formData)
}

export default async function AdminFeesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [academicYears, currentYear] = await Promise.all([
    db.academicYear.findMany({ orderBy: { startDate: 'desc' } }),
    db.academicYear.findFirst({ where: { isCurrent: true } }),
  ])

  const feeStructures = await db.feeStructure.findMany({
    include: {
      academicYear: true,
      assignments: { include: { class: true, student: true } },
      _count: { select: { payments: true } },
    },
    orderBy: [{ academicYear: { startDate: 'desc' } }, { name: 'asc' }],
  })

  // Group by academic year
  const byYear = feeStructures.reduce<Record<string, typeof feeStructures>>((acc, f) => {
    const key = f.academicYearId
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})

  const sortedYearIds = Array.from(
    new Set(feeStructures.map((f) => f.academicYearId))
  )

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Fee Structures</h1>
          <p className="text-coffee-600 text-sm mt-0.5">Manage school fee types and amounts</p>
        </div>
        <Link
          href="/admin/fees/payments"
          className="border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
        >
          View Payments →
        </Link>
      </div>

      {/* Create form */}
      <div className="bg-white border border-coffee-200 rounded-xl p-5">
        <h2 className="font-semibold text-coffee-800 mb-4">Create Fee Structure</h2>
        <form action={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Name *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Tuition Fee"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Amount (₦) *</label>
              <input
                type="number"
                name="amount"
                required
                min={1}
                step={0.01}
                placeholder="e.g. 50000"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Frequency *</label>
              <select
                name="frequency"
                required
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="monthly">Monthly</option>
                <option value="termly">Termly</option>
                <option value="yearly">Yearly</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Academic Year *</label>
              <select
                name="academicYearId"
                required
                defaultValue={currentYear?.id ?? ''}
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Description</label>
              <input
                type="text"
                name="description"
                placeholder="Optional description"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="bg-coffee-900 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
              >
                Create Fee
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Fee structures by year */}
      {sortedYearIds.length === 0 ? (
        <p className="text-coffee-400 text-sm">No fee structures yet.</p>
      ) : (
        <div className="space-y-6">
          {sortedYearIds.map((yearId) => {
            const fees = byYear[yearId]
            const yearName = fees[0].academicYear.name
            const isCurrent = fees[0].academicYear.isCurrent
            return (
              <div key={yearId}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-semibold text-coffee-800">{yearName}</h2>
                  {isCurrent && <Badge variant="success">Current</Badge>}
                </div>
                <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-coffee-50 border-b border-coffee-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Name</th>
                        <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Amount</th>
                        <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Frequency</th>
                        <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Assigned To</th>
                        <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Payments</th>
                        <th className="text-left px-4 py-3 text-coffee-700 font-semibold">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coffee-100">
                      {fees.map((fee) => {
                        const classAssignments = fee.assignments.filter((a) => a.classId && !a.studentId)
                        const studentAssignments = fee.assignments.filter((a) => a.studentId)
                        return (
                          <tr key={fee.id} className="hover:bg-coffee-50 transition-colors">
                            <td className="px-4 py-3">
                              <Link
                                href={`/admin/fees/${fee.id}`}
                                className="font-medium text-coffee-900 hover:text-coffee-600 transition-colors"
                              >
                                {fee.name}
                              </Link>
                              {fee.description && (
                                <p className="text-xs text-coffee-400 mt-0.5">{fee.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-coffee-900">
                              {formatCurrency(Number(fee.amount))}
                            </td>
                            <td className="px-4 py-3 text-coffee-600">
                              {FREQ_LABEL[fee.frequency] || fee.frequency}
                            </td>
                            <td className="px-4 py-3 text-coffee-600 text-xs">
                              {classAssignments.length > 0 && (
                                <span>{classAssignments.map((a) => a.class?.name).join(', ')}</span>
                              )}
                              {studentAssignments.length > 0 && (
                                <span className="ml-1 text-coffee-400">+{studentAssignments.length} students</span>
                              )}
                              {fee.assignments.length === 0 && <span className="text-coffee-300">Unassigned</span>}
                            </td>
                            <td className="px-4 py-3 text-coffee-600">{fee._count.payments}</td>
                            <td className="px-4 py-3">
                              <Badge variant={fee.isActive ? 'success' : 'neutral'}>
                                {fee.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3 justify-end">
                                <Link
                                  href={`/admin/fees/${fee.id}`}
                                  className="text-xs text-coffee-500 hover:text-coffee-800 transition-colors"
                                >
                                  Manage
                                </Link>
                                <form action={handleToggle}>
                                  <input type="hidden" name="id" value={fee.id} />
                                  <button
                                    type="submit"
                                    className="text-xs text-coffee-500 hover:text-coffee-800 transition-colors"
                                  >
                                    {fee.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                </form>
                                {fee._count.payments === 0 && (
                                  <form action={handleDelete}>
                                    <input type="hidden" name="id" value={fee.id} />
                                    <button
                                      type="submit"
                                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </form>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
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
