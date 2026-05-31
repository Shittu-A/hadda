import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { updateStudent } from '@/lib/actions/students'
import EditStudentForm from './EditStudentForm'

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [student, classes] = await Promise.all([
    db.student.findFirst({
      where: { id, deletedAt: null },
      include: { currentClass: true, academicYear: true, guardians: true },
    }),
    db.classRoom.findMany({
      include: { academicYear: true },
      orderBy: [{ academicYear: { startDate: 'desc' } }, { order: 'asc' }],
    }),
  ])

  if (!student) notFound()

  async function handleUpdate(formData: FormData) {
    'use server'
    const result = await updateStudent(id, formData)
    if (result.success) redirect(`/admin/students/${id}`)
  }

  return <EditStudentForm student={student} classes={classes} action={handleUpdate} />
}
