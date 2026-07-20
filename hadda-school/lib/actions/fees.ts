'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

export async function createFeeStructure(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const name = (formData.get('name') as string)?.trim()
  const amount = parseFloat(formData.get('amount') as string)
  const frequency = formData.get('frequency') as string
  const description = (formData.get('description') as string)?.trim() || null
  const academicYearId = formData.get('academicYearId') as string

  if (!name || !frequency || !academicYearId || isNaN(amount) || amount <= 0) {
    return { success: false, error: 'All required fields must be filled' }
  }

  // A termly fee becomes one row per term, each carrying `amount`. That is what
  // gives every term its own balance so a parent can settle one term at a time.
  // `amount` is therefore read as the charge PER TERM, not for the whole year.
  let fee
  let termCount = 0

  if (frequency === 'termly') {
    const terms = await db.term.findMany({
      where: { academicYearId },
      orderBy: { order: 'asc' },
    })

    if (terms.length === 0) {
      return {
        success: false,
        error: 'That academic year has no terms yet. Add its terms first, then create the fee.',
      }
    }

    const termGroupId = randomUUID()
    const created = await db.$transaction(
      terms.map((term) =>
        db.feeStructure.create({
          data: {
            name,
            amount,
            frequency: 'termly',
            description,
            academicYearId,
            termId: term.id,
            termGroupId,
          },
        })
      )
    )
    fee = created[0]
    termCount = created.length
  } else {
    fee = await db.feeStructure.create({
      data: { name, amount, frequency: frequency as any, description, academicYearId },
    })
  }

  await logAudit({
    userId: session.user.id,
    action: 'fee.created',
    auditableType: 'FeeStructure',
    auditableId: fee.id,
    description:
      termCount > 0
        ? `Created termly fee: ${name} — ₦${amount} per term across ${termCount} term(s)`
        : `Created fee structure: ${name} (${frequency}) — ₦${amount}`,
  })

  // Optionally assign to every active, non-scholarship student in this year.
  // For a termly fee this covers every term in the group, so the student owes
  // each term separately from the start.
  let applied = 0
  if (formData.get('applyToAll') === 'on') {
    const fd = new FormData()
    fd.set('feeStructureId', fee.id)
    const res = await applyFeeToAllPaying(fd)
    if (res.success) applied = res.applied ?? 0
  }

  revalidatePath('/admin/fees')
  return { success: true, id: fee.id, applied, termCount }
}

// Every FeeStructure row that belongs to the same termly fee. Returns just the
// one id for a non-termly fee, so callers can treat both cases identically.
async function siblingFeeIds(id: string): Promise<string[]> {
  const fee = await db.feeStructure.findUnique({ where: { id }, select: { termGroupId: true } })
  if (!fee?.termGroupId) return [id]
  const siblings = await db.feeStructure.findMany({
    where: { termGroupId: fee.termGroupId },
    select: { id: true },
  })
  return siblings.map((s) => s.id)
}

export async function toggleFeeStructure(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string
  const current = await db.feeStructure.findUnique({ where: { id }, select: { isActive: true, name: true } })
  if (!current) return

  // Activating or retiring a termly fee applies to every term of it — leaving
  // one term active and the others not would bill students inconsistently.
  const ids = await siblingFeeIds(id)
  await db.feeStructure.updateMany({ where: { id: { in: ids } }, data: { isActive: !current.isActive } })

  await logAudit({
    userId: session.user.id,
    action: 'fee.toggled',
    auditableType: 'FeeStructure',
    auditableId: id,
    description: `${current.isActive ? 'Deactivated' : 'Activated'} fee: ${current.name}${ids.length > 1 ? ` (all ${ids.length} terms)` : ''}`,
  })

  revalidatePath('/admin/fees')
  revalidatePath(`/admin/fees/${id}`)
}

