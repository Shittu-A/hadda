'use client'

import { useState } from 'react'
import { usePaystackPayment } from 'react-paystack'
import Button from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'

// Which fee lines the parent ticked, per child. Only ids travel to the server —
// the amounts are recomputed there from the student's real balance, so nothing
// the browser sends can change what a line costs.
export type PaymentSelection = {
  studentId: string
  feeStructureIds: string[]
}

interface PaystackPayButtonProps {
  amount: number
  email?: string
  selections: PaymentSelection[]
  paystackKey: string
  onSuccess?: () => void
}

export default function PaystackPayButton({ amount, email, selections, paystackKey, onSuccess }: PaystackPayButtonProps) {
  const [isVerifying, setIsVerifying] = useState(false)

  const studentIds = selections.map((s) => s.studentId)

  const config = {
    reference: (new Date()).getTime().toString(),
    email: email || 'payments@hadda.school', // Fallback email
    amount: Math.round(amount * 100), // Paystack amount is in kobo
    publicKey: paystackKey,
    metadata: {
      custom_fields: [
        {
          display_name: 'Student IDs',
          variable_name: 'student_ids',
          value: studentIds.join(','),
        },
      ],
    },
  }

  const initializePayment = usePaystackPayment(config)

  const handlePaystackSuccessAction = async (reference: any) => {
    setIsVerifying(true)
    try {
      const res = await fetch('/api/pay/verify-paystack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: reference.reference,
          selections,
        }),
      })
      if (res.ok) {
        if (onSuccess) onSuccess()
      } else {
        alert('Payment verification failed. Please contact the school.')
      }
    } catch (err) {
      console.error('Error verifying payment:', err)
      alert('Network error while verifying payment.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handlePaystackCloseAction = () => {
    // Optional: add tracking or logging here
  }

  return (
    <Button 
      onClick={() => {
        initializePayment({
          onSuccess: handlePaystackSuccessAction,
          onClose: handlePaystackCloseAction,
        })
      }} 
      disabled={isVerifying}
      className="w-full sm:w-auto"
    >
      {isVerifying ? 'Verifying...' : `Pay ${formatCurrency(amount)} with Paystack`}
    </Button>
  )
}
