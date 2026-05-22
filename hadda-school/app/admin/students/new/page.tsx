import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { enrollStudent } from '@/lib/actions/students'
import EnrollmentForm from './EnrollmentForm'

export default async function NewStudentPage() {
  const academicYears = await db.academicYear.findMany({ orderBy: { startDate: 'desc' } })
  const currentYear = academicYears.find((y) => y.isCurrent) ?? academicYears[0]

  async function handleEnroll(formData: FormData) {
    'use server'
    const result = await enrollStudent(formData)
    if (result.success) redirect('/admin/students')
  }

  return (
    <EnrollmentForm
      academicYears={academicYears}
      currentYearId={currentYear?.id ?? ''}
      action={handleEnroll}
    />
  )
}
