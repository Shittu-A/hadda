import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import PrintedToggle from '@/components/ui/PrintedToggle'
import ActionForm from '@/components/ui/ActionForm'
import SubmitButton from '@/components/ui/SubmitButton'
import { formatDate } from '@/lib/utils'
import { deleteApplication, toggleApplicationFormPrinted } from '@/lib/actions/applications'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  submitted: 'info',
  shortlisted: 'warning',
  interviewed: 'warning',
  accepted: 'success',
  rejected: 'danger',
  enrolled: 'success',
}

async function handleDelete(formData: FormData) {
  'use server'
  await deleteApplication(formData)
  return { success: true }
}

const STATUSES = ['submitted', 'shortlisted', 'interviewed', 'accepted', 'rejected', 'enrolled'] as const

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const sp = await searchParams
  const filter = sp.status && STATUSES.includes(sp.status as any) ? sp.status : 'all'

  const applicants = await db.applicant.findMany({
    where: filter === 'all' ? {} : { status: filter as any },
    orderBy: { createdAt: 'desc' },
  })

  const counts = await db.applicant.groupBy({
    by: ['status'],
    _count: { status: true },
  })
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count.status]))
  const totalCount = counts.reduce((sum, c) => sum + c._count.status, 0)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Applications</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Review online admission applications</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-coffee-200 overflow-x-auto">
        <a
          href="?status=all"
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium capitalize transition-colors whitespace-nowrap ${
            filter === 'all'
              ? 'border-b-2 border-coffee-900 text-coffee-900'
              : 'text-coffee-500 hover:text-coffee-700'
          }`}
        >
          All ({totalCount})
        </a>
        {STATUSES.map((s) => (
          <a
            key={s}
            href={`?status=${s}`}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium capitalize transition-colors whitespace-nowrap ${
              filter === s
                ? 'border-b-2 border-coffee-900 text-coffee-900'
                : 'text-coffee-500 hover:text-coffee-700'
            }`}
          >
            {s} ({countMap[s] ?? 0})
          </a>
        ))}
      </div>

      {applicants.length === 0 ? (
        <div className="text-center py-16 text-coffee-400">No applications found.</div>
      ) : (
        <div className="bg-white border border-coffee-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-coffee-50 border-b border-coffee-200">
              <tr>
                <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Name</th>
                <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Gender</th>
                <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden md:table-cell">Phone</th>
                <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden lg:table-cell">Guardian</th>
                <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold hidden sm:table-cell">Submitted</th>
                <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Status</th>
                <th className="text-left px-3 sm:px-4 py-3 text-coffee-700 font-semibold">Form</th>
                <th className="px-3 sm:px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-100">
              {applicants.map((a) => (
                <tr key={a.id} className="hover:bg-coffee-50 transition-colors">
                  <td className="px-3 sm:px-4 py-3">
                    <Link href={`/admin/applications/${a.id}`} className="font-medium text-coffee-900 hover:text-coffee-600 transition-colors">
                      {a.fullName}
                    </Link>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-coffee-600 text-xs hidden sm:table-cell">
                    {a.gender === 'M' ? 'Male' : a.gender === 'F' ? 'Female' : '—'}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-coffee-600 text-xs hidden md:table-cell">{a.phone || '—'}</td>
                  <td className="px-3 sm:px-4 py-3 text-coffee-600 text-xs hidden lg:table-cell">{a.guardianName || '—'}</td>
                  <td className="px-3 sm:px-4 py-3 text-coffee-500 text-xs hidden sm:table-cell">{formatDate(a.createdAt)}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <Badge variant={STATUS_VARIANT[a.status] ?? 'neutral'}>{a.status}</Badge>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <PrintedToggle
                      action={toggleApplicationFormPrinted}
                      id={a.id}
                      printedAt={a.applicationFormPrintedAt}
                    />
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/applications/${a.id}`} className="text-xs text-coffee-500 hover:text-coffee-800 transition-colors whitespace-nowrap">
                        Review →
                      </Link>
                      <ActionForm action={handleDelete} successMessage="Application deleted.">
                        <input type="hidden" name="id" value={a.id} />
                        <SubmitButton
                          pendingText="Deleting…"
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </SubmitButton>
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