export async function deleteFeeStructure(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string

  // Deleting a termly fee removes every term of it, so the check for existing
  // payments has to cover all of them — money recorded against Term 2 must
  // still block deletion when the admin clicks delete on Term 1.
  const ids = await siblingFeeIds(id)
  const paymentCount = await db.feePayment.count({ where: { feeStructureId: { in: ids } } })
  if (paymentCount > 0) return // silently skip if payments exist

  await db.feeAssignment.deleteMany({ where: { feeStructureId: { in: ids } } })
  await db.feeDiscount.deleteMany({ where: { feeStructureId: { in: ids } } })
  await db.feeStructure.deleteMany({ where: { id: { in: ids } } })

  await logAudit({
    userId: session.user.id,
    action: 'fee.deleted',
    auditableType: 'FeeStructure',
    auditableId: id,
    description: ids.length > 1 ? `Fee structure deleted (all ${ids.length} terms)` : 'Fee structure deleted',
  })

  revalidatePath('/admin/fees')
}

export async function assignFeeToClass(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const feeStructureId = formData.get('feeStructureId') as string
  const classId = formData.get('classId') as string
  if (!feeStructureId || !classId) return

  // Assigning a termly fee to a class covers every term of it.
  const feeIds = await siblingFeeIds(feeStructureId)
  const existing = await db.feeAssignment.findMany({
    where: { feeStructureId: { in: feeIds }, classId, studentId: null },
    select: { feeStructureId: true },
  })
  const have = new Set(existing.map((e) => e.feeStructureId))
  const toCreate = feeIds.filter((id) => !have.has(id)).map((id) => ({ feeStructureId: id, classId }))

  if (toCreate.length > 0) {
    await db.feeAssignment.createMany({ data: toCreate })
  }

  revalidatePath(`/admin/fees/${feeStructureId}`)
  revalidatePath('/admin/fees')
}

// Assigns a fee to every active student in the fee's academic year, skipping
// students on scholarship and any who are already assigned. Drives balances via
// student-level FeeAssignment rows.
export async function applyFeeToAllPaying(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const feeStructureId = formData.get('feeStructureId') as string
  if (!feeStructureId) return { success: false, error: 'Missing fee' }

  const fee = await db.feeStructure.findUnique({
    where: { id: feeStructureId },
    select: { academicYearId: true, name: true },
  })
  if (!fee) return { success: false, error: 'Fee not found' }

  // A termly fee is several rows — assign the student to every term of it in one
  // go, otherwise they would only ever be billed for whichever term was clicked.
  const feeIds = await siblingFeeIds(feeStructureId)

  const [students, existing] = await Promise.all([
    db.student.findMany({
      where: {
        deletedAt: null,
        status: 'active',
        scholarship: false,
        academicYearId: fee.academicYearId,
      },
      select: { id: true },
    }),
    db.feeAssignment.findMany({
      where: { feeStructureId: { in: feeIds }, studentId: { not: null } },
      select: { studentId: true, feeStructureId: true },
    }),
  ])

  // Keyed per (fee row, student) so a student already billed for Term 1 still
  // picks up Terms 2 and 3.
  const alreadyAssigned = new Set(existing.map((a) => `${a.feeStructureId}:${a.studentId}`))
  const toCreate = feeIds.flatMap((id) =>
    students
      .filter((s) => !alreadyAssigned.has(`${id}:${s.id}`))
      .map((s) => ({ feeStructureId: id, studentId: s.id }))
  )

  if (toCreate.length > 0) {
    await db.feeAssignment.createMany({ data: toCreate })
  }

  // Report students covered, not rows written — "applied to 120 students" reads
  // correctly whether the fee has one term or three.
  const studentsCovered = new Set(toCreate.map((a) => a.studentId)).size

  await logAudit({
    userId: session.user.id,
    action: 'fee.applied_to_all',
    auditableType: 'FeeStructure',
    auditableId: feeStructureId,
    description: `Applied fee "${fee.name}" to ${studentsCovered} paying student(s)${feeIds.length > 1 ? ` across ${feeIds.length} terms` : ''}`,
  })

  revalidatePath(`/admin/fees/${feeStructureId}`)
  revalidatePath('/admin/fees')
  return { success: true, applied: studentsCovered }
}

