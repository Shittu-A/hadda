'use client'

import { useState } from 'react'
import PublicNav from '@/components/layout/PublicNav'
import PublicFooter from '@/components/layout/PublicFooter'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'

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

export default function PayPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [student, setStudent] = useState<StudentResult | null>(null)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setStudent(null)

    const res = await fetch('/api/pay/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    const data = await res.json()

    if (!res.ok || !data.student) {
      setError(data.error ?? 'No student found with that admission number or phone number.')
    } else {
      setStudent(data.student)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-coffee-50">
      <PublicNav />

      <section className="pt-32 pb-12 bg-coffee-100">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">Parent Portal</p>
          <h1 className="text-4xl font-extrabold text-coffee-900 mt-2">Pay School Fees</h1>
          <p className="text-coffee-600 mt-3">Enter your child&apos;s admission number or your phone number to view outstanding fees.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-2xl mx-auto px-6">
          <div className="bg-white border border-coffee-200 rounded-2xl p-8">
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

          {student && (
            <div className="mt-6 bg-white border border-coffee-200 rounded-2xl p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-coffee-900">{student.firstName} {student.lastName}</h2>
                <p className="text-coffee-500 text-sm">{student.admissionNumber} · {student.className}</p>
              </div>

              {student.fees.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="font-bold text-coffee-900">All fees paid!</p>
                  <p className="text-coffee-600 text-sm mt-1">No outstanding balance for this student.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {student.fees.map((fee) => (
                      <div key={fee.feeStructureId} className="flex items-center justify-between p-4 bg-coffee-50 rounded-xl">
                        <div>
                          <p className="font-medium text-coffee-900">{fee.name}</p>
                          <p className="text-coffee-500 text-xs capitalize">{fee.frequency}</p>
                          {fee.discount > 0 && (
                            <p className="text-green-600 text-xs">Discount applied: {formatCurrency(fee.discount)}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-coffee-900">{formatCurrency(fee.outstanding)}</p>
                          <p className="text-coffee-500 text-xs">outstanding</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-coffee-200 pt-4 flex items-center justify-between mb-6">
                    <span className="font-bold text-coffee-900">Total Outstanding</span>
                    <span className="text-2xl font-extrabold text-coffee-900">{formatCurrency(student.total)}</span>
                  </div>

                  <p className="text-coffee-500 text-sm text-center mb-4">
                    Online payment integration coming soon. Please pay at school and bring your receipt.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
