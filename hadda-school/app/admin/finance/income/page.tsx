import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createIncome, deleteIncome } from '@/lib/actions/finance'

const CATEGORIES = ['donation', 'grant', 'fundraising', 'rental', 'other'] as const

async function handleCreate(formData: FormData): Promise<void> {
  'use server'
  await createIncome(formData)
}

async function handleDelete(formData: FormData): Promise<void> {
  'use server'
  await deleteIncome(formData)
}

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; from?: string; to?: string; page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const sp = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const pageNum = Math.max(1, parseInt(sp.page || '1'))
  const pageSize = 50

  const fromDate = sp.from ? new Date(sp.from) : undefined
  const toDate = sp.to ? new Date(sp.to + 'T23:59:59') : undefined

  const where: any = {}
  if (sp.category) where.category = sp.category
  if (fromDate || toDate) {
    where.incomeDate = {}
    if (fromDate) where.incomeDate.gte = fromDate
    if (toDate) where.incomeDate.lte = toDate
  }

  const [entries, total, totalAmount] = await Promise.all([
    db.incomeEntry.findMany({
      where,
      include: { recordedBy: { select: { name: true } } },
      orderBy: { incomeDate: 'desc' },
      take: pageSize,
      skip: (pageNum - 1) * pageSize,
    }),
    db.incomeEntry.count({ where }),
    db.incomeEntry.aggregate({ where, _sum: { amount: true } }),
  ])

  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = {
      category: sp.category,
      from: sp.from,
      to: sp.to,
      page: String(pageNum),
      ...overrides,
    }
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    return '?' + params.toString()
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Other Income</h1>
          <p className="text-coffee-600 text-sm mt-0.5">Record income outside of student fees (donations, grants, etc.)</p>
        </div>
        <Link
          href="/admin/finance"
          className="w-full sm:w-auto text-center text-sm text-coffee-500 hover:text-coffee-800 transition-colors"
        >
          ← Finance Overview
        </Link>
      </div>

      {/* Record income form */}
      <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
        <h2 className="font-semibold text-coffee-800 mb-4">Record Income</h2>
        <form action={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Source *</label>
              <input
                type="text"
                name="source"
                required
                placeholder="e.g. Eid Donation"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Category *</label>
              <select
                name="category"
                required
                defaultValue="donation"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Amount (₦) *</label>
              <input
                type="number"
                name="amount"
                required
                min={1}
                step={0.01}
                placeholder="e.g. 20000"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Date *</label>
              <input
                type="date"
                name="incomeDate"
                required
                defaultValue={today}
                max={today}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-coffee-700 mb-1">Note</label>
              <input
                type="text"
                name="note"
                placeholder="Optional note"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-coffee-900 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
              >
                Save Income
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white border border-coffee-200 rounded-xl p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">Category</label>
            <select
              name="category"
              defaultValue={sp.category || ''}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400 capitalize"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">From</label>
            <input
              type="date"
              name="from"
              defaultValue={sp.from || ''}
              max={today}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">To</label>
            <input
              type="date"
              name="to"
              defaultValue={sp.to || ''}
              max={today}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-coffee-900 text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-coffee-800 transition-colors"
            >
              Filter
            </button>
            <a
              href="/admin/finance/income"
              className="flex-1 text-center border border-coffee-200 text-coffee-600 rounded-lg px-3 py-2 text-xs font-medium hover:bg-coffee-50 transition-colors"
            >
              Clear
            </a>
          </div>
        </div>
      </form>

      {/* Summary */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs sm:text-sm">
          <span className="text-coffee-600">
            <span className="font-semibold text-coffee-900">{total}</span> entr{total !== 1 ? 'ies' : 'y'}
          </span>
          <span className="text-coffee-600">
            Total:{' '}
            <span className="font-semibold text-green-700">
              {formatCurrency(Number(totalAmount._sum.amount ?? 0))}
            </span>
          </span>
        </div>
      )}

      {/* Income table */}
      {entries.length === 0 ? (
        <div className="text-center py-16 text-coffee-400">No income entries found.</div>
      ) : (
        <>
          <div className="bg-white border border-coffee-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-coffee-50 border-b border-coffee-200">
                <tr>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Source</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Category</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden md:table-cell">Date</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Amount</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden lg:table-cell">Note</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden sm:table-cell">By</th>
                  <th className="px-3 sm:px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {entries.map((i) => (
                  <tr key={i.id} className="hover:bg-coffee-50 transition-colors">
                    <td className="px-3 sm:px-4 py-2.5 font-medium text-coffee-900 text-xs sm:text-sm">{i.source}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-coffee-600 text-xs capitalize">{i.category}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-coffee-500 text-xs whitespace-nowrap hidden md:table-cell">
                      {formatDate(i.incomeDate)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 font-medium text-green-700 text-xs sm:text-sm">
                      {formatCurrency(Number(i.amount))}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-coffee-500 text-xs hidden lg:table-cell">{i.note || '—'}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-coffee-400 text-xs hidden sm:table-cell">{i.recordedBy.name}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-right">
                      <form action={handleDelete}>
                        <input type="hidden" name="id" value={i.id} />
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

          {/* Pagination */}
          {Math.ceil(total / pageSize) > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2">
              {pageNum > 1 && (
                <a
                  href={buildQuery({ page: String(pageNum - 1) })}
                  className="w-full sm:w-auto text-center px-4 py-2 text-xs sm:text-sm border border-coffee-200 rounded-lg text-coffee-600 hover:bg-coffee-50 transition-colors"
                >
                  Previous
                </a>
              )}
              <span className="text-xs sm:text-sm text-coffee-500 text-center">
                Page {pageNum} of {Math.ceil(total / pageSize)}
              </span>
              {pageNum < Math.ceil(total / pageSize) && (
                <a
                  href={buildQuery({ page: String(pageNum + 1) })}
                  className="w-full sm:w-auto text-center px-4 py-2 text-xs sm:text-sm border border-coffee-200 rounded-lg text-coffee-600 hover:bg-coffee-50 transition-colors"
                >
                  Next
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
