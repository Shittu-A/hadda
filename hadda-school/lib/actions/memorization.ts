'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export async function createMemorizationLog(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const studentId = formData.get('studentId') as string
  const type = formData.get('type') as string
  const surahFromId = parseInt(formData.get('surahFromId') as string)
  const ayahFrom = parseInt(formData.get('ayahFrom') as string)
  const surahToId = parseInt(formData.get('surahToId') as string)
  const ayahTo = parseInt(formData.get('ayahTo') as string)
  const pages = parseFloat(formData.get('pages') as string)
  const quality = formData.get('quality') as string
  const notes = (formData.get('notes') as string)?.trim() || null
  const logDate = formData.get('logDate') as string

  if (!studentId || !type || !surahFromId || !ayahFrom || !surahToId || !ayahTo || !pages || !quality || !logDate) {
    return { success: false, error: 'All required fields must be filled' }
  }

  if (isNaN(surahFromId) || isNaN(ayahFrom) || isNaN(surahToId) || isNaN(ayahTo) || isNaN(pages)) {
    return { success: false, error: 'Invalid numeric values' }
  }

  if (pages <= 0) return { success: false, error: 'Pages must be greater than 0' }

  const currentYear = await db.academicYear.findFirst({ where: { isCurrent: true } })
  if (!currentYear) return { success: false, error: 'No active academic year is set' }

  const log = await db.memorizationLog.create({
    data: {
      studentId,
      teacherId: session.user.id,
      academicYearId: currentYear.id,
      logDate: new Date(logDate),
      type: type as any,
      surahFromId,
      ayahFrom,
      surahToId,
      ayahTo,
      pages,
      quality: quality as any,
      notes,
    },
    include: { student: true },
  })

  await logAudit({
    userId: session.user.id,
    action: 'memorization.logged',
    auditableType: 'MemorizationLog',
    auditableId: log.id,
    description: `Logged ${type} for ${log.student.firstName} ${log.student.lastName}: ${pages} pages`,
  })

  revalidatePath('/teacher/memorization')
  revalidatePath(`/admin/students/${studentId}`)
  return { success: true }
}

export async function deleteMemorizationLog(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  await db.memorizationLog.delete({ where: { id } })

  await logAudit({
    userId: session.user.id,
    action: 'memorization.deleted',
    auditableType: 'MemorizationLog',
    auditableId: id,
    description: 'Memorization log deleted',
  })

  revalidatePath('/teacher/memorization')
  return { success: true }
}
