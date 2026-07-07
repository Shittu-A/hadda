import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentBalance } from '@/lib/fees/balance'
import { ensureArrearsFeeStructure } from '@/lib/actions/fees'

export async function POST(req: NextRequest) {
  try {
    const { reference, studentId } = await req.json()
    if (!reference || !studentId) {
      return NextResponse.json({ error: 'Missing reference or studentId' }, { status: 400 })
    }

    const secretSetting = await db.setting.findUnique({ where: { key: 'paystack_secret_key' } })
    const secretKey = secretSetting?.value || process.env.PAYSTACK_SECRET_KEY

    if (!secretKey) {
      return NextResponse.json({ error: 'Paystack is not configured' }, { status: 500 })
    }

    // Verify with Paystack API
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    })

    const data = await response.json()
    if (!data.status || data.data.status !== 'success') {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    const amountPaid = data.data.amount / 100 // Convert back to naira
    let remainingAmount = amountPaid

    // Get outstanding balance to distribute payments
    const studentBalance = await getStudentBalance(studentId)
    if (!studentBalance || studentBalance.total === 0) {
      return NextResponse.json({ error: 'No outstanding fees or student not found' }, { status: 400 })
    }

    // We distribute the payment to fees starting from the top
    for (const fee of studentBalance.fees) {
      if (remainingAmount <= 0) break;
      const amountToPay = Math.min(fee.outstanding, remainingAmount)

      let feeStructId = fee.feeStructureId
      if (feeStructId === 'arrears') {
        const arrearsBucket = await ensureArrearsFeeStructure()
        if (arrearsBucket) {
          feeStructId = arrearsBucket.id
        } else {
          continue // Skip if we can't get the arrears bucket
        }
      }

      await db.feePayment.create({
        data: {
          studentId,
          feeStructureId: feeStructId,
          amountPaid: amountToPay,
          paymentDate: new Date(),
          paymentMethod: 'paystack',
          reference: reference,
        },
      })

      remainingAmount -= amountToPay
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Verify error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
