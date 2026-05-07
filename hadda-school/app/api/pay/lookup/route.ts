import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query) return NextResponse.json({ error: 'Query is required' }, { status: 400 })

  const trimmed = query.trim()

  // Look up by admission number or guardian phone
  const student = await db.student.findFirst({
    where: {
      deletedAt: null,
      status: 'active',
      OR: [
        { admissionNumber: { equals: trimmed, mode: 'insensitive' } },
        { guardians: { some: { phone: trimmed } } },
      ],
    },
    include: {
      currentClass: { include: { feeAssignments: { include: { feeStructure: true } } } },
      feeAssignments: { include: { feeStructure: true } },
      feeDiscounts: true,
      feePayments: true,
    },
  })

  if (!student) return NextResponse.json({ error: 'No student found' }, { status: 404 })

  // Collect all applicable fee structures (student-level + class-level, deduplicated)
  const feeMap = new Map<string, typeof student.feeAssignments[0]['feeStructure']>()

  for (const fa of student.feeAssignments) {
    if (fa.feeStructure.isActive) feeMap.set(fa.feeStructureId, fa.feeStructure)
  }

  if (student.currentClass) {
    for (const fa of student.currentClass.feeAssignments) {
      if (fa.feeStructure.isActive && !feeMap.has(fa.feeStructureId)) {
        feeMap.set(fa.feeStructureId, fa.feeStructure)
      }
    }
  }

  const fees = Array.from(feeMap.values()).map((fee) => {
    const discount = student.feeDiscounts.find((d) => d.feeStructureId === fee.id)
    const grossAmount = Number(fee.amount)
    const discountAmt = discount
      ? discount.discountType === 'percent'
        ? (grossAmount * Number(discount.value)) / 100
        : Number(discount.value)
      : 0
    const netAmount = Math.max(0, grossAmount - discountAmt)
    const paid = student.feePayments
      .filter((p) => p.feeStructureId === fee.id)
      .reduce((sum, p) => sum + Number(p.amountPaid), 0)
    const outstanding = Math.max(0, netAmount - paid)

    return {
      feeStructureId: fee.id,
      name: fee.name,
      frequency: fee.frequency,
      grossAmount,
      discount: discountAmt,
      netAmount,
      paid,
      outstanding,
    }
  }).filter((f) => f.outstanding > 0)

  return NextResponse.json({
    student: {
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      className: student.currentClass?.name ?? 'Unassigned',
      fees,
      total: fees.reduce((s, f) => s + f.outstanding, 0),
    },
  })
}
