import { db } from '@/lib/db'

// Prisma include shape required by computeStudentBalance(). Reuse this anywhere
// you need to load a student for balance computation so the shape stays in sync.
export const balanceInclude = {
  currentClass: {
    include: { feeAssignments: { include: { feeStructure: { include: { term: true } } } } },
  },
  feeAssignments: { include: { feeStructure: { include: { term: true } } } },
  feeDiscounts: true,
  feePayments: { include: { feeStructure: { select: { isArrears: true } } } },
} as const

export type FeeLine = {
  feeStructureId: string
  name: string
  frequency: string
  // Term-scoped fees carry these; yearly / one_time / monthly fees leave them null.
  termId: string | null
  termName: string | null
  termOrder: number | null
  // True when the term has not started yet. Such lines are still payable — a
  // parent may choose to pay ahead — but are not presented as money overdue.
  isUpcoming: boolean
  // True only for the term flagged current. Lets a view separate "this term's
  // fee" from older arrears and other terms.
  isCurrent: boolean
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
  // Outstanding on terms already under way, i.e. what is actually overdue now.
  dueNow: number
}

// The fees a student is actually charged: their own assignments first, then any
// inherited from their class. Retired fees and the arrears bucket are excluded.
function resolveFeeMap(student: any): Map<string, any> {
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

  return feeMap
}

function discountFor(student: any, fee: any): number {
  const discount = student.feeDiscounts.find((d: any) => d.feeStructureId === fee.id)
  if (!discount) return 0
  const gross = Number(fee.amount)
  return discount.discountType === 'percent'
    ? (gross * Number(discount.value)) / 100
    : Number(discount.value)
}

// What ONE term of school costs this student, net of discounts. Used to price
// previous-terms arrears, which are stored only as a count of terms owing.
//
// Termly fees are now one row per term, so naively summing every termly fee
// would multiply this by the number of terms and inflate arrears accordingly —
// hence the grouping by term here. Exported so the admin student profile reads
// the exact same number rather than keeping its own copy of this arithmetic.
export function computeTermlyValue(student: any): number {
  if (!student || student.scholarship) return 0

  const feeMap = resolveFeeMap(student)

  const netByTerm = new Map<string, number>()
  // Termly fees that were never split into per-term rows, for schools that have
  // not run scripts/2026-07-20-split-termly-fees.sql. Keeping this fallback means
  // arrears are valued exactly as they were before terms existed.
  let unsplitTermly = 0

  for (const fee of feeMap.values()) {
    const net = Math.max(0, Number(fee.amount) - discountFor(student, fee))
    if (fee.termId) {
      netByTerm.set(fee.termId, (netByTerm.get(fee.termId) ?? 0) + net)
    } else if (fee.frequency === 'termly') {
      unsplitTermly += net
    }
  }

  // The current term is the fairest reference; fall back to the dearest term if
  // terms are priced unevenly or none is flagged current.
  const currentTermId = Array.from(feeMap.values()).find((f: any) => f.term?.isCurrent)?.termId
  return (
    (currentTermId ? netByTerm.get(currentTermId) : undefined) ??
    (netByTerm.size > 0 ? Math.max(...netByTerm.values()) : unsplitTermly)
  )
}

// Canonical outstanding-fees computation. Single source of truth shared by the
// public payment lookup, the teacher fees view, the admin student profile and
// the SMS balance reminders. `student` must have been loaded with `balanceInclude`.
export function computeStudentBalance(student: any): StudentBalance | null {
  if (!student) return null

  // Students on scholarship owe nothing, regardless of fee assignments.
  if (student.scholarship) {
    return {
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      className: student.currentClass?.name ?? 'Unassigned',
      fees: [],
      total: 0,
      dueNow: 0,
    }
  }

  const feeMap = resolveFeeMap(student)
  const now = new Date()

  const allLines: FeeLine[] = Array.from(feeMap.values()).map((fee) => {
    const grossAmount = Number(fee.amount)
    const discountAmt = discountFor(student, fee)
    const netAmount = Math.max(0, grossAmount - discountAmt)

    const paid = student.feePayments
      .filter((p: any) => p.feeStructureId === fee.id)
      .reduce((sum: number, p: any) => sum + Number(p.amountPaid), 0)
    const outstanding = Math.max(0, netAmount - paid)

    return {
      feeStructureId: fee.id,
      name: fee.name,
      frequency: fee.frequency,
      termId: fee.termId ?? null,
      termName: fee.term?.name ?? null,
      termOrder: fee.term?.order ?? null,
      isUpcoming: fee.term ? new Date(fee.term.startDate) > now : false,
      isCurrent: fee.term?.isCurrent ?? false,
      grossAmount,
      discount: discountAmt,
      netAmount,
      paid,
      outstanding,
    }
  })

  const fees = allLines.filter((f) => f.outstanding > 0)

  const termlyValue = computeTermlyValue(student)
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
        termId: null,
        termName: null,
        // Sorts ahead of every real term — the oldest debt is paid off first.
        termOrder: -1,
        isUpcoming: false,
        isCurrent: false,
        grossAmount,
        discount: 0,
        netAmount: grossAmount,
        paid,
        outstanding,
      })
    }
  }

  // Oldest term first, so both the parent's list and the payment allocator work
  // through debt in the order it was incurred. Non-term fees come last.
  fees.sort((a, b) => {
    const ao = a.termOrder ?? Number.MAX_SAFE_INTEGER
    const bo = b.termOrder ?? Number.MAX_SAFE_INTEGER
    if (ao !== bo) return ao - bo
    return a.name.localeCompare(b.name)
  })

  return {
    id: student.id,
    admissionNumber: student.admissionNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    className: student.currentClass?.name ?? 'Unassigned',
    fees,
    total: fees.reduce((s, f) => s + f.outstanding, 0),
    dueNow: fees.filter((f) => !f.isUpcoming).reduce((s, f) => s + f.outstanding, 0),
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
