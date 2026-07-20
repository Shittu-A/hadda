'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TermSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required'),
  name: z.string().min(1, 'Name is required'),
  order: z.coerce.number().int().min(1, 'Order must be 1 or more'),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
})

export async function createTerm(formData: FormData) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const validated = TermSchema.parse({
      academicYearId: formData.get('academicYearId'),
      name: formData.get('name'),
      order: formData.get('order'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
    })

    const startDate = new Date(validated.startDate)
    const endDate = new Date(validated.endDate)
    if (startDate >= endDate) {
      return { success: false, error: 'Start date must be before end date' }
    }

    const clash = await db.term.findUnique({
      where: { academicYearId_order: { academicYearId: validated.academicYearId, order: validated.order } },
    })
    if (clash) {
      return { success: false, error: `Term ${validated.order} already exists for that academic year` }
    }

    const term = await db.term.create({
      data: {
        academicYearId: validated.academicYearId,
        name: validated.name,
        order: validated.order,
        startDate,
        endDate,
        isCurrent: false,
      },
      include: { academicYear: { select: { name: true } } },
    })

    await logAudit({
      userId: session.user.id,
      action: 'term.created',
      auditableType: 'Term',
      auditableId: term.id,
      description: `Created term: ${term.name} (${term.academicYear.name})`,
    })

    revalidatePath('/super-admin/terms')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to create term' }
  }
}

export async function setCurrentTerm(id: string) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const target = await db.term.findUnique({
      where: { id },
      include: { academicYear: { select: { name: true, isCurrent: true } } },
    })
    if (!target) return { success: false, error: 'Term not found' }

    // Only one current term system-wide, so terms in other years are cleared too.
    // Marking a term outside the current academic year would leave the two flags
    // disagreeing, which every term-scoped query would then read inconsistently.
    if (!target.academicYear.isCurrent) {
      return {
        success: false,
        error: `${target.academicYear.name} is not the current academic year — set it as current first`,
      }
    }

    const result = await db.$transaction(async (tx) => {
      await tx.term.updateMany({ data: { isCurrent: false } })
      return tx.term.update({ where: { id }, data: { isCurrent: true } })
    })

    await logAudit({
      userId: session.user.id,
      action: 'term.set_current',
      auditableType: 'Term',
      auditableId: id,
      description: `Set current term: ${result.name}`,
    })

    revalidatePath('/super-admin/terms')
    revalidatePath('/teacher/memorization')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to set current term' }
  }
}

export async function updateTermDates(formData: FormData) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const id = formData.get('id') as string
    const name = (formData.get('name') as string)?.trim()
    const startRaw = formData.get('startDate') as string
    const endRaw = formData.get('endDate') as string

    if (!id || !name || !startRaw || !endRaw) {
      return { success: false, error: 'All fields are required' }
    }

    const startDate = new Date(startRaw)
    const endDate = new Date(endRaw)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, error: 'Invalid dates' }
    }
    if (startDate >= endDate) {
      return { success: false, error: 'Start date must be before end date' }
    }

    const term = await db.term.update({
      where: { id },
      data: { name, startDate, endDate },
    })

    await logAudit({
      userId: session.user.id,
      action: 'term.updated',
      auditableType: 'Term',
      auditableId: id,
      description: `Updated term: ${term.name}`,
    })

    revalidatePath('/super-admin/terms')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update term' }
  }
}

export async function deleteTerm(id: string) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    // Fees and memorization targets both hang off a term — deleting one would
    // orphan real money and real grades, so block it while either exists.
    const [feeCount, targetCount] = await Promise.all([
      db.feeStructure.count({ where: { termId: id } }),
      db.memorizationTarget.count({ where: { termId: id } }),
    ])

    if (feeCount > 0) {
      return { success: false, error: `Cannot delete: ${feeCount} fee(s) are charged for this term` }
    }
    if (targetCount > 0) {
      return { success: false, error: `Cannot delete: ${targetCount} memorization target(s) exist for this term` }
    }

    const term = await db.term.delete({ where: { id } })

    await logAudit({
      userId: session.user.id,
      action: 'term.deleted',
      auditableType: 'Term',
      auditableId: id,
      description: `Deleted term: ${term.name}`,
    })

    revalidatePath('/super-admin/terms')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete term' }
  }
}
