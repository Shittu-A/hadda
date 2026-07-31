import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { createTerm, setCurrentTerm, deleteTerm } from '@/lib/actions/terms'
import Badge from '@/components/ui/Badge'
import ActionForm from '@/components/ui/ActionForm'
import SubmitButton from '@/components/ui/SubmitButton'

async function handleCreate(formData: FormData) {
  'use server'
  return createTerm(formData)
}

async function handleSetCurrent(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  return setCurrentTerm(id)
}

async function handleDelete(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  return deleteTerm(id)
}

export default async function TermsPage() {
  const [academicYears, feeCounts, targetCounts] = await Promise.all([
    db.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      include: { terms: { orderBy: { order: 'asc' } } },
    }),
    db.feeStructure.groupBy({ by: ['termId'], _count: { id: true } }),
    db.memorizationTarget.groupBy({ by: ['termId'], _count: { id: true } }),
  ])

  const feesByTerm = Object.fromEntries(
    feeCounts.filter((r) => r.termId).map((r) => [r.termId as string, r._count.id])
  )
  const targetsByTerm = Object.fromEntries(
    targetCounts.map((r) => [r.termId, r._count.id])
  )

  const currentYear = academicYears.find((y) => y.isCurrent)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Terms</h1>
        <p className="text-coffee-600 text-sm mt-0.5">
          Manage the terms in each academic year and set the active term
        </p>
      </div>

      {/* Create Form */}
      <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
        <h2 className="text-base font-semibold text-coffee-800 mb-4">Add New Term</h2>
        <ActionForm action={handleCreate} successMessage="Term created." resetOnSuccess className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Academic Year</label>
            <select
              name="academicYearId"
              required
              defaultValue={currentYear?.id ?? ''}
              className="border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 w-full sm:w-44"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}{y.isCurrent ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Name</label>
            <input
              name="name"
              required
              placeholder="e.g. First Term"
              className="border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 w-full sm:w-40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Order</label>
            <input
              type="number"
              name="order"
              required
              min={1}
              defaultValue={1}
              className="border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 w-full sm:w-20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              required
              className="border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 w-full sm:w-auto"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              required
              className="border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 w-full sm:w-auto"
            />
          </div>
          <SubmitButton
            pendingText="Adding…"
            className="bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors w-full sm:w-auto"
          >
            Add Term
          </SubmitButton>
        </ActionForm>
      </div>

      {/* One table per academic year */}
      {academicYears.map((year) => (
        <div key={year.id} className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
          <div className="px-4 sm:px-5 py-3 bg-coffee-50 border-b border-coffee-200 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-coffee-800">{year.name}</h2>
            {year.isCurrent && <Badge variant="success">Current Year</Badge>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white border-b border-coffee-200">
                <tr>
                  <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold">Term</th>
                  <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Start Date</th>
                  <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold hidden sm:table-cell">End Date</th>
                  <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold hidden md:table-cell">Fees</th>
                  <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold hidden md:table-cell">Targets</th>
                  <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold">Status</th>
                  <th className="px-4 sm:px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {year.terms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-coffee-400">
                      No terms yet for this year.
                    </td>
                  </tr>
                ) : (
                  year.terms.map((term) => {
                    const fees = feesByTerm[term.id] ?? 0
                    const targets = targetsByTerm[term.id] ?? 0
                    const canDelete = fees === 0 && targets === 0 && !term.isCurrent
                    return (
                      <tr key={term.id} className="hover:bg-coffee-50 transition-colors">
                        <td className="px-4 sm:px-5 py-3 font-medium text-coffee-900">{term.name}</td>
                        <td className="px-4 sm:px-5 py-3 text-coffee-600 hidden sm:table-cell text-xs">{formatDate(term.startDate)}</td>
                        <td className="px-4 sm:px-5 py-3 text-coffee-600 hidden sm:table-cell text-xs">{formatDate(term.endDate)}</td>
                        <td className="px-4 sm:px-5 py-3 text-coffee-600 hidden md:table-cell">{fees}</td>
                        <td className="px-4 sm:px-5 py-3 text-coffee-600 hidden md:table-cell">{targets}</td>
                        <td className="px-4 sm:px-5 py-3">
                          <Badge variant={term.isCurrent ? 'success' : 'neutral'}>
                            {term.isCurrent ? 'Current' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 sm:px-5 py-3">
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 justify-end">
                            {!term.isCurrent && year.isCurrent && (
                              <ActionForm action={handleSetCurrent} successMessage="Term set as current.">
                                <input type="hidden" name="id" value={term.id} />
                                <SubmitButton
                                  pendingText="Setting…"
                                  className="text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors whitespace-nowrap"
                                >
                                  Set Current
                                </SubmitButton>
                              </ActionForm>
                            )}
                            {canDelete && (
                              <ActionForm action={handleDelete} successMessage="Term deleted.">
                                <input type="hidden" name="id" value={term.id} />
                                <SubmitButton
                                  pendingText="Deleting…"
                                  className="text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors whitespace-nowrap"
                                >
                                  Delete
                                </SubmitButton>
                              </ActionForm>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
