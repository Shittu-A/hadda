import { db } from '@/lib/db'
import { createClass } from '@/lib/actions/classes'
import Link from 'next/link'
import { redirect } from 'next/navigation'

async function handleSubmit(formData: FormData) {
  'use server'
  const result = await createClass(formData)
  if (result.success) redirect('/admin/classes')
}

export default async function NewClassPage() {
  const [academicYears, currentYear] = await Promise.all([
    db.academicYear.findMany({ orderBy: { startDate: 'desc' } }),
    db.academicYear.findFirst({ where: { isCurrent: true } }),
  ])

  return (
    <div className="p-4 sm:p-6 max-w-xl">
      <div className="mb-6">
        <Link href="/admin/classes" className="text-coffee-500 text-sm hover:text-coffee-700">
          ← Back to Classes
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-coffee-900 mt-2">Create New Class</h1>
      </div>

      <form action={handleSubmit} className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-6 space-y-4">
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
          <label className="block text-sm font-medium text-coffee-700 mb-1">Class Name *</label>
          <input
            name="name"
            required
            maxLength={100}
            placeholder="e.g. Hifz Level 1"
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Description</label>
          <textarea
            name="description"
            rows={2}
            maxLength={500}
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
              placeholder="Optional"
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Display Order</label>
            <input
              name="order"
              type="number"
              min={0}
              defaultValue={0}
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <Link
            href="/admin/classes"
            className="w-full sm:w-auto text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
          >
            Create Class
          </button>
        </div>
      </form>
    </div>
  )
}
