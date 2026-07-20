import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentBalance } from '@/lib/fees/balance'
import { ensureArrearsFeeStructure } from '@/lib/actions/fees'

type Selection = { studentId: string; feeStructureIds?: string[] }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { reference } = body

    // The parent ticks specific terms to pay for. The request carries only the
    // ids of the lines they chose — never amounts. Every figure below is taken
    // from the student's balance as computed here, so a tampered request cannot
    // mark a term paid for less than it costs.
    const selections: Selection[] = Array.isArray(body.selections)
      ? body.selections
      : // Older clients (and the single-student path) sent bare student ids,
        // meaning "pay everything outstanding".
        (body.studentIds ?? (body.studentId ? [body.studentId] : [])).map((id: string) => ({
          studentId: id,
        }))

    if (!reference || selections.length === 0) {
      return NextResponse.json({ error: 'Missing reference or selections' }, { status: 400 })
    }

    const secretSetting = await db.setting.findUnique({ where: { key: 'paystack_secret_key' } })
    const secretKey = process.env.PAYSTACK_SECRET_KEY || secretSetting?.value

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

    // Paystack confirms how much actually changed hands. That is the ceiling on
    // everything we record, whatever the request claimed was selected.
    const amountPaid = data.data.amount / 100 // Convert back to naira
    let remainingAmount = amountPaid

    // Guard against a duplicate verify call (double-submit, retry, refresh)
    // creating a second set of payments for the same transaction.
    const alreadyRecorded = await db.feePayment.count({ where: { reference } })
    if (alreadyRecorded > 0) {
      return NextResponse.json({ success: true, alreadyRecorded: true })
    }

    // Get an admin user to attribute the payment recording to
    const adminUser = await db.user.findFirst({
      where: { role: { in: ['super_admin', 'admin'] } },
      orderBy: { createdAt: 'asc' }
    })

    if (!adminUser) {
      return NextResponse.json({ error: 'System config error: no admin found' }, { status: 500 })
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

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Verify error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
