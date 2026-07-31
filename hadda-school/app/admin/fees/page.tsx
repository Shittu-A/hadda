import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import ActionForm from '@/components/ui/ActionForm'
import SubmitButton from '@/components/ui/SubmitButton'
import { formatCurrency } from '@/lib/utils'
import { createFeeStructure, toggleFeeStructure, deleteFeeStructure } from '@/lib/actions/fees'

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  termly: 'Termly',
  yearly: 'Yearly',
  one_time: 'One-time',
}

async function handleToggle(formData: FormData) {
  'use server'
  await toggleFeeStructure(formData)
  return { success: true }
}

async function handleDelete(formData: FormData) {
  'use server'
  await deleteFeeStructure(formData)
  return { success: true }
}

async function handleCreate(formData: FormData) {
  'use server'
  const result = await createFeeStructure(formData)
  if (!result.success) return result
  return {
    success: true,
    message: result.applied
      ? `Fee created and applied to ${result.applied} student(s).`
      : 'Fee created.',
  }
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
      term: true,
      assignments: { include: { class: true, student: true } },
      _count: { select: { payments: true } },
    },
    orderBy: [{ academicYear: { startDate: 'desc' } }, { name: 'asc' }, { term: { order: 'asc' } }],
  })

  type Fee = (typeof feeStructures)[number]

  // A termly fee is stored as one row per term. Collapse those siblings back
  // into a single line so the admin sees "Tuition" once rather than three times,
  // with the individual terms listed underneath.
  const groups = new Map<string, { rows: Fee[]; head: Fee }>()
  for (const f of feeStructures) {
    const key = f.termGroupId ?? f.id
    const existing = groups.get(key)
    if (existing) existing.rows.push(f)
    else groups.set(key, { rows: [f], head: f })
  }

  // Group by academic year
  const byYear = new Map<string, { rows: Fee[]; head: Fee }[]>()
  for (const group of groups.values()) {
    const key = group.head.academicYearId
    const list = byYear.get(key)
    if (list) list.push(group)
    else byYear.set(key, [group])
  }

  const sortedYearIds = Array.from(byYear.keys())

  return (
    <div className="p-4 sm:p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Fee Structures</h1>
          <p className="text-coffee-600 text-sm mt-0.5">Manage school fee types and amounts</p>
        </div>
        <Link
          href="/admin/fees/payments"
          className="w-full sm:w-auto text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
        >
          View Payments →
        </Link>
      </div>

      {/* Create form */}
      <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
        <h2 className="font-semibold text-coffee-800 mb-4">Create Fee Structure</h2>
        <ActionForm action={handleCreate} resetOnSuccess className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
              <p className="text-xs text-coffee-400 mt-1">For a termly fee, this is the amount per term.</p>
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
              <p className="text-xs text-coffee-400 mt-1">
                Termly creates one charge per term, so parents can pay a term at a time.
              </p>
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
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <label className="flex items-center gap-2 text-sm text-coffee-700">
              <input
                type="checkbox"
                name="applyToAll"
                className="rounded border-coffee-300 text-coffee-900 focus:ring-coffee-400"
              />
              Apply to all paying students in the selected year
              <span className="text-coffee-400">(skips students on scholarship)</span>
            </label>
            <SubmitButton
              pendingText="Creating…"
              className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
            >
              Create Fee
            </SubmitButton>
          </div>
        </ActionForm>
      </div>

      {/* Fee structures by year */}
      {sortedYearIds.length === 0 ? (
        <p className="text-coffee-400 text-sm">No fee structures yet.</p>
      ) : (
        <div className="space-y-6">
          {sortedYearIds.map((yearId) => {
            const feeGroups = byYear.get(yearId)!
            const yearName = feeGroups[0].head.academicYear.name
            const isCurrent = feeGroups[0].head.academicYear.isCurrent
            return (
              <div key={yearId}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-semibold text-coffee-800">{yearName}</h2>
                  {isCurrent && <Badge variant="success">Current</Badge>}
                </div>
                <div className="bg-white border border-coffee-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-coffee-50 border-b border-coffee-200">
                      <tr>
                        <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Name</th>
                        <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Amount</th>
                        <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Frequency</th>
                        <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden lg:table-cell">Assigned To</th>
                        <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Payments</th>
                        <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Status</th>
                        <th className="px-3 sm:px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coffee-100">
                      {feeGroups.map(({ rows, head }) => {
                        const isTermly = rows.length > 1 || head.termId !== null
                        const classAssignments = head.assignments.filter((a) => a.classId && !a.studentId)
                        const studentAssignments = head.assignments.filter((a) => a.studentId)
                        const totalPayments = rows.reduce((s, r) => s + r._count.payments, 0)
                        const yearTotal = rows.reduce((s, r) => s + Number(r.amount), 0)
                        return (
                          <tr key={head.termGroupId ?? head.id} className="hover:bg-coffee-50 transition-colors">
                            <td className="px-3 sm:px-4 py-3">
                              <Link
                                href={`/admin/fees/${head.id}`}
                                className="font-medium text-coffee-900 hover:text-coffee-600 transition-colors"
                              >
                                {head.name}
                              </Link>
                              {head.description && (
                                <p className="text-xs text-coffee-400 mt-0.5 hidden sm:block">{head.description}</p>
                              )}
                              {isTermly && (
                                <p className="text-xs text-coffee-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                                  {rows.map((r) => (
                                    <Link
                                      key={r.id}
                                      href={`/admin/fees/${r.id}`}
                                      className="hover:text-coffee-700 transition-colors"
                                    >
                                      {r.term?.name ?? 'No term'}
                                      {r.term?.isCurrent ? ' •' : ''}
                                    </Link>
                                  ))}
                                </p>
                              )}
                            </td>
                            <td className="px-3 sm:px-4 py-3 font-medium text-coffee-900 text-xs sm:text-sm">
                              {formatCurrency(Number(head.amount))}
                              {isTermly && (
                                <span className="block text-xs font-normal text-coffee-400">
                                  per term · {formatCurrency(yearTotal)} total
                                </span>
                              )}
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-coffee-600 text-xs hidden sm:table-cell">
                              {FREQ_LABEL[head.frequency] || head.frequency}
                              {isTermly && (
                                <span className="block text-coffee-400">{rows.length} term{rows.length !== 1 ? 's' : ''}</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-coffee-600 text-xs hidden lg:table-cell">
                              {classAssignments.length > 0 && (
                                <span>{classAssignments.map((a) => a.class?.name).join(', ')}</span>
                              )}
                              {studentAssignments.length > 0 && (
                                <span className="ml-1 text-coffee-400">+{studentAssignments.length} students</span>
                              )}
                              {head.assignments.length === 0 && <span className="text-coffee-300">Unassigned</span>}
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-coffee-600 text-xs hidden sm:table-cell">{totalPayments}</td>
                            <td className="px-3 sm:px-4 py-3">
                              <Badge variant={head.isActive ? 'success' : 'neutral'}>
                                {head.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 justify-end">
                                <Link
                                  href={`/admin/fees/${head.id}`}
                                  className="text-xs text-coffee-500 hover:text-coffee-800 transition-colors whitespace-nowrap"
                                >
                                  Manage
                                </Link>
                                <ActionForm
                                  action={handleToggle}
                                  successMessage={head.isActive ? 'Fee deactivated.' : 'Fee activated.'}
                                >
                                  <input type="hidden" name="id" value={head.id} />
                                  <SubmitButton
                                    pendingText="Saving…"
                                    className="text-xs text-coffee-500 hover:text-coffee-800 transition-colors whitespace-nowrap"
                                  >
                                    {head.isActive ? 'Deactivate' : 'Activate'}
                                  </SubmitButton>
                                </ActionForm>
                                {totalPayments === 0 && (
                                  <ActionForm action={handleDelete} successMessage="Fee deleted.">
                                    <input type="hidden" name="id" value={head.id} />
                                    <SubmitButton
                                      pendingText="Deleting…"
                                      className="text-xs text-red-400 hover:text-red-600 transition-colors whitespace-nowrap"
                                    >
                                      Delete
                                    </SubmitButton>
                                  </ActionForm>
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
