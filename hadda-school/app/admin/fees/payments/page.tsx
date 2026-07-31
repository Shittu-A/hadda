import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import ActionForm from '@/components/ui/ActionForm'
import SubmitButton from '@/components/ui/SubmitButton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { recordFeePayment, deleteFeePayment, ensureArrearsFeeStructure } from '@/lib/actions/fees'
import { sendBulkBalanceReminders } from '@/lib/actions/sms'

async function handleRecord(formData: FormData) {
  'use server'
  return recordFeePayment(formData)
}

async function handleDelete(formData: FormData) {
  'use server'
  await deleteFeePayment(formData)
  return { success: true }
}

async function handleSmsAll(): Promise<void> {
  'use server'
  const result = await sendBulkBalanceReminders()
  redirect(`/admin/fees/payments?smsResult=${result.sent}:${result.skipped}:${result.failed}`)
}

export default async function FeePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; feeId?: string; from?: string; to?: string; page?: string; smsResult?: string }>
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
  if (sp.studentId) where.studentId = sp.studentId
  if (sp.feeId) where.feeStructureId = sp.feeId
  if (fromDate || toDate) {
    where.paymentDate = {}
    if (fromDate) where.paymentDate.gte = fromDate
    if (toDate) where.paymentDate.lte = toDate
  }

  // Make sure the reserved "Previous Terms (Arrears)" fee exists so it can be selected here.
  await ensureArrearsFeeStructure()

  const [students, feeStructures, currentYear] = await Promise.all([
    db.student.findMany({
      where: { deletedAt: null },
      orderBy: [{ firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
    }),
    db.feeStructure.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { term: { order: 'asc' } }],
      select: {
        id: true,
        name: true,
        amount: true,
        frequency: true,
        term: { select: { name: true, isCurrent: true } },
      },
    }),
    db.academicYear.findFirst({ where: { isCurrent: true } }),
  ])

  const [payments, total] = await Promise.all([
    db.feePayment.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        feeStructure: { select: { id: true, name: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { paymentDate: 'desc' },
      take: pageSize,
      skip: (pageNum - 1) * pageSize,
    }),
    db.feePayment.count({ where }),
  ])

  const totalAmount = await db.feePayment.aggregate({
    where,
    _sum: { amountPaid: true },
  })

  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = {
      studentId: sp.studentId,
      feeId: sp.feeId,
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
          <h1 className="text-2xl font-bold text-coffee-900">Fee Payments</h1>
          <p className="text-coffee-600 text-sm mt-0.5">Record and view all fee payments</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <form action={handleSmsAll}>
            <SubmitButton
              pendingText="Sending…"
              className="w-full sm:w-auto text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
            >
              SMS all debtors
            </SubmitButton>
          </form>
          <Link
            href="/admin/fees"
            className="w-full sm:w-auto text-center text-sm text-coffee-500 hover:text-coffee-800 transition-colors"
          >
            ← Fee Structures
          </Link>
        </div>
      </div>

      {sp.smsResult && (() => {
        const [sent, skipped, failed] = sp.smsResult.split(':').map((n) => parseInt(n) || 0)
        return (
          <div className="bg-coffee-50 border border-coffee-200 rounded-xl px-4 py-3 text-sm text-coffee-700">
            Balance reminder SMS: <span className="font-semibold">{sent}</span> sent,{' '}
            <span className="font-semibold">{skipped}</span> skipped (SMS not configured),{' '}
            <span className="font-semibold">{failed}</span> failed.
          </div>
        )
      })()}

      {/* Record payment form */}
      <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
        <h2 className="font-semibold text-coffee-800 mb-4">Record Payment</h2>
        <ActionForm action={handleRecord} successMessage="Payment recorded." resetOnSuccess className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Student *</label>
              <select
                name="studentId"
                required
                defaultValue={sp.studentId || ''}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.admissionNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Fee *</label>
              <select
                name="feeStructureId"
                required
                defaultValue={sp.feeId || ''}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="">Select fee</option>
                {feeStructures.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}{f.term ? ` — ${f.term.name}${f.term.isCurrent ? ' (current)' : ''}` : ''} — {formatCurrency(Number(f.amount))}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Amount Paid (₦) *</label>
              <input
                type="number"
                name="amountPaid"
                required
                min={1}
                step={0.01}
                placeholder="e.g. 50000"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Payment Date *</label>
              <input
                type="date"
                name="paymentDate"
                required
                defaultValue={today}
                max={today}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Payment Method *</label>
              <select
                name="paymentMethod"
                required
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="online">Online</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Period</label>
              <input
                type="text"
                name="period"
                placeholder="e.g. Jan 2025"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
              <p className="text-xs text-coffee-400 mt-1">
                Leave blank for a termly fee — the term is recorded automatically.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Reference</label>
              <input
                type="text"
                name="reference"
                placeholder="Receipt / transfer ref"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Note</label>
              <input
                type="text"
                name="note"
                placeholder="Optional note"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>

            <div className="flex items-end">
              <SubmitButton
                pendingText="Saving…"
                className="w-full bg-coffee-900 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
              >
                Save Payment
              </SubmitButton>
            </div>
          </div>
        </ActionForm>
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white border border-coffee-200 rounded-xl p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">Student</label>
            <select
              name="studentId"
              defaultValue={sp.studentId || ''}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">All students</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-coffee-600 mb-1">Fee</label>
            <select
              name="feeId"
              defaultValue={sp.feeId || ''}
              className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">All fees</option>
              {feeStructures.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
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

          <div className="flex flex-col sm:flex-row items-end gap-2 sm:col-span-1 lg:col-span-2">
            <button
              type="submit"
              className="w-full sm:flex-1 bg-coffee-900 text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-coffee-800 transition-colors"
            >
              Filter
            </button>
            <a
              href="/admin/fees/payments"
              className="w-full sm:flex-1 text-center border border-coffee-200 text-coffee-600 rounded-lg px-3 py-2 text-xs font-medium hover:bg-coffee-50 transition-colors"
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
            <span className="font-semibold text-coffee-900">{total}</span> payment{total !== 1 ? 's' : ''}
          </span>
          <span className="text-coffee-600">
            Total collected:{' '}
            <span className="font-semibold text-coffee-900">
              {formatCurrency(Number(totalAmount._sum.amountPaid ?? 0))}
            </span>
          </span>
        </div>
      )}

      {/* Payments table */}
      {payments.length === 0 ? (
        <div className="text-center py-16 text-coffee-400">No payments found.</div>
      ) : (
        <>
          <div className="bg-white border border-coffee-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-coffee-50 border-b border-coffee-200">
                <tr>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Student</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Fee</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden md:table-cell">Date</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Amount</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden lg:table-cell">Method</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden lg:table-cell">Period</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden lg:table-cell">Reference</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden sm:table-cell">By</th>
                  <th className="px-3 sm:px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {payments.map((p) => (
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
                    <td className="px-3 sm:px-4 py-2.5 text-coffee-600 text-xs hidden sm:table-cell">{p.feeStructure.name}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-coffee-500 text-xs whitespace-nowrap hidden md:table-cell">
                      {formatDate(p.paymentDate)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 font-medium text-coffee-900 text-xs sm:text-sm">
                      {formatCurrency(Number(p.amountPaid))}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-coffee-600 capitalize text-xs hidden lg:table-cell">
                      {p.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-coffee-500 text-xs hidden lg:table-cell">{p.period || '—'}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-coffee-400 text-xs font-mono hidden lg:table-cell">{p.reference || '—'}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-coffee-400 text-xs hidden sm:table-cell">{p.recordedBy.name}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-right whitespace-nowrap">
                      <a
                        href={`/api/payments/${p.id}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-coffee-600 hover:text-coffee-900 transition-colors mr-3"
                      >
                        Receipt
                      </a>
                      <ActionForm action={handleDelete} successMessage="Payment deleted." className="inline">
                        <input type="hidden" name="id" value={p.id} />
                        <SubmitButton
                          pendingText="Deleting…"
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </SubmitButton>
                      </ActionForm>
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
