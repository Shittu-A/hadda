import { db } from '@/lib/db'
import { getStudentBalance } from '@/lib/fees/balance'
import { ensureArrearsFeeStructure } from '@/lib/actions/fees'

export type PaystackSelection = { studentId: string; feeStructureIds?: string[] }

// Shared by both the client-triggered verify endpoint and the Paystack webhook.
// The webhook is what actually guarantees a payment gets recorded: channels
// like OPay, bank transfer, and USSD redirect the payer out of the page (into
// the OPay app, a banking app, etc.), so the browser can come back without
// ever running the inline SDK's onSuccess callback. Paystack's own dashboard
// events are the only thing that's reliable for those, so this is written to
// be safe to call from either place, and safe to call twice for the same
// reference (the alreadyRecorded check below is what makes that idempotent).
export async function recordPaystackPayment(
  reference: string,
  selections: PaystackSelection[]
): Promise<{ ok: true; alreadyRecorded?: boolean } | { ok: false; error: string; status: number }> {
  if (!reference || selections.length === 0) {
    return { ok: false, error: 'Missing reference or selections', status: 400 }
  }

  const secretSetting = await db.setting.findUnique({ where: { key: 'paystack_secret_key' } })
  const secretKey = process.env.PAYSTACK_SECRET_KEY || secretSetting?.value

  if (!secretKey) {
    return { ok: false, error: 'Paystack is not configured', status: 500 }
  }

  // Verify with Paystack directly rather than trusting whatever the caller
  // claims — this is what makes it safe for a webhook payload (or a replayed
  // client call) to drive real fee records.
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${secretKey}` },
  })

  const data = await response.json()
  if (!data.status || data.data.status !== 'success') {
    return { ok: false, error: 'Payment verification failed', status: 400 }
  }

  // Paystack confirms how much actually changed hands. That is the ceiling on
  // everything we record, whatever the request claimed was selected.
  const amountPaid = data.data.amount / 100 // Convert back to naira
  let remainingAmount = amountPaid

  // Guard against a duplicate call (double-submit, retry, refresh, or the
  // client verify call and the webhook both landing for the same transaction)
  // creating a second set of payments.
  const alreadyRecorded = await db.feePayment.count({ where: { reference } })
  if (alreadyRecorded > 0) {
    return { ok: true, alreadyRecorded: true }
  }

  // Get an admin user to attribute the payment recording to
  const adminUser = await db.user.findFirst({
    where: { role: { in: ['super_admin', 'admin'] } },
    orderBy: { createdAt: 'asc' },
  })

  if (!adminUser) {
    return { ok: false, error: 'System config error: no admin found', status: 500 }
  }
  const recordedById = adminUser.id

  let arrearsBucketId: string | null = null

  for (const selection of selections) {
    if (remainingAmount <= 0) break

    const studentBalance = await getStudentBalance(selection.studentId)
    if (!studentBalance || studentBalance.total === 0) continue

    const chosen = selection.feeStructureIds
    const picked = chosen?.length
      ? studentBalance.fees.filter((f) => chosen.includes(f.feeStructureId))
      : studentBalance.fees

    // Pay the ticked terms first, then let any leftover settle the remaining
    // debt oldest term first. Leftovers happen when the balance moved between
    // checkout and verification — e.g. an admin recorded a cash payment
    // meanwhile — and this stops the difference going unallocated.
    const rest = studentBalance.fees.filter((f) => !picked.includes(f))

    for (const fee of [...picked, ...rest]) {
      if (remainingAmount <= 0) break

      const amountToPay = Math.min(fee.outstanding, remainingAmount)
      if (amountToPay <= 0) continue

      let feeStructId = fee.feeStructureId
      if (feeStructId === 'arrears') {
        if (!arrearsBucketId) {
          const arrearsBucket = await ensureArrearsFeeStructure()
          arrearsBucketId = arrearsBucket?.id ?? null
        }
        if (!arrearsBucketId) continue // Skip if we can't get the arrears bucket
        feeStructId = arrearsBucketId
      }

      await db.feePayment.create({
        data: {
          studentId: selection.studentId,
          feeStructureId: feeStructId,
          recordedById,
          amountPaid: amountToPay,
          paymentDate: new Date(),
          paymentMethod: 'online',
          reference: reference,
          // Records which term the money settled, so receipts and the payment
          // history say "Second Term" rather than leaving it blank.
          period: fee.termName ?? null,
        },
      })

      remainingAmount -= amountToPay
    }
  }

  return { ok: true }
}
