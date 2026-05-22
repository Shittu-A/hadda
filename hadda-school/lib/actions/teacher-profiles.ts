'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ProfileSchema = z.object({
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  specialization: z.string().optional(),
  awardTitle: z.string().optional(),
  awardDesc: z.string().optional(),
  videoUrl: z.string().url('Invalid video URL').optional().or(z.literal('')),
})

export async function upsertTeacherProfile(userId: string, formData: FormData) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
      return { success: false, error: 'Unauthorized' }
    }

    const raw = {
      bio: (formData.get('bio') as string) || undefined,
      photoUrl: (formData.get('photoUrl') as string) || undefined,
      specialization: (formData.get('specialization') as string) || undefined,
      awardTitle: (formData.get('awardTitle') as string) || undefined,
      awardDesc: (formData.get('awardDesc') as string) || undefined,
      videoUrl: (formData.get('videoUrl') as string) || undefined,
    }

    const data = ProfileSchema.parse(raw)

    await db.teacherProfile.upsert({
      where: { userId },
      update: {
        bio: data.bio ?? null,
        photoUrl: data.photoUrl ?? null,
        specialization: data.specialization ?? null,
        awardTitle: data.awardTitle ?? null,
        awardDesc: data.awardDesc ?? null,
        videoUrl: data.videoUrl ?? null,
      },
      create: {
        userId,
        bio: data.bio ?? null,
        photoUrl: data.photoUrl ?? null,
        specialization: data.specialization ?? null,
        awardTitle: data.awardTitle ?? null,
        awardDesc: data.awardDesc ?? null,
        videoUrl: data.videoUrl ?? null,
      },
    })

    await logAudit({
      userId: session.user.id,
      action: 'teacher.profile.upserted',
      auditableType: 'User',
      auditableId: userId,
      description: `Upserted teacher profile for user ${userId}`,
    })

    revalidatePath('/admin/teacher-profiles')
    revalidatePath('/teachers')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to save profile' }
  }
}

export async function deleteTeacherProfile(userId: string) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
      return { success: false, error: 'Unauthorized' }
    }

    await db.teacherProfile.delete({ where: { userId } })

    revalidatePath('/admin/teacher-profiles')
    revalidatePath('/teachers')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to delete profile' }
  }
}