// Removes this fee from every student who is on scholarship (deletes their
// student-level assignments). Use after marking students as scholarship.
export async function removeScholarshipFromFee(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const feeStructureId = formData.get('feeStructureId') as string
  if (!feeStructureId) return { success: false, error: 'Missing fee' }

  const fee = await db.feeStructure.findUnique({
    where: { id: feeStructureId },
    select: { name: true },
  })
  if (!fee) return { success: false, error: 'Fee not found' }

  const feeIds = await siblingFeeIds(feeStructureId)

  const scholars = await db.student.findMany({
    where: { scholarship: true },
    select: { id: true },
  })
  const scholarIds = scholars.map((s) => s.id)

  // Clears every term of a termly fee, matching how it was applied.
  const result = await db.feeAssignment.deleteMany({
    where: { feeStructureId: { in: feeIds }, studentId: { in: scholarIds } },
  })

  await logAudit({
    userId: session.user.id,
    action: 'fee.removed_scholarship',
    auditableType: 'FeeStructure',
    auditableId: feeStructureId,
    description: `Removed fee "${fee.name}" from ${result.count} scholarship student(s)`,
  })

  revalidatePath(`/admin/fees/${feeStructureId}`)
  revalidatePath('/admin/fees')
  return { success: true, removed: result.count }
}

// Toggles a student's scholarship status. Scholarship students are excluded from
// "apply to all paying students" and owe no fees.
export async function toggleStudentScholarship(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const studentId = formData.get('studentId') as string
  const scholarship = formData.get('scholarship') === 'true'
  const scholarshipNote = (formData.get('scholarshipNote') as string)?.trim() || null
  if (!studentId) return { success: false, error: 'Missing student' }

  const student = await db.student.update({
    where: { id: studentId },
    data: { scholarship, scholarshipNote: scholarship ? scholarshipNote : null },
    select: { firstName: true, lastName: true },
  })

  await logAudit({
    userId: session.user.id,
    action: 'student.scholarship.set',
    auditableType: 'Student',
    auditableId: studentId,
    description: `${scholarship ? 'Placed' : 'Removed'} ${student.firstName} ${student.lastName} ${scholarship ? 'on' : 'from'} scholarship`,
  })

  revalidatePath(`/admin/students/${studentId}`)
  revalidatePath('/admin/fees/payments')
  return { success: true }
}

export async function removeFeeAssignment(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string
  const feeStructureId = formData.get('feeStructureId') as string
  await db.feeAssignment.delete({ where: { id } })

  revalidatePath(`/admin/fees/${feeStructureId}`)
  revalidatePath('/admin/fees')
}

// Finds (or lazily creates) the single reserved fee bucket that arrears payments
// are recorded against, so they appear in the normal payments list & audit log.
export async function ensureArrearsFeeStructure() {
  const existing = await db.feeStructure.findFirst({ where: { isArrears: true } })
  if (existing) return existing

  const year =
    (await db.academicYear.findFirst({ where: { isCurrent: true } })) ??
    (await db.academicYear.findFirst({ orderBy: { startDate: 'desc' } }))
  if (!year) return null

  return db.feeStructure.create({
    data: {
      academicYearId: year.id,
      name: 'Previous Terms (Arrears)',
      amount: 0,
      frequency: 'one_time',
      isArrears: true,
      description: 'Outstanding fees carried over from before this system. Owed amount = terms owing × termly fee.',
    },
  })
}

