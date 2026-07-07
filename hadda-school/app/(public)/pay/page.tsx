'use client'

import { useState } from 'react'
import PublicNav from '@/components/layout/PublicNav'
import PublicFooter from '@/components/layout/PublicFooter'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import dynamic from 'next/dynamic'

const PaystackPayButton = dynamic(() => import('@/components/payments/PaystackPayButton'), { ssr: false })

interface FeeItem {
  feeStructureId: string
  name: string
  frequency: string
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
}

function StudentFees({ student, paystackKey, onPaymentSuccess, showPayButton = true }: { student: StudentResult, paystackKey?: string, onPaymentSuccess?: () => void, showPayButton?: boolean }) {
  return (
    <div className="mt-6 bg-white border border-coffee-200 rounded-2xl p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-coffee-900">{student.firstName} {student.lastName}</h2>
        <p className="text-coffee-500 text-xs sm:text-sm">{student.admissionNumber} · {student.className}</p>
      </div>

      {student.fees.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-bold text-coffee-900">All fees paid!</p>
          <p className="text-coffee-600 text-sm mt-1">No outstanding balance for this student.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 sm:space-y-3 mb-6">
            {student.fees.map((fee) => (
              <div key={fee.feeStructureId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-coffee-50 rounded-xl gap-2">
                <div>
                  <p className="font-medium text-coffee-900 text-sm sm:text-base">{fee.name}</p>
                  <p className="text-coffee-500 text-xs capitalize">{fee.frequency}</p>
                  {fee.discount > 0 && (
                    <p className="text-green-600 text-xs">Discount applied: {formatCurrency(fee.discount)}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-coffee-900 text-sm sm:text-base">{formatCurrency(fee.outstanding)}</p>
                  <p className="text-coffee-500 text-xs">outstanding</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-coffee-200 pt-4 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-6 gap-2">
            <span className="font-bold text-coffee-900">Total Outstanding</span>
            <span className="text-xl sm:text-2xl font-extrabold text-coffee-900">{formatCurrency(student.total)}</span>
          </div>

          {showPayButton && (
            <div className="flex flex-col items-center gap-3 mt-6">
              {paystackKey ? (
                <PaystackPayButton
                  amount={student.total}
                  studentIds={[student.id]}
                  paystackKey={paystackKey}
                  onSuccess={onPaymentSuccess}
                />
              ) : (
                <p className="text-coffee-500 text-xs sm:text-sm text-center px-2">
                  Online payment integration coming soon. Please pay at school and bring your receipt.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function PayPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [student, setStudent] = useState<StudentResult | null>(null)
  const [students, setStudents] = useState<StudentResult[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [paystackKey, setPaystackKey] = useState<string | undefined>()

  async function handleLookup(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setLoading(true)
    setError('')
    setStudent(null)
    setStudents(null)
    setSelectedIds(new Set())

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
      if (data.student) {
        setStudent(data.student)
      } else if (data.students) {
        setStudents(data.students)
        // Pre-select every child that still has an outstanding balance.
        setSelectedIds(new Set(data.students.filter((s: StudentResult) => s.total > 0).map((s: StudentResult) => s.id)))
      } else {
        setError('No student found.')
      }
    }

    setLoading(false)
  }

  const handlePaymentSuccess = () => {
    alert('Payment successful!')
    handleLookup() // Refresh balance
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const payableStudents = students?.filter((s) => s.total > 0) ?? []
  const selectedStudents = payableStudents.filter((s) => selectedIds.has(s.id))
  const combinedTotal = selectedStudents.reduce((sum, s) => sum + s.total, 0)

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
                {loading ? 'Searching…' : 'Find My Fees'}
              </Button>
            </form>
          </div>

          {/* Multiple students found — select one or more to pay together */}
          {students && (
            <div className="mt-6 bg-white border border-coffee-200 rounded-2xl p-6 sm:p-8">
              <h2 className="text-base font-bold text-coffee-900 mb-1">Multiple students found</h2>
              <p className="text-coffee-500 text-sm mb-4">Tick the children you want to pay for. You can select more than one and pay for all of them in a single transaction.</p>
              <div className="space-y-2">
                {students.map((s) => (
                  <label
                    key={s.id}
                    className={`w-full flex items-center justify-between p-4 border rounded-xl transition-colors text-left ${
                      s.total > 0 ? 'cursor-pointer hover:bg-coffee-50 hover:border-coffee-400' : 'opacity-60'
                    } ${selectedIds.has(s.id) ? 'border-coffee-500 bg-coffee-50' : 'border-coffee-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-coffee-300 text-coffee-900 focus:ring-coffee-500"
                        checked={selectedIds.has(s.id)}
                        disabled={s.total === 0}
                        onChange={() => toggleSelected(s.id)}
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

          {/* Combined breakdown + single checkout for every selected child */}
          {selectedStudents.map((s) => (
            <StudentFees key={s.id} student={s} showPayButton={false} />
          ))}

          {selectedStudents.length > 0 && (
            <div className="mt-6 bg-white border border-coffee-200 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-6 gap-2">
                <span className="font-bold text-coffee-900">
                  Total for {selectedStudents.length} {selectedStudents.length === 1 ? 'child' : 'children'}
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-coffee-900">{formatCurrency(combinedTotal)}</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                {paystackKey ? (
                  <PaystackPayButton
                    amount={combinedTotal}
                    studentIds={selectedStudents.map((s) => s.id)}
                    paystackKey={paystackKey}
                    onSuccess={handlePaymentSuccess}
                  />
                ) : (
                  <p className="text-coffee-500 text-xs sm:text-sm text-center px-2">
                    Online payment integration coming soon. Please pay at school and bring your receipt.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Single student result */}
          {student && <StudentFees student={student} paystackKey={paystackKey} onPaymentSuccess={handlePaymentSuccess} />}
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
