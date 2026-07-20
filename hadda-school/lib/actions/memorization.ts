'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { getCurrentTerm } from '@/lib/current-term'
import { gradeFor } from '@/lib/grades'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Memorization is managed per term: the class teacher sets each student a
// target at the start of the term, then records how much of it they achieved at
// the end. The percentage is the teacher's own judgement — it is deliberately
// not derived from any session log.
//
// This replaced daily sabaq/sabqi/manzil logging. Existing MemorizationLog rows
// are retained in the database but are no longer written or read.

const TargetSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  surahFromId: z.coerce.number().int().min(1).max(114),
  ayahFrom: z.coerce.number().int().min(1, 'Starting ayah must be 1 or more'),
  surahToId: z.coerce.number().int().min(1).max(114),
  ayahTo: z.coerce.number().int().min(1, 'Ending ayah must be 1 or more'),
  targetPages: z.coerce.number().positive('Target pages must be greater than 0'),
  notes: z.string().optional(),
})

const GradeSchema = z.object({
  targetId: z.string().min(1, 'Target is required'),
  achievedPercent: z.coerce
    .number()
    .min(0, 'Percentage cannot be below 0')
    .max(100, 'Percentage cannot be above 100'),
  remark: z.string().optional(),
})

export async function upsertMemorizationTarget(formData: FormData) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const data = TargetSchema.parse({
      studentId: formData.get('studentId'),
      surahFromId: formData.get('surahFromId'),
      ayahFrom: formData.get('ayahFrom'),
      surahToId: formData.get('surahToId'),
      ayahTo: formData.get('ayahTo'),
      targetPages: formData.get('targetPages'),
      notes: formData.get('notes') ?? undefined,
    })

    const term = await getCurrentTerm()
    if (!term) {
      return { success: false, error: 'No current term is set. Ask an administrator to set one.' }
    }

    // Ayah numbers are checked against the real surah lengths. Nothing has ever
    // validated these, so "Al-Fatiha ayah 99" used to be accepted silently.
    const [fromSurah, toSurah] = await Promise.all([
      db.surah.findUnique({ where: { id: data.surahFromId } }),
      db.surah.findUnique({ where: { id: data.surahToId } }),
    ])
    if (!fromSurah || !toSurah) return { success: false, error: 'Invalid surah selected' }

    if (data.ayahFrom > fromSurah.ayahCount) {
      return { success: false, error: `${fromSurah.nameEnglish} has only ${fromSurah.ayahCount} ayahs` }
    }
    if (data.ayahTo > toSurah.ayahCount) {
      return { success: false, error: `${toSurah.nameEnglish} has only ${toSurah.ayahCount} ayahs` }
    }
    // Surahs are numbered in mushaf order, so a lower id is an earlier portion.
    if (
      data.surahFromId > data.surahToId ||
      (data.surahFromId === data.surahToId && data.ayahFrom > data.ayahTo)
    ) {
      return { success: false, error: 'The end of the portion must come after the start' }
    }

    const student = await db.student.findFirst({
      where: { id: data.studentId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, academicYearId: true },
    })
    if (!student) return { success: false, error: 'Student not found' }

    const target = await db.memorizationTarget.upsert({
      where: { studentId_termId: { studentId: data.studentId, termId: term.id } },
      create: {
        studentId: data.studentId,
        termId: term.id,
        academicYearId: student.academicYearId,
        teacherId: session.user.id,
        surahFromId: data.surahFromId,
        ayahFrom: data.ayahFrom,
        surahToId: data.surahToId,
        ayahTo: data.ayahTo,
        targetPages: data.targetPages,
        notes: data.notes?.trim() || null,
      },
      // Re-setting a target leaves any grade already recorded alone.
      update: {
        surahFromId: data.surahFromId,
        ayahFrom: data.ayahFrom,
        surahToId: data.surahToId,
        ayahTo: data.ayahTo,
        targetPages: data.targetPages,
        notes: data.notes?.trim() || null,
      },
    })

    await logAudit({
      userId: session.user.id,
      action: 'memorization.target.set',
      auditableType: 'MemorizationTarget',
      auditableId: target.id,
      description: `Set ${term.name} target for ${student.firstName} ${student.lastName}: ${fromSurah.nameEnglish} ${data.ayahFrom} → ${toSurah.nameEnglish} ${data.ayahTo} (${data.targetPages} pages)`,
    })

    revalidatePath('/teacher/memorization')
    revalidatePath('/admin/memorization')
    revalidatePath(`/admin/students/${data.studentId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to save target' }
  }
}

export async function gradeMemorizationTarget(formData: FormData) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const data = GradeSchema.parse({
      targetId: formData.get('targetId'),
      achievedPercent: formData.get('achievedPercent'),
      remark: formData.get('remark') ?? undefined,
    })

    const existing = await db.memorizationTarget.findUnique({
      where: { id: data.targetId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        term: { select: { name: true } },
      },
    })
    if (!existing) return { success: false, error: 'Target not found' }

    const grade = gradeFor(data.achievedPercent)

    await db.memorizationTarget.update({
      where: { id: data.targetId },
      data: {
        achievedPercent: data.achievedPercent,
        grade,
        remark: data.remark?.trim() || null,
        gradedAt: new Date(),
        gradedById: session.user.id,
      },
    })

    await logAudit({
      userId: session.user.id,
      action: 'memorization.target.graded',
      auditableType: 'MemorizationTarget',
      auditableId: data.targetId,
      description: `Graded ${existing.term.name} memorization for ${existing.student.firstName} ${existing.student.lastName}: ${data.achievedPercent}% (${grade})`,
    })

    revalidatePath('/teacher/memorization')
    revalidatePath('/admin/memorization')
    revalidatePath(`/admin/students/${existing.student.id}`)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to save grade' }
  }
}

export async function deleteMemorizationTarget(id: string) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const target = await db.memorizationTarget.delete({
      where: { id },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    })

    await logAudit({
      userId: session.user.id,
      action: 'memorization.target.deleted',
      auditableType: 'MemorizationTarget',
      auditableId: id,
      description: `Deleted memorization target for ${target.student.firstName} ${target.student.lastName}`,
    })

    revalidatePath('/teacher/memorization')
    revalidatePath('/admin/memorization')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete target' }
  }
}
