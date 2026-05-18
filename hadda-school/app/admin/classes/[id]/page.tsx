import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'

export default async function ClassDetailPage({ params }: { params: { id: string } }) {
  const classroom = await db.classRoom.findUnique({
    where: { id: params.id },
    include: {
      academicYear: true,
      teachers: { include: { user: true } },
      students: {
        where: { deletedAt: null, status: 'active' },
        orderBy: [{ firstName: 'asc' }],
      },
    },
  })

  if (!classroom) notFound()

  const primaryTeacher = classroom.teachers.find((t) => t.isPrimary)
  const isFull = classroom.capacity != null && classroom.students.length >= classroom.capacity

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <Link href="/admin/classes" className="text-coffee-500 text-sm hover:text-coffee-700">
            ← Back to Classes
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-coffee-900 mt-2">{classroom.name}</h1>
          {classroom.description && <p className="text-coffee-500 text-sm">{classroom.description}</p>}
        </div>
        <Link
          href={`/admin/classes/${classroom.id}/edit`}
          className="w-full sm:w-auto text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Academic Year', value: classroom.academicYear.name },
          {
            label: 'Students',
            value: classroom.capacity
              ? `${classroom.students.length} / ${classroom.capacity}`
              : String(classroom.students.length),
          },
          { label: 'Primary Teacher', value: primaryTeacher?.user.name ?? 'None' },
          { label: 'Display Order', value: String(classroom.order) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-coffee-500 mb-1">{s.label}</p>
              <p className="text-lg font-semibold text-coffee-900">{s.value}</p>
              {s.label === 'Students' && isFull && (
                <Badge variant="danger" className="mt-1">Full</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Teachers */}
      <Card>
        <CardContent className="pt-4 sm:pt-5">
          <h2 className="font-semibold text-coffee-800 mb-3">
            Assigned Teachers ({classroom.teachers.length})
          </h2>
          {classroom.teachers.length === 0 ? (
            <p className="text-coffee-400 text-sm">No teachers assigned.</p>
          ) : (
            <div className="space-y-2">
              {classroom.teachers.map((t) => (
                <div key={t.userId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-coffee-50 rounded-lg">
                  <p className="text-sm font-medium text-coffee-900">{t.user.name}</p>
                  {t.isPrimary && <Badge variant="info">Primary</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Roster */}
      <Card>
        <CardContent className="pt-4 sm:pt-5 overflow-x-auto">
          <h2 className="font-semibold text-coffee-800 mb-3">
            Student Roster ({classroom.students.length})
          </h2>
          {classroom.students.length === 0 ? (
            <p className="text-coffee-400 text-sm">No active students enrolled.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-coffee-100">
                <tr>
                  <th className="text-left pb-2 text-coffee-500 font-medium">Admission No.</th>
                  <th className="text-left pb-2 text-coffee-500 font-medium">Name</th>
                  <th className="text-left pb-2 text-coffee-500 font-medium hidden sm:table-cell">Enrolled</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-50">
                {classroom.students.map((s) => (
                  <tr key={s.id} className="hover:bg-coffee-50">
                    <td className="py-2.5 font-mono text-coffee-600 text-xs">{s.admissionNumber}</td>
                    <td className="py-2.5 font-medium text-coffee-900">{s.firstName} {s.lastName}</td>
                    <td className="py-2.5 text-coffee-500 hidden sm:table-cell">{formatDate(s.enrollmentDate)}</td>
                    <td className="py-2.5 text-right">
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="text-xs text-coffee-600 hover:text-coffee-900 font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
