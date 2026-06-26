import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query) return NextResponse.json({ error: 'Query is required' }, { status: 400 })

  const trimmed = query.trim()

  const commonInclude = {
    currentClass: { include: { feeAssignments: { include: { feeStructure: true } } } },
    feeAssignments: { include: { feeStructure: true } },
    feeDiscounts: true,
    feePayments: { include: { feeStructure: { select: { isArrears: true } } } },
  } as const

  function buildPayload(student: Awaited<ReturnType<typeof db.student.findFirst>> & { currentClass?: any; feeAssignments: any[]; feeDiscounts: any[]; feePayments: any[] }) {
    if (!student) return null
    const feeMap = new Map<string, any>()

    for (const fa of student.feeAssignments) {
      if (fa.feeStructure.isActive && !fa.feeStructure.isArrears) feeMap.set(fa.feeStructureId, fa.feeStructure)
    }

    if (student.currentClass) {
      for (const fa of student.currentClass.feeAssignments) {
        if (fa.feeStructure.isActive && !fa.feeStructure.isArrears && !feeMap.has(fa.feeStructureId)) {
          feeMap.set(fa.feeStructureId, fa.feeStructure)
        }
      }
    }

    // Net value of one term's worth of fees (used to value previous-terms arrears).
    let termlyValue = 0

    const fees = Array.from(feeMap.values()).map((fee) => {
      const discount = student.feeDiscounts.find((d: any) => d.feeStructureId === fee.id)
      const grossAmount = Number(fee.amount)
      const discountAmt = discount
        ? discount.discountType === 'percent'
          ? (grossAmount * Number(discount.value)) / 100
          : Number(discount.value)
        : 0
      const netAmount = Math.max(0, grossAmount - discountAmt)
      if (fee.frequency === 'termly') termlyValue += netAmount
      const paid = student.feePayments
        .filter((p: any) => p.feeStructureId === fee.id)
        .reduce((sum: number, p: any) => sum + Number(p.amountPaid), 0)
      const outstanding = Math.max(0, netAmount - paid)
      return { feeStructureId: fee.id, name: fee.name, frequency: fee.frequency, grossAmount, discount: discountAmt, netAmount, paid, outstanding }
    }).filter((f) => f.outstanding > 0)

    // Previous-terms arrears: terms owing × one term's fee, less any arrears payments made.
    const arrearsTerms = student.arrearsTerms ?? 0
    if (arrearsTerms > 0 && termlyValue > 0) {
      const grossAmount = arrearsTerms * termlyValue
      const paid = student.feePayments
        .filter((p: any) => p.feeStructure?.isArrears)
        .reduce((sum: number, p: any) => sum + Number(p.amountPaid), 0)
      const outstanding = Math.max(0, grossAmount - paid)
      if (outstanding > 0) {
        fees.push({
          feeStructureId: 'arrears',
          name: `Previous terms (${arrearsTerms} term${arrearsTerms !== 1 ? 's' : ''} owing)`,
          frequency: 'termly',
          grossAmount,
          discount: 0,
          netAmount: grossAmount,
          paid,
          outstanding,
        })
      }
    }

    return {
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      className: student.currentClass?.name ?? 'Unassigned',
      fees,
      total: fees.reduce((s, f) => s + f.outstanding, 0),
    }
  }

  // First: try exact admission number match
  const byAdmission = await db.student.findFirst({
    where: { admissionNumber: { equals: trimmed, mode: 'insensitive' }, deletedAt: null, status: 'active' },
    include: commonInclude,
  })

  if (byAdmission) {
    return NextResponse.json({ student: buildPayload(byAdmission as any) })
  }

  // Fall back: phone number — may match multiple students
  const byPhone = await db.student.findMany({
    where: { deletedAt: null, status: 'active', guardians: { some: { phone: trimmed } } },
    include: commonInclude,
    orderBy: [{ firstName: 'asc' }],
  })

  if (byPhone.length === 0) {
    return NextResponse.json({ error: 'No student found with that admission number or phone number.' }, { status: 404 })
  }

  if (byPhone.length === 1) {
    return NextResponse.json({ student: buildPayload(byPhone[0] as any) })
  }

  return NextResponse.json({ students: byPhone.map((s) => buildPayload(s as any)) })
}
