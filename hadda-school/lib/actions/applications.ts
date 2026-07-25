'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { generateAdmissionNumber } from '@/lib/utils'
import { getSupabase, ensureBucket } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const SubmitApplicationSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  gender: z.enum(['M', 'F'], { error: 'Gender is required' }),
  maritalStatus: z.enum(['Single', 'Married'], { error: 'Marital status is required' }),
  dateOfBirth: z.string().optional(),
  residence: z.string().min(1, 'Place of residence is required'),
  phone: z.string().min(1, 'Phone number is required'),
  hizbMemorized: z.string().optional(),
  formerSchool: z.string().optional(),
  reasonForLeaving: z.string().optional(),
  guardianName: z.string().min(1, 'Guardian name is required'),
  guardianPhone: z.string().min(1, 'Guardian phone is required'),
})

/**
 * Public server action — no auth. Called directly from the online application form.
 * Uploads the passport photo (if provided) server-side since the auth-gated /api/upload
 * route is not reachable by anonymous applicants.
 */
export async function submitApplication(formData: FormData) {
  try {
    if (formData.get('agree') !== 'on') {
      return { success: false, error: 'You must agree to the undertaking to submit your application.' }
    }

    const raw = {
      fullName: formData.get('fullName'),
      gender: formData.get('gender'),
      maritalStatus: formData.get('maritalStatus'),
      dateOfBirth: formData.get('dateOfBirth') || undefined,
      residence: formData.get('residence'),
      phone: formData.get('phone'),
      hizbMemorized: formData.get('hizbMemorized') || undefined,
      formerSchool: formData.get('formerSchool') || undefined,
      reasonForLeaving: formData.get('reasonForLeaving') || undefined,
      guardianName: formData.get('guardianName'),
      guardianPhone: formData.get('guardianPhone'),
    }

    const data = SubmitApplicationSchema.parse(raw)

    let photoUrl: string | null = null
    const photo = formData.get('photo')
    if (photo instanceof File && photo.size > 0) {
      try {
        await ensureBucket('applicant-photos', {
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          fileSizeLimit: '5MB',
        })
        const ext = photo.name.split('.').pop() || 'jpg'
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const bytes = await photo.arrayBuffer()
        const supabase = getSupabase()
        const { error } = await supabase.storage.from('applicant-photos').upload(path, bytes, {
          contentType: photo.type,
          upsert: false,
        })
        if (error) throw new Error(error.message)
        const { data: pub } = supabase.storage.from('applicant-photos').getPublicUrl(path)
        photoUrl = pub.publicUrl
      } catch (e) {
        return { success: false, error: 'Could not upload passport photograph. Please try again.' }
      }
    }

    const applicant = await db.applicant.create({
      data: {
        fullName: data.fullName,
        gender: data.gender,
        maritalStatus: data.maritalStatus,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        residence: data.residence,
        phone: data.phone,
        hizbMemorized: data.hizbMemorized ? parseInt(data.hizbMemorized, 10) || null : null,
        formerSchool: data.formerSchool || null,
        reasonForLeaving: data.reasonForLeaving || null,
        guardianName: data.guardianName,
        guardianPhone: data.guardianPhone,
        photoUrl,
        status: 'submitted',
      },
    })

    revalidatePath('/admin/applications')
    return { success: true, applicantId: applicant.id }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to submit application. Please check your details and try again.' }
  }
}

const StatusUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['submitted', 'shortlisted', 'interviewed', 'rejected']),
  interviewNotes: z.string().optional(),
})

export async function updateApplicationStatus(formData: FormData) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
      return { success: false, error: 'Unauthorized' }
    }

    const raw = {
      id: formData.get('id'),
      status: formData.get('status'),
      interviewNotes: formData.get('interviewNotes') || undefined,
    }
    const data = StatusUpdateSchema.parse(raw)

    const applicant = await db.applicant.update({
      where: { id: data.id },
      data: {
        status: data.status,
        ...(data.interviewNotes !== undefined ? { interviewNotes: data.interviewNotes } : {}),
        reviewedById: session.user.id,
      },
    })

    await logAudit({
      userId: session.user.id,
      action: `application.${data.status}`,
      auditableType: 'Applicant',
      auditableId: applicant.id,
      description: `Application for ${applicant.fullName} marked as ${data.status}`,
    })

    revalidatePath('/admin/applications')
    revalidatePath(`/admin/applications/${data.id}`)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to update application' }
  }
}

