import { db } from '@/lib/db'
import Badge from '@/components/ui/Badge'
import { deleteClass } from '@/lib/actions/classes'
import Link from 'next/link'

async function handleDelete(formData: FormData): Promise<void> {
  'use server'
  const id = formData.get('id') as string
  await deleteClass(id)
}

export default async function ClassesPage() {
  const currentYear = await db.academicYear.findFirst({ where: { isCurrent: true } })

  const classes = await db.classRoom.findMany({
    where: currentYear ? { academicYearId: currentYear.id } : {},
    include: {
      teachers: { include: { user: true } },
      _count: { select: { students: { where: { deletedAt: null, status: 'active' } } } },
    },
    orderBy: { order: 'asc' },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Classes</h1>
          {currentYear && (
            <p className="text-coffee-600 text-sm mt-0.5">{currentYear.name} · {classes.length} classes</p>
          )}
        </div>
        <Link
          href="/admin/classes/new"
          className="bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
        >
          + Add Class
        </Link>
      </div>

      {!currentYear && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          No active academic year set. Please set one in{' '}
          <Link href="/super-admin/academic-years" className="underline">Academic Years</Link>.
        </div>
      )}

      <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-coffee-50 border-b border-coffee-200">
            <tr>
              <th className="text-left px-5 py-3 text-coffee-700 font-semibold">Name</th>
              <th className="text-left px-5 py-3 text-coffee-700 font-semibold">Students</th>
              <th className="text-left px-5 py-3 text-coffee-700 font-semibold">Primary Teacher</th>
              <th className="text-left px-5 py-3 text-coffee-700 font-semibold">Order</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-coffee-100">
            {classes.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-coffee-400">
                  No classes yet.{' '}
                  <Link href="/admin/classes/new" className="text-coffee-600 underline">Create one</Link>.
                </td>
              </tr>
            ) : (
              classes.map((classroom) => {
                const isFull = classroom.capacity != null && classroom._count.students >= classroom.capacity
                const primaryTeacher = classroom.teachers.find((t) => t.isPrimary)?.user.name ?? 'None'

                return (
                  <tr key={classroom.id} className="hover:bg-coffee-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-coffee-900">{classroom.name}</p>
                      {classroom.description && (
                        <p className="text-xs text-coffee-500">{classroom.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-coffee-900">
                        {classroom._count.students}
                        {classroom.capacity ? `/${classroom.capacity}` : ''}
                      </span>
                      {isFull && <Badge variant="danger" className="ml-2">Full</Badge>}
                    </td>
                    <td className="px-5 py-3 text-coffee-600">{primaryTeacher}</td>
                    <td className="px-5 py-3 text-coffee-500">{classroom.order}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/admin/classes/${classroom.id}`}
                          className="text-xs font-medium text-coffee-600 hover:text-coffee-900 border border-coffee-200 rounded-lg px-3 py-1.5 hover:bg-coffee-50 transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/classes/${classroom.id}/edit`}
                          className="text-xs font-medium text-coffee-600 hover:text-coffee-900 border border-coffee-200 rounded-lg px-3 py-1.5 hover:bg-coffee-50 transition-colors"
                        >
                          Edit
                        </Link>
                        {classroom._count.students === 0 && (
                          <form action={handleDelete}>
                            <input type="hidden" name="id" value={classroom.id} />
                            <button
                              type="submit"
                              className="text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
