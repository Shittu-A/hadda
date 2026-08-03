import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { recordPaystackPayment, type PaystackSelection } from '@/lib/payments/record-paystack-payment'

// Some Paystack channels — OPay, other mobile money, bank transfer, USSD —
// send the payer out of this page entirely (into the OPay app, a banking
// app, etc.) to finish the charge. The browser can come back, or never come
// back, without the inline SDK's onSuccess callback ever running, so the
// client-triggered /api/pay/verify-paystack call is never made and the
// payment silently never gets recorded even though Paystack settled it. Card
// payments don't hit this because they complete inline without leaving the
// page. Paystack's dashboard webhook is the reliable source of truth for
// every channel, so this endpoint is what actually closes that gap — it must
// be registered as the webhook URL in the Paystack dashboard.
export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const secretSetting = await db.setting.findUnique({ where: { key: 'paystack_secret_key' } })
  const secretKey = process.env.PAYSTACK_SECRET_KEY || secretSetting?.value
  if (!secretKey) {
    return NextResponse.json({ error: 'Paystack is not configured' }, { status: 500 })
  }

  const signature = req.headers.get('x-paystack-signature')
  const expected = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex')
  if (!signature || signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const reference: string | undefined = event.data?.reference
  if (!reference) {
    return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
  }

  const customFields: Array<{ variable_name?: string; value?: unknown }> =
    event.data?.metadata?.custom_fields ?? []
  const selectionsField = customFields.find((f) => f.variable_name === 'selections')?.value
  const studentIdsField = customFields.find((f) => f.variable_name === 'student_ids')?.value

  let selections: PaystackSelection[] = []
  if (typeof selectionsField === 'string') {
    try {
      selections = JSON.parse(selectionsField)
    } catch {
      selections = []
    }
  }
  if (selections.length === 0 && typeof studentIdsField === 'string') {
    selections = studentIdsField
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .map((studentId) => ({ studentId }))
  }

  if (selections.length === 0) {
    console.error('Paystack webhook: no student selections found for reference', reference)
    return NextResponse.json({ error: 'No student selections found in metadata' }, { status: 400 })
  }

  const result = await recordPaystackPayment(reference, selections)
  if (!result.ok) {
    console.error('Paystack webhook: failed to record payment', reference, result.error)
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ received: true })
}
