'use client'

import { useMemo, useState } from 'react'
import PublicNav from '@/components/layout/PublicNav'
import PublicFooter from '@/components/layout/PublicFooter'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/ToastProvider'
import { formatCurrency } from '@/lib/utils'
import dynamic from 'next/dynamic'

const PaystackPayButton = dynamic(() => import('@/components/payments/PaystackPayButton'), { ssr: false })

interface FeeItem {
  feeStructureId: string
  name: string
  frequency: string
  termId: string | null
  termName: string | null
  termOrder: number | null
  isUpcoming: boolean
  grossAmount: number
  discount: number
  netAmount: number
  paid: number
  outstanding: number
}

interface StudentResult {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  className: string
  fees: FeeItem[]
  total: number
  dueNow: number
}

// A fee line is identified by student + fee so two children can each have their
// own "Tuition — First Term" without the tick boxes interfering.
const lineKey = (studentId: string, feeStructureId: string) => `${studentId}:${feeStructureId}`

// Terms already under way are ticked by default — that is what a parent has
// actually been billed for. Terms that have not started are still listed so
// paying ahead is possible, but they start unticked.
function defaultSelection(students: StudentResult[]): Set<string> {
  const next = new Set<string>()
  for (const s of students) {
    for (const f of s.fees) {
      if (!f.isUpcoming && f.outstanding > 0) next.add(lineKey(s.id, f.feeStructureId))
    }
  }
  return next
}

