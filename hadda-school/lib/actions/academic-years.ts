'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const AcademicYearSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
})

export async function createAcademicYear(formData: FormData) {
  try {
    const session = await auth()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    const rawData = {
      name: formData.get('name'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
    }

    const validatedData = AcademicYearSchema.parse(rawData)

    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)

    if (startDate >= endDate) {
      return { success: false, error: 'Start date must be before end date' }
    }

    const academicYear = await db.academicYear.create({
      data: {
        name: validatedData.name,
        startDate,
        endDate,
        isCurrent: false,
      },
    })

    await logAudit({
      userId: session.user.id,
      action: 'academic_year.created',
      auditableType: 'AcademicYear',
      auditableId: academicYear.id,
      description: `Created academic year: ${validatedData.name}`,
    })

    revalidatePath('/super-admin/academic-years')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to create academic year' }
  }
}

export async function setCurrentAcademicYear(id: string) {
  try {
    const session = await auth()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    const result = await db.$transaction(async (tx) => {
      // Set all to not current
      await tx.academicYear.updateMany({
        data: { isCurrent: false },
      })

      // Set the specified year as current
      const updated = await tx.academicYear.update({
        where: { id },
        data: { isCurrent: true },
      })

      return updated
    })

    await logAudit({
      userId: session.user.id,
      action: 'academic_year.set_current',
      auditableType: 'AcademicYear',
      auditableId: id,
      description: `Set current academic year: ${result.name}`,
    })

    revalidatePath('/super-admin/academic-years')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to set current academic year' }
  }
}

export async function deleteAcademicYear(id: string) {
  try {
    const session = await auth()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if any students are enrolled in this academic year
    const studentCount = await db.student.count({
      where: { academicYearId: id },
    })

    if (studentCount > 0) {
      return {
        success: false,
        error: 'Cannot delete: students are enrolled in this academic year',
      }
    }

    const academicYear = await db.academicYear.delete({
      where: { id },
    })

    await logAudit({
      userId: session.user.id,
      action: 'academic_year.deleted',
      auditableType: 'AcademicYear',
      auditableId: id,
      description: `Deleted academic year: ${academicYear.name}`,
    })

    revalidatePath('/super-admin/academic-years')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete academic year' }
  }
}
