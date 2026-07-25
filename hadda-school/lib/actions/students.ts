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
  gender: z.enum(['M', 'F'], { error: 'Gender is required' }),
  dateOfBirth: z.string().optional(),
  enrollmentDate: z.string().min(1, 'Enrollment date is required'),
  address: z.string().optional(),
  academicYearId: z.string().min(1, 'Academic year is required'),
  photoUrl: z.string().optional(),
  guardianName: z.string().min(1, 'Guardian name is required'),
  guardianPhone: z.string().min(1, 'Guardian phone is required'),
  guardianEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  guardianRelationship: z.enum(['Father', 'Mother', 'Guardian']),
})

const UpdateStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.enum(['M', 'F']).optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  currentClassId: z.string().optional(),
  status: z.enum(['active', 'promoted', 'graduated', 'withdrawn', 'transferred']),
  photoUrl: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  guardianRelationship: z.enum(['Father', 'Mother', 'Guardian']).optional(),
})

export async function enrollStudent(formData: FormData) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const raw = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      gender: formData.get('gender'),
      dateOfBirth: formData.get('dateOfBirth') || undefined,
      enrollmentDate: formData.get('enrollmentDate'),
      address: formData.get('address') || undefined,
      academicYearId: formData.get('academicYearId'),
      photoUrl: formData.get('photoUrl') || undefined,
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
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        enrollmentDate: new Date(data.enrollmentDate),
        address: data.address || null,
        academicYearId: data.academicYearId,
        photoUrl: data.photoUrl || null,
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
      gender: formData.get('gender') || undefined,
      dateOfBirth: formData.get('dateOfBirth') || undefined,
      address: formData.get('address') || undefined,
      currentClassId: formData.get('currentClassId') || undefined,
      status: formData.get('status'),
      photoUrl: formData.get('photoUrl') || undefined,
      guardianName: formData.get('guardianName') || undefined,
      guardianPhone: formData.get('guardianPhone') || undefined,
      guardianEmail: formData.get('guardianEmail') || undefined,
      guardianRelationship: formData.get('guardianRelationship') || undefined,
    }

    const data = UpdateStudentSchema.parse(raw)

    const student = await db.student.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender ?? null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address || null,
        currentClassId: data.currentClassId || null,
        status: data.status,
        ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),
      },
    })

    if (data.guardianName) {
      const primary = await db.guardian.findFirst({ where: { studentId: id, isPrimary: true } })
      if (primary) {
        await db.guardian.update({
          where: { id: primary.id },
          data: {
            name: data.guardianName,
            phone: data.guardianPhone ?? primary.phone,
            email: data.guardianEmail || null,
            relationship: data.guardianRelationship ?? primary.relationship,
          },
        })
      } else {
        await db.guardian.create({
          data: {
            studentId: id,
            name: data.guardianName,
            phone: data.guardianPhone ?? '',
            email: data.guardianEmail || null,
            relationship: data.guardianRelationship ?? 'Guardian',
            isPrimary: true,
          },
        })
      }
    }

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

/**
 * Marks (or un-marks) a student's admission letter as printed. Mirrors
 * toggleApplicationFormPrinted in lib/actions/applications.ts — opening the PDF
 * does not set this, an admin ticks it once the paper copy exists.
 */
export async function toggleAdmissionLetterPrinted(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) return

  const id = formData.get('id') as string
  if (!id) return

  const student = await db.student.findUnique({
    where: { id },
    select: { firstName: true, lastName: true, admissionLetterPrintedAt: true },
  })
  if (!student) return

  const printed = student.admissionLetterPrintedAt === null

  await db.student.update({
    where: { id },
    data: {
      admissionLetterPrintedAt: printed ? new Date() : null,
      admissionLetterPrintedById: printed ? session.user.id : null,
    },
  })

  await logAudit({
    userId: session.user.id,
    action: printed ? 'student.admission_letter_printed' : 'student.admission_letter_print_cleared',
    auditableType: 'Student',
    auditableId: id,
    description: `Admission letter for ${student.firstName} ${student.lastName} marked as ${printed ? 'printed' : 'not printed'}`,
  })

  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${id}`)
  revalidatePath('/admin/applications')
}
