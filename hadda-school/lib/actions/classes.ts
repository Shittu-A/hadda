'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ClassSchema = z.object({
  name: z.string().min(1, 'Class name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  capacity: z.coerce.number().int().positive('Capacity must be positive').optional(),
  order: z.coerce.number().int().min(0, 'Order must be 0 or greater').optional(),
  academicYearId: z.string().min(1, 'Academic year is required'),
})

export async function createClass(formData: FormData) {
  try {
    const session = await auth()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    const rawData = {
      name: formData.get('name'),
      description: formData.get('description'),
      capacity: formData.get('capacity'),
      order: formData.get('order') || '0',
      academicYearId: formData.get('academicYearId'),
    }

    const validatedData = ClassSchema.parse(rawData)

    const classroom = await db.classRoom.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        capacity: validatedData.capacity || null,
        order: validatedData.order || 0,
        academicYearId: validatedData.academicYearId,
      },
    })

    await logAudit({
      userId: session.user.id,
      action: 'class.created',
      auditableType: 'ClassRoom',
      auditableId: classroom.id,
      description: `Created class: ${validatedData.name}`,
    })

    revalidatePath('/admin/classes')
    return { success: true, classId: classroom.id }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to create class' }
  }
}

export async function updateClass(id: string, formData: FormData) {
  try {
    const session = await auth()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    const rawData = {
      name: formData.get('name'),
      description: formData.get('description'),
      capacity: formData.get('capacity'),
      order: formData.get('order'),
      academicYearId: formData.get('academicYearId'),
    }

    const validatedData = ClassSchema.parse(rawData)

    const classroom = await db.classRoom.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        capacity: validatedData.capacity || null,
        order: validatedData.order || 0,
        academicYearId: validatedData.academicYearId,
      },
    })

    await logAudit({
      userId: session.user.id,
      action: 'class.updated',
      auditableType: 'ClassRoom',
      auditableId: id,
      description: `Updated class: ${validatedData.name}`,
    })

    revalidatePath('/admin/classes')
    revalidatePath(`/admin/classes/${id}`)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to update class' }
  }
}

export async function deleteClass(id: string) {
  try {
    const session = await auth()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if any active students have currentClassId = id
    const studentCount = await db.student.count({
      where: {
        currentClassId: id,
        deletedAt: null,
        status: 'active',
      },
    })

    if (studentCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${studentCount} active student(s) enrolled in this class`,
      }
    }

    const classroom = await db.classRoom.delete({
      where: { id },
    })

    await logAudit({
      userId: session.user.id,
      action: 'class.deleted',
      auditableType: 'ClassRoom',
      auditableId: id,
      description: `Deleted class: ${classroom.name}`,
    })

    revalidatePath('/admin/classes')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete class' }
  }
}

export async function cloneClasses(fromYearId: string, toYearId: string) {
  try {
    const session = await auth()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!fromYearId || !toYearId || fromYearId === toYearId) {
      return { success: false, error: 'Choose a different source year to copy from' }
    }

    const [sourceClasses, targetClasses] = await Promise.all([
      db.classRoom.findMany({
        where: { academicYearId: fromYearId },
        orderBy: { order: 'asc' },
        select: { name: true, description: true, capacity: true, order: true },
      }),
      db.classRoom.findMany({
        where: { academicYearId: toYearId },
        select: { name: true },
      }),
    ])

    if (sourceClasses.length === 0) {
      return { success: false, error: 'The selected source year has no classes to copy' }
    }

    // Skip names that already exist in the target year so this can be run safely
    // more than once without creating duplicates.
    const existingNames = new Set(targetClasses.map((c) => c.name.trim().toLowerCase()))
    const toCreate = sourceClasses.filter(
      (c) => !existingNames.has(c.name.trim().toLowerCase())
    )

    if (toCreate.length === 0) {
      return { success: false, error: 'All classes from that year already exist in this year' }
    }

    await db.classRoom.createMany({
      data: toCreate.map((c) => ({
        name: c.name,
        description: c.description,
        capacity: c.capacity,
        order: c.order,
        academicYearId: toYearId,
      })),
    })

    await logAudit({
      userId: session.user.id,
      action: 'class.cloned',
      auditableType: 'AcademicYear',
      auditableId: toYearId,
      description: `Cloned ${toCreate.length} class(es) from year ${fromYearId}`,
    })

    revalidatePath('/admin/classes')
    return { success: true, created: toCreate.length }
  } catch (error) {
    return { success: false, error: 'Failed to clone classes' }
  }
}

export async function assignTeachers(classId: string, formData: FormData) {
  try {
    const session = await auth()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    const teacherIds = formData.getAll('teacherIds').map(String).filter(Boolean)
    const primaryTeacherId = (formData.get('primaryTeacherId') as string) || null

    if (teacherIds.length === 0) {
      return { success: false, error: 'No teachers selected' }
    }

    if (primaryTeacherId && !teacherIds.includes(primaryTeacherId)) {
      return { success: false, error: 'Primary teacher must be one of the selected teachers' }
    }

    // Use transaction to ensure consistency
    await db.$transaction(async (tx) => {
      // Delete all existing ClassTeacher records for this class
      await tx.classTeacher.deleteMany({
        where: { classId },
      })

      // Create new ClassTeacher records
      for (const teacherId of teacherIds) {
        await tx.classTeacher.create({
          data: {
            classId,
            userId: teacherId,
            isPrimary: teacherId === primaryTeacherId,
          },
        })
      }
    })

    await logAudit({
      userId: session.user.id,
      action: 'class.teachers_assigned',
      auditableType: 'ClassRoom',
      auditableId: classId,
      description: `Assigned ${teacherIds.length} teacher(s) to class`,
    })

    revalidatePath(`/admin/classes/${classId}`)
    revalidatePath(`/admin/classes/${classId}/edit`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to assign teachers' }
  }
}
