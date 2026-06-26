'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

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

  const fee = await db.feeStructure.create({
    data: { name, amount, frequency: frequency as any, description, academicYearId },
  })

  await logAudit({
    userId: session.user.id,
    action: 'fee.created',
    auditableType: 'FeeStructure',
    auditableId: fee.id,
    description: `Created fee structure: ${name} (${frequency}) — ₦${amount}`,
  })

  revalidatePath('/admin/fees')
  return { success: true, id: fee.id }
}

export async function toggleFeeStructure(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string
  const current = await db.feeStructure.findUnique({ where: { id }, select: { isActive: true, name: true } })
  if (!current) return

  await db.feeStructure.update({ where: { id }, data: { isActive: !current.isActive } })

  await logAudit({
    userId: session.user.id,
    action: 'fee.toggled',
    auditableType: 'FeeStructure',
    auditableId: id,
    description: `${current.isActive ? 'Deactivated' : 'Activated'} fee: ${current.name}`,
  })

  revalidatePath('/admin/fees')
  revalidatePath(`/admin/fees/${id}`)
}

export async function deleteFeeStructure(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string
  const paymentCount = await db.feePayment.count({ where: { feeStructureId: id } })
  if (paymentCount > 0) return // silently skip if payments exist

  await db.feeAssignment.deleteMany({ where: { feeStructureId: id } })
  await db.feeDiscount.deleteMany({ where: { feeStructureId: id } })
  await db.feeStructure.delete({ where: { id } })

  await logAudit({
    userId: session.user.id,
    action: 'fee.deleted',
    auditableType: 'FeeStructure',
    auditableId: id,
    description: 'Fee structure deleted',
  })

  revalidatePath('/admin/fees')
}

export async function assignFeeToClass(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const feeStructureId = formData.get('feeStructureId') as string
  const classId = formData.get('classId') as string
  if (!feeStructureId || !classId) return

  const exists = await db.feeAssignment.findFirst({ where: { feeStructureId, classId, studentId: null } })
  if (!exists) {
    await db.feeAssignment.create({ data: { feeStructureId, classId } })
  }

  revalidatePath(`/admin/fees/${feeStructureId}`)
  revalidatePath('/admin/fees')
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

  const payment = await db.feePayment.create({
    data: {
      studentId,
      feeStructureId,
      recordedById: session.user.id,
      amountPaid,
      paymentDate: new Date(paymentDate),
      paymentMethod: paymentMethod as any,
      reference,
      period,
      note,
    },
    include: { student: true, feeStructure: true },
  })

  await logAudit({
    userId: session.user.id,
    action: 'fee.payment.recorded',
    auditableType: 'FeePayment',
    auditableId: payment.id,
    description: `Recorded ₦${amountPaid} payment for ${payment.student.firstName} ${payment.student.lastName} — ${payment.feeStructure.name}`,
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
