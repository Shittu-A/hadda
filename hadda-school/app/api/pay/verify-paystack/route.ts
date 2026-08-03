import { NextRequest, NextResponse } from 'next/server'
import { recordPaystackPayment, type PaystackSelection } from '@/lib/payments/record-paystack-payment'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { reference } = body

    // The parent ticks specific terms to pay for. The request carries only the
    // ids of the lines they chose — never amounts. Every figure is taken from
    // the student's balance as recomputed server-side, so a tampered request
    // cannot mark a term paid for less than it costs.
    const selections: PaystackSelection[] = Array.isArray(body.selections)
      ? body.selections
      : // Older clients (and the single-student path) sent bare student ids,
        // meaning "pay everything outstanding".
        (body.studentIds ?? (body.studentId ? [body.studentId] : [])).map((id: string) => ({
          studentId: id,
        }))

    const result = await recordPaystackPayment(reference, selections)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ success: true, alreadyRecorded: result.alreadyRecorded })
  } catch (err) {
    console.error('Verify error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
