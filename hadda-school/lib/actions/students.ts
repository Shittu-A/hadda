'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { generateAdmissionNumber } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const EnrollSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().optional(),
  enrollmentDate: z.string().min(1, 'Enrollment date is required'),
  address: z.string().optional(),
  academicYearId: z.string().min(1, 'Academic year is required'),
  currentClassId: z.string().optional(),
  guardianName: z.string().min(1, 'Guardian name is required'),
  guardianPhone: z.string().min(1, 'Guardian phone is required'),
  guardianEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  guardianRelationship: z.enum(['Father', 'Mother', 'Guardian']),
})

const UpdateStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  currentClassId: z.string().optional(),
  status: z.enum(['active', 'promoted', 'graduated', 'withdrawn', 'transferred']),
})

export async function enrollStudent(formData: FormData) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const raw = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      dateOfBirth: formData.get('dateOfBirth') || undefined,
      enrollmentDate: formData.get('enrollmentDate'),
      address: formData.get('address') || undefined,
      academicYearId: formData.get('academicYearId'),
      currentClassId: formData.get('currentClassId') || undefined,
      guardianName: formData.get('guardianName'),
      guardianPhone: formData.get('guardianPhone'),
      guardianEmail: formData.get('guardianEmail') || undefined,
      guardianRelationship: formData.get('guardianRelationship'),
    }

    const data = EnrollSchema.parse(raw)

    const year = new Date().getFullYear()
    const count = await db.student.count()
    const admissionNumber = generateAdmissionNumber(year, count + 1)

    const student = await db.student.create({
      data: {
        admissionNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        enrollmentDate: new Date(data.enrollmentDate),
        address: data.address || null,
        academicYearId: data.academicYearId,
        currentClassId: data.currentClassId || null,
        guardians: {
          create: {
            name: data.guardianName,
            phone: data.guardianPhone,
            email: data.guardianEmail || null,
            relationship: data.guardianRelationship,
            isPrimary: true,
          },
        },
      },
    })

    await logAudit({
      userId: session.user.id,
      action: 'student.enrolled',
      auditableType: 'Student',
      auditableId: student.id,
      description: `Enrolled student: ${data.firstName} ${data.lastName} (${admissionNumber})`,
    })

    revalidatePath('/admin/students')
    return { success: true, studentId: student.id }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to enroll student' }
  }
}

export async function updateStudent(id: string, formData: FormData) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const raw = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      dateOfBirth: formData.get('dateOfBirth') || undefined,
      address: formData.get('address') || undefined,
      currentClassId: formData.get('currentClassId') || undefined,
      status: formData.get('status'),
    }

    const data = UpdateStudentSchema.parse(raw)

    const student = await db.student.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address || null,
        currentClassId: data.currentClassId || null,
        status: data.status,
      },
    })

    await logAudit({
      userId: session.user.id,
      action: 'student.updated',
      auditableType: 'Student',
      auditableId: id,
      description: `Updated student: ${student.firstName} ${student.lastName}`,
    })

    revalidatePath('/admin/students')
    revalidatePath(`/admin/students/${id}`)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to update student' }
  }
}

export async function deleteStudent(id: string) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const student = await db.student.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'withdrawn' },
    })

    await logAudit({
      userId: session.user.id,
      action: 'student.deleted',
      auditableType: 'Student',
      auditableId: id,
      description: `Soft-deleted student: ${student.firstName} ${student.lastName}`,
    })

    revalidatePath('/admin/students')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete student' }
  }
}
