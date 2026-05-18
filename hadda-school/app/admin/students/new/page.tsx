import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { enrollStudent } from '@/lib/actions/students'
import Link from 'next/link'

export default async function NewStudentPage() {
  const [academicYears, classes] = await Promise.all([
    db.academicYear.findMany({ orderBy: { startDate: 'desc' } }),
    db.classRoom.findMany({
      include: { academicYear: true },
      orderBy: [{ academicYear: { startDate: 'desc' } }, { order: 'asc' }],
    }),
  ])

  const currentYear = academicYears.find((y) => y.isCurrent) ?? academicYears[0]

  async function handleEnroll(formData: FormData) {
    'use server'
    const result = await enrollStudent(formData)
    if (result.success) redirect('/admin/students')
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/students" className="text-coffee-500 text-sm hover:text-coffee-700">
          ← Back to Students
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-coffee-900 mt-2">Enroll New Student</h1>
      </div>

      <form action={handleEnroll} className="space-y-6 bg-white border border-coffee-200 rounded-xl p-4 sm:p-6">
        {/* Student Info */}
        <div>
          <h2 className="text-base font-semibold text-coffee-800 mb-4 pb-2 border-b border-coffee-100">
            Student Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">First Name *</label>
              <input
                name="firstName"
                required
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Last Name *</label>
              <input
                name="lastName"
                required
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Enrollment Date *</label>
              <input
                type="date"
                name="enrollmentDate"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-coffee-700 mb-1">Address</label>
              <textarea
                name="address"
                rows={2}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>
        </div>

        {/* Academic Placement */}
        <div>
          <h2 className="text-base font-semibold text-coffee-800 mb-4 pb-2 border-b border-coffee-100">
            Academic Placement
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Academic Year *</label>
              <select
                name="academicYearId"
                required
                defaultValue={currentYear?.id ?? ''}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="">Select academic year</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}{y.isCurrent ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Class</label>
              <select
                name="currentClassId"
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
          </div>
        </div>

        {/* Guardian Info */}
        <div>
          <h2 className="text-base font-semibold text-coffee-800 mb-4 pb-2 border-b border-coffee-100">
            Primary Guardian
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Guardian Name *</label>
              <input
                name="guardianName"
                required
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Relationship *</label>
              <select
                name="guardianRelationship"
                required
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Phone *</label>
              <input
                name="guardianPhone"
                type="tel"
                required
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Email</label>
              <input
                name="guardianEmail"
                type="email"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <Link
            href="/admin/students"
            className="w-full sm:w-auto text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
          >
            Enroll Student
          </button>
        </div>
      </form>
    </div>
  )
}
