import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { createAcademicYear, setCurrentAcademicYear, deleteAcademicYear } from '@/lib/actions/academic-years'
import Badge from '@/components/ui/Badge'

async function handleCreate(formData: FormData): Promise<void> {
  'use server'
  await createAcademicYear(formData)
}

async function handleSetCurrent(formData: FormData): Promise<void> {
  'use server'
  const id = formData.get('id') as string
  await setCurrentAcademicYear(id)
}

async function handleDelete(formData: FormData): Promise<void> {
  'use server'
  const id = formData.get('id') as string
  await deleteAcademicYear(id)
}

export default async function AcademicYearsPage() {
  const [academicYears, studentCountMap] = await Promise.all([
    db.academicYear.findMany({ orderBy: { startDate: 'desc' } }),
    db.student.groupBy({ by: ['academicYearId'], _count: { id: true } }),
  ])

  const countByYear = Object.fromEntries(
    studentCountMap.map((r) => [r.academicYearId, r._count.id])
  )

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Academic Years</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Manage school years and set the active year</p>
      </div>

      {/* Create Form */}
      <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
        <h2 className="text-base font-semibold text-coffee-800 mb-4">Add New Academic Year</h2>
        <form action={handleCreate} className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Name</label>
            <input
              name="name"
              required
              placeholder="e.g. 2025-2026"
              className="border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 w-full sm:w-40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              required
              className="border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 w-full sm:w-auto"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              required
              className="border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 w-full sm:w-auto"
            />
          </div>
          <button
            type="submit"
            className="bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors w-full sm:w-auto"
          >
            Add Year
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-coffee-50 border-b border-coffee-200">
              <tr>
                <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold">Name</th>
                <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Start Date</th>
                <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold hidden sm:table-cell">End Date</th>
                <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold">Students</th>
                <th className="text-left px-4 sm:px-5 py-3 text-coffee-700 font-semibold">Status</th>
                <th className="px-4 sm:px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-100">
              {academicYears.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-coffee-400">
                    No academic years yet.
                  </td>
                </tr>
              ) : (
                academicYears.map((year) => {
                  const count = countByYear[year.id] ?? 0
                  return (
                    <tr key={year.id} className="hover:bg-coffee-50 transition-colors">
                      <td className="px-4 sm:px-5 py-3 font-medium text-coffee-900">{year.name}</td>
                      <td className="px-4 sm:px-5 py-3 text-coffee-600 hidden sm:table-cell text-xs">{formatDate(year.startDate)}</td>
                      <td className="px-4 sm:px-5 py-3 text-coffee-600 hidden sm:table-cell text-xs">{formatDate(year.endDate)}</td>
                      <td className="px-4 sm:px-5 py-3 text-coffee-600">{count}</td>
                      <td className="px-4 sm:px-5 py-3">
                        <Badge variant={year.isCurrent ? 'success' : 'neutral'}>
                          {year.isCurrent ? 'Current' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 justify-end">
                          {!year.isCurrent && (
                            <form action={handleSetCurrent}>
                              <input type="hidden" name="id" value={year.id} />
                              <button
                                type="submit"
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors whitespace-nowrap"
                              >
                                Set Current
                              </button>
                            </form>
                          )}
                          {count === 0 && !year.isCurrent && (
                            <form action={handleDelete}>
                              <input type="hidden" name="id" value={year.id} />
                              <button
                                type="submit"
                                className="text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors whitespace-nowrap"
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
    </div>
  )
}
