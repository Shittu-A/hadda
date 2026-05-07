'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function processPromotions(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const fromYearId = formData.get('fromYearId') as string
  const toYearId = formData.get('toYearId') as string
  const studentIds = formData.getAll('studentId').map(String)

  if (!fromYearId || !toYearId || studentIds.length === 0) {
    return { success: false, error: 'Missing required fields' }
  }

  if (fromYearId === toYearId) {
    return { success: false, error: 'From year and To year must be different' }
  }

  const results: { studentId: string; outcome: string }[] = []

  for (const studentId of studentIds) {
    const outcome = formData.get(`outcome_${studentId}`) as string
    const toClassId = (formData.get(`toClassId_${studentId}`) as string) || null
    const notes = (formData.get(`notes_${studentId}`) as string)?.trim() || null

    if (!outcome) continue

    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { currentClassId: true, firstName: true, lastName: true },
    })
    if (!student) continue

    // Skip if already processed for this year
    const existing = await db.promotion.findUnique({
      where: { studentId_fromAcademicYearId: { studentId, fromAcademicYearId: fromYearId } },
    })
    if (existing) continue

    await db.promotion.create({
      data: {
        studentId,
        fromAcademicYearId: fromYearId,
        toAcademicYearId: toYearId,
        fromClassId: student.currentClassId,
        toClassId: outcome === 'promoted' ? toClassId : null,
        outcome: outcome as any,
        processedById: session.user.id,
        notes,
      },
    })

    // Update student record based on outcome
    if (outcome === 'promoted') {
      await db.student.update({
        where: { id: studentId },
        data: { currentClassId: toClassId, status: 'active' },
      })
    } else if (outcome === 'retained') {
      // stays in same class, no update needed
    } else if (outcome === 'graduated') {
      await db.student.update({
        where: { id: studentId },
        data: { status: 'graduated', currentClassId: null },
      })
    } else if (outcome === 'withdrawn') {
      await db.student.update({
        where: { id: studentId },
        data: { status: 'withdrawn', deletedAt: new Date() },
      })
    } else if (outcome === 'transferred') {
      await db.student.update({
        where: { id: studentId },
        data: { status: 'transferred' },
      })
    }

    results.push({ studentId, outcome })
  }

  await logAudit({
    userId: session.user.id,
    action: 'promotions.processed',
    description: `Processed ${results.length} student promotions from year ${fromYearId} to ${toYearId}`,
  })

  revalidatePath('/admin/promotions')
  revalidatePath('/admin/students')
  revalidatePath('/admin/alumni')

  redirect(`/admin/promotions?fromYearId=${fromYearId}&toYearId=${toYearId}&done=1`)
}
