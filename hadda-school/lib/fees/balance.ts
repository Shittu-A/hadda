import { db } from '@/lib/db'

// Prisma include shape required by computeStudentBalance(). Reuse this anywhere
// you need to load a student for balance computation so the shape stays in sync.
export const balanceInclude = {
  currentClass: { include: { feeAssignments: { include: { feeStructure: true } } } },
  feeAssignments: { include: { feeStructure: true } },
  feeDiscounts: true,
  feePayments: { include: { feeStructure: { select: { isArrears: true } } } },
} as const

export type FeeLine = {
  feeStructureId: string
  name: string
  frequency: string
  grossAmount: number
  discount: number
  netAmount: number
  paid: number
  outstanding: number
}

export type StudentBalance = {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  className: string
  fees: FeeLine[]
  total: number
}

// Canonical outstanding-fees computation. Single source of truth shared by the
// public payment lookup, the teacher fees view, and the SMS balance reminders.
// `student` must have been loaded with `balanceInclude`.
export function computeStudentBalance(student: any): StudentBalance | null {
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

  const fees: FeeLine[] = Array.from(feeMap.values()).map((fee) => {
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

// Convenience loader: fetch a single active student and compute their balance.
export async function getStudentBalance(studentId: string): Promise<StudentBalance | null> {
  const student = await db.student.findFirst({
    where: { id: studentId, deletedAt: null },
    include: balanceInclude,
  })
  return computeStudentBalance(student)
}
