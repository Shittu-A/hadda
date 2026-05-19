import { db } from '@/lib/db'
import { updateClass, assignTeachers } from '@/lib/actions/classes'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export default async function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const classroom = await db.classRoom.findUnique({
    where: { id },
    include: { teachers: true },
  })

  if (!classroom) notFound()

  const [academicYears, allTeachers] = await Promise.all([
    db.academicYear.findMany({ orderBy: { startDate: 'desc' } }),
    db.user.findMany({
      where: { role: { in: ['teacher', 'admin'] }, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const selectedTeacherIds = new Set(classroom.teachers.map((t) => t.userId))
  const primaryTeacherId = classroom.teachers.find((t) => t.isPrimary)?.userId

  async function handleUpdate(formData: FormData) {
    'use server'
    const result = await updateClass(id, formData)
    if (result.success) redirect('/admin/classes')
  }

  async function handleAssign(formData: FormData) {
    'use server'
    await assignTeachers(id, formData)
    redirect(`/admin/classes/${id}`)
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl space-y-6">
      <div>
        <Link href={`/admin/classes/${id}`} className="text-coffee-500 text-sm hover:text-coffee-700">
          ← Back to Class
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-coffee-900 mt-2">Edit: {classroom.name}</h1>
      </div>

      {/* Class details */}
      <form action={handleUpdate} className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold text-coffee-800 mb-2">Class Details</h2>

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Academic Year *</label>
          <select
            name="academicYearId"
            required
            defaultValue={classroom.academicYearId}
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}{y.isCurrent ? ' (Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Class Name *</label>
          <input
            name="name"
            required
            defaultValue={classroom.name}
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Description</label>
          <textarea
            name="description"
            rows={2}
            defaultValue={classroom.description ?? ''}
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Capacity</label>
            <input
              name="capacity"
              type="number"
              min={1}
              defaultValue={classroom.capacity ?? ''}
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Display Order</label>
            <input
              name="order"
              type="number"
              min={0}
              defaultValue={classroom.order}
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-1">
          <Link
            href={`/admin/classes/${id}`}
            className="w-full sm:w-auto text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50"
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

      {/* Teacher assignment */}
      <form action={handleAssign} className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold text-coffee-800 mb-2">Assign Teachers</h2>
        <p className="text-xs text-coffee-500">Check teachers to assign. Select the primary teacher with the radio button.</p>

        {allTeachers.length === 0 ? (
          <p className="text-coffee-400 text-sm">No active teachers available.</p>
        ) : (
          <div className="space-y-2">
            {allTeachers.map((teacher) => {
              const checked = selectedTeacherIds.has(teacher.id)
              return (
                <div key={teacher.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-coffee-100 rounded-lg">
                  <input
                    type="checkbox"
                    name="teacherIds"
                    value={teacher.id}
                    defaultChecked={checked}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-coffee-900">{teacher.name}</p>
                    <p className="text-xs text-coffee-500 break-words">{teacher.email} · {teacher.role}</p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-coffee-500 whitespace-nowrap">
                    <input
                      type="radio"
                      name="primaryTeacherId"
                      value={teacher.id}
                      defaultChecked={teacher.id === primaryTeacherId}
                      className="w-3.5 h-3.5"
                    />
                    Primary
                  </label>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-1">
          <Link
            href={`/admin/classes/${id}`}
            className="w-full sm:w-auto text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="w-full sm:w-auto bg-coffee-700 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-600 transition-colors"
          >
            Save Teachers
          </button>
        </div>
      </form>
    </div>
  )
}