// Admin manually sets how many terms a student owes from before the system started.
export async function setStudentArrears(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const studentId = formData.get('studentId') as string
  const arrearsTerms = parseInt(formData.get('arrearsTerms') as string)
  const arrearsNote = (formData.get('arrearsNote') as string)?.trim() || null

  if (!studentId || isNaN(arrearsTerms) || arrearsTerms < 0) {
    return { success: false, error: 'Enter a valid number of terms (0 or more)' }
  }

  // Make sure the bucket exists so payments can be recorded against it later.
  await ensureArrearsFeeStructure()

  const student = await db.student.update({
    where: { id: studentId },
    data: { arrearsTerms, arrearsNote },
    select: { firstName: true, lastName: true },
  })

  await logAudit({
    userId: session.user.id,
    action: 'student.arrears.set',
    auditableType: 'Student',
    auditableId: studentId,
    description: `Set previous-terms arrears for ${student.firstName} ${student.lastName} to ${arrearsTerms} term(s)`,
  })

  revalidatePath(`/admin/students/${studentId}`)
  return { success: true }
}

export async function recordFeePayment(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const studentId = formData.get('studentId') as string
  const feeStructureId = formData.get('feeStructureId') as string
  const amountPaid = parseFloat(formData.get('amountPaid') as string)
  const paymentDate = formData.get('paymentDate') as string
  const paymentMethod = formData.get('paymentMethod') as string
  const reference = (formData.get('reference') as string)?.trim() || null
  const period = (formData.get('period') as string)?.trim() || null
  const note = (formData.get('note') as string)?.trim() || null

  if (!studentId || !feeStructureId || !paymentDate || !paymentMethod || isNaN(amountPaid) || amountPaid <= 0) {
    return { success: false, error: 'All required fields must be filled' }
  }

  // A term-scoped fee names its own period, so the admin no longer has to type
  // one. The free-text field is still honoured for non-termly fees and for
  // anything needing a custom label.
  const target = await db.feeStructure.findUnique({
    where: { id: feeStructureId },
    select: { term: { select: { name: true } } },
  })
  const resolvedPeriod = target?.term?.name ?? period

  const payment = await db.feePayment.create({
    data: {
      studentId,
      feeStructureId,
      recordedById: session.user.id,
      amountPaid,
      paymentDate: new Date(paymentDate),
      paymentMethod: paymentMethod as any,
      reference,
      period: resolvedPeriod,
      note,
    },
    include: { student: true, feeStructure: { include: { term: true } } },
  })

  await logAudit({
    userId: session.user.id,
    action: 'fee.payment.recorded',
    auditableType: 'FeePayment',
    auditableId: payment.id,
    description: `Recorded ₦${amountPaid} payment for ${payment.student.firstName} ${payment.student.lastName} — ${payment.feeStructure.name}${payment.feeStructure.term ? ` (${payment.feeStructure.term.name})` : ''}`,
  })

  revalidatePath('/admin/fees/payments')
  revalidatePath(`/admin/students/${studentId}`)
  revalidatePath(`/admin/fees/${feeStructureId}`)
  return { success: true }
}

export async function deleteFeePayment(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string
  const payment = await db.feePayment.findUnique({
    where: { id },
    select: { studentId: true, feeStructureId: true },
  })
  if (!payment) return

  await db.feePayment.delete({ where: { id } })

  await logAudit({
    userId: session.user.id,
    action: 'fee.payment.deleted',
    auditableType: 'FeePayment',
    auditableId: id,
    description: 'Fee payment deleted',
  })

  revalidatePath('/admin/fees/payments')
  revalidatePath(`/admin/students/${payment.studentId}`)
  revalidatePath(`/admin/fees/${payment.feeStructureId}`)
}

export async function upsertFeeDiscount(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const studentId = formData.get('studentId') as string
  const feeStructureId = formData.get('feeStructureId') as string
  const discountType = formData.get('discountType') as string
  const value = parseFloat(formData.get('value') as string)
  const reason = (formData.get('reason') as string)?.trim() || null

  if (!studentId || !feeStructureId || !discountType || isNaN(value) || value <= 0) return

  await db.feeDiscount.upsert({
    where: { studentId_feeStructureId: { studentId, feeStructureId } },
    update: { discountType: discountType as any, value, reason },
    create: { studentId, feeStructureId, discountType: discountType as any, value, reason },
  })

  revalidatePath(`/admin/students/${studentId}`)
  revalidatePath('/admin/fees/payments')
}
