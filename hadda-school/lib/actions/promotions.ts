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

  // Classes are scoped to a specific academic year, so "same class" must be
  // resolved to the destination year's class that shares the same name.
  const toYearClasses = await db.classRoom.findMany({
    where: { academicYearId: toYearId },
    select: { id: true, name: true },
  })
  const toClassByName = new Map(
    toYearClasses.map((c) => [c.name.trim().toLowerCase(), c.id])
  )

  for (const studentId of studentIds) {
    const outcome = formData.get(`outcome_${studentId}`) as string
    const selectedToClassId = (formData.get(`toClassId_${studentId}`) as string) || null
    const notes = (formData.get(`notes_${studentId}`) as string)?.trim() || null

    if (!outcome) continue

    const student = await db.student.findUnique({
      where: { id: studentId },
      select: {
        currentClassId: true,
        firstName: true,
        lastName: true,
        currentClass: { select: { name: true } },
      },
    })
    if (!student) continue

    // Skip if already processed for this year
    const existing = await db.promotion.findUnique({
      where: { studentId_fromAcademicYearId: { studentId, fromAcademicYearId: fromYearId } },
    })
    if (existing) continue

    // Resolve the destination class. When no class was explicitly selected
    // ("— same class —"), map to the destination year's class with the same
    // name as the student's current class. Falls back to the current class if
    // the destination year has no matching class.
    const sameNameClassId = student.currentClass?.name
      ? toClassByName.get(student.currentClass.name.trim().toLowerCase()) ?? null
      : null
    const resolvedToClassId = selectedToClassId ?? sameNameClassId ?? student.currentClassId

    await db.promotion.create({
      data: {
        studentId,
        fromAcademicYearId: fromYearId,
        toAcademicYearId: toYearId,
        fromClassId: student.currentClassId,
        toClassId: outcome === 'promoted' || outcome === 'retained' ? resolvedToClassId : null,
        outcome: outcome as any,
        processedById: session.user.id,
        notes,
      },
    })

    // Update student record based on outcome
    if (outcome === 'promoted' || outcome === 'retained') {
      // Both advance the student into the new session; "retained" simply keeps
      // them in the same-named class rather than moving up a level.
      await db.student.update({
        where: { id: studentId },
        data: {
          currentClassId: resolvedToClassId,
          academicYearId: toYearId,
          status: 'active',
        },
      })
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
