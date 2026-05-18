import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { updateStudent } from '@/lib/actions/students'

export default async function EditStudentPage({ params }: { params: { id: string } }) {
  const [student, classes] = await Promise.all([
    db.student.findFirst({
      where: { id: params.id, deletedAt: null },
      include: { currentClass: true, academicYear: true },
    }),
    db.classRoom.findMany({
      include: { academicYear: true },
      orderBy: [{ academicYear: { startDate: 'desc' } }, { order: 'asc' }],
    }),
  ])

  if (!student) notFound()

  async function handleUpdate(formData: FormData) {
    'use server'
    const result = await updateStudent(params.id, formData)
    if (result.success) redirect(`/admin/students/${params.id}`)
  }

  const dobValue = student.dateOfBirth
    ? new Date(student.dateOfBirth).toISOString().split('T')[0]
    : ''

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="mb-6">
        <Link href={`/admin/students/${student.id}`} className="text-coffee-500 text-sm hover:text-coffee-700">
          ← Back to Student
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-coffee-900 mt-2">
          Edit: {student.firstName} {student.lastName}
        </h1>
        <p className="text-coffee-400 font-mono text-sm">{student.admissionNumber}</p>
      </div>

      <form action={handleUpdate} className="space-y-6 bg-white border border-coffee-200 rounded-xl p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">First Name *</label>
            <input
              name="firstName"
              required
              defaultValue={student.firstName}
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Last Name *</label>
            <input
              name="lastName"
              required
              defaultValue={student.lastName}
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              defaultValue={dobValue}
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Status *</label>
            <select
              name="status"
              defaultValue={student.status}
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="active">Active</option>
              <option value="promoted">Promoted</option>
              <option value="graduated">Graduated</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="transferred">Transferred</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Class</label>
            <select
              name="currentClassId"
              defaultValue={student.currentClassId ?? ''}
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value="">Unassigned</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.academicYear.name})
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-coffee-700 mb-1">Address</label>
            <textarea
              name="address"
              rows={2}
              defaultValue={student.address ?? ''}
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <Link
            href={`/admin/students/${student.id}`}
            className="w-full sm:w-auto text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
