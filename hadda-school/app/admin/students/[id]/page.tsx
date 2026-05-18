import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { deleteStudent } from '@/lib/actions/students'
import { redirect } from 'next/navigation'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  promoted: 'info',
  graduated: 'info',
  withdrawn: 'danger',
  transferred: 'neutral',
}

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const student = await db.student.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      currentClass: true,
      academicYear: true,
      guardians: true,
      feePayments: {
        include: { feeStructure: true },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      },
      memorizationLogs: {
        include: { surahFrom: true, surahTo: true },
        orderBy: { logDate: 'desc' },
        take: 5,
      },
    },
  })

  if (!student) notFound()

  async function handleDelete() {
    'use server'
    await deleteStudent(params.id)
    redirect('/admin/students')
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <Link href="/admin/students" className="text-coffee-500 text-sm hover:text-coffee-700">
            ← Back to Students
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-coffee-900 mt-2">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-coffee-500 font-mono text-sm mt-0.5">{student.admissionNumber}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={STATUS_VARIANT[student.status] ?? 'neutral'}>{student.status}</Badge>
          <Link
            href={`/admin/students/${student.id}/edit`}
            className="w-full sm:w-auto text-center border border-coffee-200 text-coffee-700 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-coffee-50"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Info */}
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
            <h2 className="font-semibold text-coffee-800 mb-4">Student Information</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-coffee-500">Date of Birth</dt>
                <dd className="text-coffee-900 font-medium">
                  {student.dateOfBirth ? formatDate(student.dateOfBirth) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-coffee-500">Enrollment Date</dt>
                <dd className="text-coffee-900 font-medium">{formatDate(student.enrollmentDate)}</dd>
              </div>
              <div>
                <dt className="text-coffee-500">Academic Year</dt>
                <dd className="text-coffee-900 font-medium">{student.academicYear.name}</dd>
              </div>
              <div>
                <dt className="text-coffee-500">Class</dt>
                <dd className="text-coffee-900 font-medium">{student.currentClass?.name ?? 'Unassigned'}</dd>
              </div>
              {student.address && (
                <div className="col-span-2">
                  <dt className="text-coffee-500">Address</dt>
                  <dd className="text-coffee-900 font-medium">{student.address}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Guardians */}
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
            <h2 className="font-semibold text-coffee-800 mb-4">Guardians</h2>
            <div className="space-y-3">
              {student.guardians.map((g) => (
                <div key={g.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3 bg-coffee-50 rounded-lg">
                  <div>
                    <p className="font-medium text-coffee-900 text-sm">{g.name}</p>
                    <p className="text-coffee-500 text-xs">{g.relationship}{g.isPrimary ? ' · Primary' : ''}</p>
                  </div>
                  <div className="text-left sm:text-right text-xs text-coffee-600">
                    {g.phone && <p>{g.phone}</p>}
                    {g.email && <p>{g.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payments */}
          {student.feePayments.length > 0 && (
            <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5 overflow-x-auto">
              <h2 className="font-semibold text-coffee-800 mb-4">Recent Payments</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-coffee-100">
                    <th className="text-left pb-2 text-coffee-500 font-medium">Fee</th>
                    <th className="text-left pb-2 text-coffee-500 font-medium">Date</th>
                    <th className="text-right pb-2 text-coffee-500 font-medium">Amount</th>
                    <th className="text-left pb-2 text-coffee-500 font-medium">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-50">
                  {student.feePayments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 text-coffee-900">{p.feeStructure.name}</td>
                      <td className="py-2 text-coffee-600">{formatDate(p.paymentDate)}</td>
                      <td className="py-2 text-coffee-900 text-right font-medium">
                        {formatCurrency(Number(p.amountPaid))}
                      </td>
                      <td className="py-2 text-coffee-500 capitalize">{p.paymentMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recent Memorization */}
          {student.memorizationLogs.length > 0 && (
            <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
              <h2 className="font-semibold text-coffee-800 mb-4">Recent Memorization</h2>
              <div className="space-y-2">
                {student.memorizationLogs.map((log) => (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-coffee-50 rounded-lg text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-coffee-900 capitalize">{log.type}</span>
                      <span className="text-coffee-600 ml-2 break-words">
                        {log.surahFrom.nameEnglish} {log.ayahFrom} → {log.surahTo.nameEnglish} {log.ayahTo}
                      </span>
                    </div>
                    <div className="text-left sm:text-right">
                      <Badge
                        variant={
                          log.quality === 'excellent' ? 'success'
                          : log.quality === 'good' ? 'info'
                          : log.quality === 'average' ? 'warning'
                          : 'danger'
                        }
                      >
                        {log.quality}
                      </Badge>
                      <p className="text-coffee-400 text-xs mt-1">{formatDate(log.logDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5">
            <h2 className="font-semibold text-coffee-800 mb-3">Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/admin/students/${student.id}/edit`}
                className="block w-full text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
              >
                Edit Student
              </Link>
              <Link
                href={`/admin/fees/payments?studentId=${student.id}`}
                className="block w-full text-center bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
              >
                Record Payment
              </Link>
            </div>
          </div>

          {student.status === 'active' && (
            <div className="bg-white border border-red-100 rounded-xl p-4 sm:p-5">
              <h2 className="font-semibold text-red-700 mb-3">Danger Zone</h2>
              <p className="text-xs text-coffee-500 mb-3">
                Withdrawing a student will mark them as withdrawn and remove them from class rosters.
              </p>
              <form action={handleDelete}>
                <button
                  type="submit"
                  className="w-full bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Withdraw Student
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