function FeeRow({
  fee,
  checked,
  onToggle,
}: {
  fee: FeeItem
  checked: boolean
  onToggle: () => void
}) {
  // Nothing left to pay on this line — show it as settled instead of a
  // tickable checkbox so a fully-paid term stays visible without inviting
  // the parent to "pay" ₦0.
  if (fee.outstanding === 0) {
    return (
      <div className="flex items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl gap-3 border border-green-200 bg-green-50">
        <div className="min-w-0">
          <p className="font-medium text-coffee-900 text-sm sm:text-base">
            {fee.name}
            {fee.termName && <span className="text-coffee-500"> — {fee.termName}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
            <span className="text-coffee-500 text-xs capitalize">{fee.frequency}</span>
            <span className="text-xs text-green-700">{formatCurrency(fee.paid)} paid</span>
          </div>
        </div>
        <span className="text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2.5 py-1 shrink-0">
          Paid ✓
        </span>
      </div>
    )
  }

  return (
    <label
      className={`flex items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl gap-3 cursor-pointer border transition-colors ${
        checked ? 'border-coffee-500 bg-coffee-50' : 'border-coffee-200 bg-white hover:bg-coffee-50'
      }`}
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 sm:mt-0 h-5 w-5 shrink-0 rounded border-coffee-300 text-coffee-900 focus:ring-coffee-500"
        />
        <div className="min-w-0">
          <p className="font-medium text-coffee-900 text-sm sm:text-base">
            {fee.name}
            {fee.termName && <span className="text-coffee-500"> — {fee.termName}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
            <span className="text-coffee-500 text-xs capitalize">{fee.frequency}</span>
            {fee.isUpcoming && (
              <span className="text-xs bg-coffee-100 text-coffee-600 rounded-full px-2 py-0.5">
                Upcoming
              </span>
            )}
            {fee.paid > 0 && (
              <span className="text-xs text-coffee-500">{formatCurrency(fee.paid)} already paid</span>
            )}
          </div>
          {fee.discount > 0 && (
            <p className="text-green-600 text-xs mt-0.5">Discount applied: {formatCurrency(fee.discount)}</p>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-coffee-900 text-sm sm:text-base">{formatCurrency(fee.outstanding)}</p>
        <p className="text-coffee-500 text-xs">outstanding</p>
      </div>
    </label>
  )
}

function StudentFees({
  student,
  selected,
  onToggle,
}: {
  student: StudentResult
  selected: Set<string>
  onToggle: (key: string) => void
}) {
  const selectedTotal = student.fees
    .filter((f) => selected.has(lineKey(student.id, f.feeStructureId)))
    .reduce((sum, f) => sum + f.outstanding, 0)

  return (
    <div className="mt-6 bg-white border border-coffee-200 rounded-2xl p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-coffee-900">{student.firstName} {student.lastName}</h2>
        <p className="text-coffee-500 text-xs sm:text-sm">{student.admissionNumber} · {student.className}</p>
      </div>

      {student.total === 0 && (
        <div className="text-center py-6">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-bold text-coffee-900">All fees paid!</p>
          <p className="text-coffee-600 text-sm mt-1">No outstanding balance for this student.</p>
        </div>
      )}

      {student.fees.length > 0 && (
        <>
          {student.total > 0 && (
            <p className="text-coffee-600 text-sm mb-4">
              Tick the items you want to pay for now. You do not have to pay everything at once.
            </p>
          )}

          <div className="space-y-2 sm:space-y-3 mb-6">
            {student.fees.map((fee) => {
              const key = lineKey(student.id, fee.feeStructureId)
              return (
                <FeeRow
                  key={key}
                  fee={fee}
                  checked={selected.has(key)}
                  onToggle={() => onToggle(key)}
                />
              )
            })}
          </div>

          {student.total > 0 && (
            <div className="border-t border-coffee-200 pt-4 space-y-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-1">
                <span className="text-coffee-500 text-sm">Total outstanding</span>
                <span className="text-coffee-600 text-sm">{formatCurrency(student.total)}</span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                <span className="font-bold text-coffee-900">Selected to pay</span>
                <span className="text-xl sm:text-2xl font-extrabold text-coffee-900">
                  {formatCurrency(selectedTotal)}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function PayPage() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [students, setStudents] = useState<StudentResult[] | null>(null)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set())
  const [paystackKey, setPaystackKey] = useState<string | undefined>()

  // One student and many students are the same case with a different heading —
  // keeping a single list avoids maintaining two selection code paths.
  const isMultiple = (students?.length ?? 0) > 1

  async function handleLookup(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setLoading(true)
    setError('')
    setStudents(null)
    setSelectedStudentIds(new Set())
    setSelectedLines(new Set())

    // A network hiccup here used to leave the button stuck on "Searching…"
    // forever, since nothing after the failed fetch ever ran — the try/finally
    // guarantees loading always clears, even when the request itself fails.
    try {
      const res = await fetch('/api/pay/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'No student found with that admission number or phone number.')
      } else {
        if (data.paystackKey) {
          setPaystackKey(data.paystackKey)
        }

        const found: StudentResult[] = (data.students ?? (data.student ? [data.student] : [])).filter(Boolean)

        if (found.length === 0) {
          setError('No student found.')
        } else {
          setStudents(found)
          // Every child is shown by default, whether or not they still owe
          // anything — a fully paid child should still be visible, just without
          // anything ticked to pay.
          setSelectedStudentIds(new Set(found.map((s) => s.id)))
          setSelectedLines(defaultSelection(found))
        }
      }
    } catch (err) {
      console.error('Fee lookup failed:', err)
      setError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    toast.success('Payment successful!')
    handleLookup() // Refresh balance
  }

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleLine(key: string) {
    setSelectedLines((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Every ticked child is shown in full, including one who now owes nothing —
  // seeing the details (and that the balance is ₦0) is the point after a
  // payment. Only students who still owe something count toward checkout.
  const visibleStudents = isMultiple
    ? (students ?? []).filter((s) => selectedStudentIds.has(s.id))
    : (students ?? [])
  const activeStudents = visibleStudents.filter((s) => s.total > 0)

  // Only ids go to the server; it reprices every line from the real balance.
  const selections = useMemo(
    () =>
      activeStudents
        .map((s) => ({
          studentId: s.id,
          feeStructureIds: s.fees
            .filter((f) => selectedLines.has(lineKey(s.id, f.feeStructureId)))
            .map((f) => f.feeStructureId),
        }))
        .filter((s) => s.feeStructureIds.length > 0),
    [activeStudents, selectedLines]
  )

  const combinedTotal = activeStudents.reduce(
    (sum, s) =>
      sum +
      s.fees
        .filter((f) => selectedLines.has(lineKey(s.id, f.feeStructureId)))
        .reduce((t, f) => t + f.outstanding, 0),
    0
  )

  const selectedLineCount = selections.reduce((n, s) => n + s.feeStructureIds.length, 0)

  return (
    <div className="min-h-screen bg-coffee-50">
      <PublicNav />

      <section className="pt-24 sm:pt-32 pb-8 sm:pb-12 bg-coffee-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">Parent Portal</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-coffee-900 mt-2">Pay School Fees</h1>
          <p className="text-coffee-600 mt-3 text-sm sm:text-base px-2">Enter your child&apos;s admission number or your phone number to view outstanding fees.</p>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="bg-white border border-coffee-200 rounded-2xl p-6 sm:p-8">
            <form onSubmit={handleLookup} className="space-y-4">
              <Input
                label="Admission Number or Guardian Phone"
                placeholder="HMS-2024-0001 or 08012345678"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Spinner />}
                {loading ? 'Searching…' : 'Find My Fees'}
              </Button>
            </form>
          </div>

          {/* Multiple students found — choose which children to pay for */}
          {isMultiple && students && (
            <div className="mt-6 bg-white border border-coffee-200 rounded-2xl p-6 sm:p-8">
              <h2 className="text-base font-bold text-coffee-900 mb-1">Multiple students found</h2>
              <p className="text-coffee-500 text-sm mb-4">Tick the children you want to pay for. You can select more than one and pay for all of them in a single transaction.</p>
              <div className="space-y-2">
                {students.map((s) => (
                  <label
                    key={s.id}
                    className={`w-full flex items-center justify-between p-4 border rounded-xl transition-colors text-left ${
                      s.total > 0 ? 'cursor-pointer hover:bg-coffee-50 hover:border-coffee-400' : 'opacity-60'
                    } ${selectedStudentIds.has(s.id) ? 'border-coffee-500 bg-coffee-50' : 'border-coffee-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-coffee-300 text-coffee-900 focus:ring-coffee-500"
                        checked={selectedStudentIds.has(s.id)}
                        disabled={s.total === 0}
                        onChange={() => toggleStudent(s.id)}
                      />
                      <div>
                        <p className="font-semibold text-coffee-900">{s.firstName} {s.lastName}</p>
                        <p className="text-coffee-500 text-xs">{s.admissionNumber} · {s.className}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${s.total > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {s.total > 0 ? formatCurrency(s.total) : 'Paid ✓'}
                      </p>
                      {s.total > 0 && <p className="text-coffee-400 text-xs">outstanding</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Per-term breakdown for each selected child, paid or not */}
          {visibleStudents.map((s) => (
            <StudentFees key={s.id} student={s} selected={selectedLines} onToggle={toggleLine} />
          ))}

          {/* Single checkout for everything ticked above */}
          {activeStudents.length > 0 && (
            <div className="mt-6 bg-white border border-coffee-200 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-6 gap-2">
                <div>
                  <span className="font-bold text-coffee-900">
                    Paying for {activeStudents.length === 1 ? '1 child' : `${activeStudents.length} children`}
                  </span>
                  <p className="text-coffee-500 text-xs mt-0.5">
                    {selectedLineCount} item{selectedLineCount !== 1 ? 's' : ''} selected
                  </p>
                </div>
                <span className="text-xl sm:text-2xl font-extrabold text-coffee-900">{formatCurrency(combinedTotal)}</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                {!paystackKey ? (
                  <p className="text-coffee-500 text-xs sm:text-sm text-center px-2">
                    Online payment integration coming soon. Please pay at school and bring your receipt.
                  </p>
                ) : selectedLineCount === 0 ? (
                  <p className="text-coffee-500 text-xs sm:text-sm text-center px-2">
                    Tick at least one item above to continue.
                  </p>
                ) : (
                  <PaystackPayButton
                    amount={combinedTotal}
                    selections={selections}
                    paystackKey={paystackKey}
                    onSuccess={handlePaymentSuccess}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
