'use client'

import { useState } from 'react'
import { usePaystackPayment } from 'react-paystack'
import Button from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'

interface PaystackPayButtonProps {
  amount: number
  email?: string
  studentId: string
  paystackKey: string
  onSuccess?: () => void
}

export default function PaystackPayButton({ amount, email, studentId, paystackKey, onSuccess }: PaystackPayButtonProps) {
  const [isVerifying, setIsVerifying] = useState(false)

  const config = {
    reference: (new Date()).getTime().toString(),
    email: email || 'payments@hadda.school', // Fallback email
    amount: amount * 100, // Paystack amount is in kobo
    publicKey: paystackKey,
    metadata: {
      custom_fields: [
        {
          display_name: 'Student ID',
          variable_name: 'student_id',
          value: studentId,
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
          studentId,
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
