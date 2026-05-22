import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { upsertTeacherProfile } from '@/lib/actions/teacher-profiles'
import ProfileForm from './ProfileForm'

export default async function TeacherProfileEditPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params

  const teacher = await db.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  })

  if (!teacher || teacher.role !== 'teacher') notFound()

  async function handleSave(formData: FormData) {
    'use server'
    const result = await upsertTeacherProfile(userId, formData)
    if (result.success) redirect('/admin/teacher-profiles')
  }

  return (
    <ProfileForm
      teacherName={teacher.name}
      teacherId={teacher.id}
      existingProfile={teacher.profile}
      action={handleSave}
    />
  )
}
