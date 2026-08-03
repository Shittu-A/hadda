'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { lookupStudentById, recordFeePayment } from '@/lib/actions/fees'
import { useToast } from '@/components/ui/ToastProvider'
import { formatCurrency } from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'

type FeeStructureLite = {
  id: string
  name: string
  amount: number
  term: { name: string; isCurrent: boolean } | null
}

type ResolvedStudent = {
  id: string
  firstName: string
  lastName: string
  admissionNumber: string
  status: string
  deletedAt: string | Date | null
}

export default function StudentIdPaymentForm({ feeStructures }: { feeStructures: FeeStructureLite[] }) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [student, setStudent] = useState<ResolvedStudent | null>(null)
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const today = new Date().toISOString().split('T')[0]

  // Any edit to the id invalidates a previous confirmation — a stale lookup
  // must never carry over to a different id the admin typed afterwards.
  function handleIdChange(value: string) {
    setStudentId(value)
    setStudent(null)
    setLookupError(null)
  }

  async function handleLookup() {
    setLookingUp(true)
    setLookupError(null)
    try {
      const result = await lookupStudentById(studentId)
      if (result.success) {
        setStudent(result.student as ResolvedStudent)
      } else {
        setStudent(null)
        setLookupError(result.error ?? 'Lookup failed')
      }
    } catch (err) {
      console.error('Student ID lookup failed:', err)
      setLookupError('Something went wrong. Please try again.')
    } finally {
      setLookingUp(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!student) return

    const formData = new FormData(e.currentTarget)
    formData.set('studentId', student.id)

    setSaving(true)
    try {
      const result = await recordFeePayment(formData)
      if (result.success) {
        toast.success('Payment recorded.')
        formRef.current?.reset()
        setStudentId('')
        setStudent(null)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to record payment.')
      }
    } catch (err) {
      console.error('Record payment by student ID failed:', err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left hover:bg-coffee-50 transition-colors"
      >
        <div>
          <p className="font-semibold text-coffee-900">Record payment by student ID</p>
          <p className="text-coffee-500 text-xs mt-0.5">
            Super-admin only — for reconciling a payment against a raw student ID (e.g. from a
            payment provider's reference), including students not shown in the name list above
          </p>
        </div>
        <span className="text-coffee-400 text-sm">{open ? 'Hide' : 'Open'}</span>
      </button>

      {open && (
        <div className="border-t border-coffee-100 p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Student ID</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={studentId}
                onChange={(e) => handleIdChange(e.target.value)}
                placeholder="e.g. cabf2fae6d81a42808491bc61"
                className="flex-1 border border-coffee-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={!studentId.trim() || lookingUp}
                className="inline-flex items-center justify-center gap-2 border border-coffee-300 text-coffee-800 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors disabled:opacity-60"
              >
                {lookingUp && <Spinner />}
                {lookingUp ? 'Looking up…' : 'Look up'}
              </button>
            </div>
            {lookupError && <p className="text-xs text-red-600 mt-1.5">{lookupError}</p>}
            {student && (
              <div className="text-xs bg-coffee-50 border border-coffee-200 rounded-lg px-3 py-2 mt-1.5">
                <p className="text-coffee-900 font-medium">
                  {student.firstName} {student.lastName}{' '}
                  <span className="text-coffee-400 font-normal">· {student.admissionNumber}</span>
                </p>
                {(student.deletedAt || student.status !== 'active') && (
                  <p className="text-amber-700 mt-0.5">
                    {student.deletedAt
                      ? 'This student has been deleted.'
                      : `This student's status is "${student.status}", not active.`}{' '}
                    Double-check this is the right person before recording a payment.
                  </p>
                )}
              </div>
            )}
          </div>

          {student && (
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 border-t border-coffee-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 mb-1">Fee *</label>
                  <select
                    name="feeStructureId"
                    required
                    defaultValue=""
                    className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                  >
                    <option value="">Select fee</option>
                    {feeStructures.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                        {f.term ? ` — ${f.term.name}${f.term.isCurrent ? ' (current)' : ''}` : ''} —{' '}
                        {formatCurrency(Number(f.amount))}
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
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-coffee-900 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors disabled:opacity-60"
              >
                {saving && <Spinner />}
                {saving ? 'Saving…' : `Save Payment for ${student.firstName} ${student.lastName}`}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