/**
 * Removes an application from the admin list for good. The Student record an
 * enrolled applicant produced is left alone — only the application row goes.
 */
export async function deleteApplication(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) return

  const id = formData.get('id') as string
  if (!id) return

  const applicant = await db.applicant.findUnique({ where: { id }, select: { fullName: true } })
  if (!applicant) return

  await db.applicant.delete({ where: { id } })

  await logAudit({
    userId: session.user.id,
    action: 'application.deleted',
    auditableType: 'Applicant',
    auditableId: id,
    description: `Deleted application for ${applicant.fullName}`,
  })

  revalidatePath('/admin/applications')
}

/**
 * Marks (or un-marks) an application form as printed. Opening the PDF does not
 * set this — an admin ticks it deliberately once the paper copy exists.
 */
export async function toggleApplicationFormPrinted(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) return

  const id = formData.get('id') as string
  if (!id) return

  const applicant = await db.applicant.findUnique({
    where: { id },
    select: { fullName: true, applicationFormPrintedAt: true },
  })
  if (!applicant) return

  const printed = applicant.applicationFormPrintedAt === null

  await db.applicant.update({
    where: { id },
    data: {
      applicationFormPrintedAt: printed ? new Date() : null,
      applicationFormPrintedById: printed ? session.user.id : null,
    },
  })

  await logAudit({
    userId: session.user.id,
    action: printed ? 'application.form_printed' : 'application.form_print_cleared',
    auditableType: 'Applicant',
    auditableId: id,
    description: `Application form for ${applicant.fullName} marked as ${printed ? 'printed' : 'not printed'}`,
  })

  revalidatePath('/admin/applications')
  revalidatePath(`/admin/applications/${id}`)
}

const AcceptEnrollSchema = z.object({
  id: z.string().min(1),
  classId: z.string().min(1, 'Class is required'),
  academicYearId: z.string().min(1, 'Academic year is required'),
})

/**
 * Accepts an applicant and enrolls them as a real Student, reusing the same
 * admission-number generation scheme as lib/actions/students.ts (HMS-<year>-<seq>).
 */
export async function acceptAndEnroll(formData: FormData) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
      return { success: false, error: 'Unauthorized' }
    }

    const raw = {
      id: formData.get('id'),
      classId: formData.get('classId'),
      academicYearId: formData.get('academicYearId'),
    }
    const data = AcceptEnrollSchema.parse(raw)

    const applicant = await db.applicant.findUnique({ where: { id: data.id } })
    if (!applicant) return { success: false, error: 'Application not found' }
    if (applicant.studentId) return { success: false, error: 'This applicant has already been enrolled.' }

    const nameParts = applicant.fullName.trim().split(/\s+/)
    const firstName = nameParts[0] || applicant.fullName
    const lastName = nameParts.slice(1).join(' ')

    const year = new Date().getFullYear()
    const count = await db.student.count()
    const admissionNumber = generateAdmissionNumber(year, count + 1)

    const student = await db.student.create({
      data: {
        admissionNumber,
        firstName,
        lastName,
        gender: applicant.gender || null,
        dateOfBirth: applicant.dateOfBirth ?? null,
        enrollmentDate: new Date(),
        address: applicant.residence || null,
        photoUrl: applicant.photoUrl || null,
        currentClassId: data.classId,
        academicYearId: data.academicYearId,
        status: 'active',
        ...(applicant.guardianName
          ? {
              guardians: {
                create: {
                  name: applicant.guardianName,
                  phone: applicant.guardianPhone || null,
                  relationship: 'Guardian',
                  isPrimary: true,
                },
              },
            }
          : {}),
      },
    })

    await db.applicant.update({
      where: { id: applicant.id },
      data: {
        status: 'enrolled',
        assignedClassId: data.classId,
        academicYearId: data.academicYearId,
        admissionNumber,
        studentId: student.id,
        reviewedById: session.user.id,
      },
    })

    await logAudit({
      userId: session.user.id,
      action: 'application.enrolled',
      auditableType: 'Student',
      auditableId: student.id,
      description: `Enrolled applicant ${applicant.fullName} as student (${admissionNumber})`,
    })

    revalidatePath('/admin/applications')
    revalidatePath(`/admin/applications/${applicant.id}`)
    revalidatePath('/admin/students')
    return { success: true, studentId: student.id }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: error instanceof Error ? error.message : 'Failed to enroll applicant' }
  }
}
