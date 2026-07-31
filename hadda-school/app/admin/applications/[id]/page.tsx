import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Badge from '@/components/ui/Badge'
import PrintedToggle from '@/components/ui/PrintedToggle'
import ActionForm from '@/components/ui/ActionForm'
import SubmitButton from '@/components/ui/SubmitButton'
import { formatDate } from '@/lib/utils'
import {
  updateApplicationStatus,
  acceptAndEnroll,
  deleteApplication,
  toggleApplicationFormPrinted,
} from '@/lib/actions/applications'
import { toggleAdmissionLetterPrinted } from '@/lib/actions/students'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  submitted: 'info',
  shortlisted: 'warning',
  interviewed: 'warning',
  accepted: 'success',
  rejected: 'danger',
  enrolled: 'success',
}

async function handleStatusUpdate(formData: FormData) {
  'use server'
  return updateApplicationStatus(formData)
}

async function handleEnroll(formData: FormData): Promise<void> {
  'use server'
  const result = await acceptAndEnroll(formData)
  if (result.success && result.studentId) {
    redirect(`/admin/students/${result.studentId}`)
  }
}

async function handleDelete(formData: FormData): Promise<void> {
  'use server'
  await deleteApplication(formData)
  redirect('/admin/applications')
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const applicant = await db.applicant.findUnique({ where: { id } })
  if (!applicant) notFound()

  // Applicant.studentId is a plain scalar (no relation), so the enrolled
  // student is fetched separately for its admission-letter printed flag.
  const student = applicant.studentId
    ? await db.student.findUnique({
        where: { id: applicant.studentId },
        select: { id: true, admissionLetterPrintedAt: true },
      })
    : null

  const [academicYears, currentYear] = await Promise.all([
    db.academicYear.findMany({ orderBy: { startDate: 'desc' } }),
    db.academicYear.findFirst({ where: { isCurrent: true } }),
  ])

  const classes = currentYear
    ? await db.classRoom.findMany({ where: { academicYearId: currentYear.id }, orderBy: { order: 'asc' } })
    : []

  const canEnroll = applicant.status !== 'enrolled' && !applicant.studentId

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/admin/applications" className="text-xs text-coffee-500 hover:text-coffee-800 transition-colors">
            ← Back to Applications
          </Link>
          <h1 className="text-2xl font-bold text-coffee-900 mt-1">{applicant.fullName}</h1>
          <p className="text-coffee-600 text-sm mt-0.5">Applied {formatDate(applicant.createdAt)}</p>
        </div>
        <div className="space-y-2 sm:text-right">
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant={STATUS_VARIANT[applicant.status] ?? 'neutral'}>{applicant.status}</Badge>
            <a
              href={`/api/applicants/${applicant.id}/application-form`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs border border-coffee-200 text-coffee-700 rounded-lg px-3 py-1.5 font-medium hover:bg-coffee-50 transition-colors whitespace-nowrap"
            >
              Print Application Form
            </a>
            {applicant.studentId && (
              <a
                href={`/api/students/${applicant.studentId}/admission-letter`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-coffee-900 text-white rounded-lg px-3 py-1.5 font-medium hover:bg-coffee-800 transition-colors whitespace-nowrap"
              >
                Print Admission Letter
              </a>
            )}
          </div>

          {/* Printed record — ticked by hand once the paper copy exists. */}
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <PrintedToggle
              action={toggleApplicationFormPrinted}
              id={applicant.id}
              printedAt={applicant.applicationFormPrintedAt}
              label="Form not printed"
            />
            {student && (
              <PrintedToggle
                action={toggleAdmissionLetterPrinted}
                id={student.id}
                printedAt={student.admissionLetterPrintedAt}
                label="Letter not printed"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 bg-white border border-coffee-200 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-coffee-800">Application Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Full Name" value={applicant.fullName} />
            <Field label="Gender" value={applicant.gender === 'M' ? 'Male' : applicant.gender === 'F' ? 'Female' : '—'} />
            <Field label="Marital Status" value={applicant.maritalStatus || '—'} />
            <Field label="Date of Birth" value={applicant.dateOfBirth ? formatDate(applicant.dateOfBirth) : '—'} />
            <Field label="Place of Residence" value={applicant.residence || '—'} />
            <Field label="Phone Number" value={applicant.phone || '—'} />
            <Field label="Hizb Memorized" value={applicant.hizbMemorized != null ? String(applicant.hizbMemorized) : '—'} />
            <Field label="Former School" value={applicant.formerSchool || '—'} />
            <Field label="Reason for Leaving" value={applicant.reasonForLeaving || '—'} full />
            <Field label="Guardian Name" value={applicant.guardianName || '—'} />
            <Field label="Guardian Phone" value={applicant.guardianPhone || '—'} />
          </div>

          {applicant.studentId && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Enrolled as student — Admission No: <strong>{applicant.admissionNumber}</strong>{' '}
              <Link href={`/admin/students/${applicant.studentId}`} className="underline">View Student</Link>
            </p>
          )}
        </div>

        {/* Photo + actions */}
        <div className="space-y-6">
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-6 text-center">
            <h2 className="font-semibold text-coffee-800 mb-3 text-left">Passport Photograph</h2>
            {applicant.photoUrl ? (
              <Image
                src={applicant.photoUrl}
                alt={applicant.fullName}
                width={160}
                height={190}
                unoptimized
                className="mx-auto rounded-lg object-cover border border-coffee-200"
              />
            ) : (
              <div className="w-32 h-40 mx-auto rounded-lg bg-coffee-100 border border-coffee-200 flex items-center justify-center">
                <span className="text-coffee-400 text-3xl font-bold">{applicant.fullName[0]}</span>
              </div>
            )}
          </div>

          {/* Status update */}
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-6">
            <h2 className="font-semibold text-coffee-800 mb-3">Update Status</h2>
            <ActionForm action={handleStatusUpdate} successMessage="Status updated." className="space-y-3">
              <input type="hidden" name="id" value={applicant.id} />
              <div>
                <label className="block text-xs font-medium text-coffee-600 mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={applicant.status === 'enrolled' ? 'shortlisted' : applicant.status}
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 capitalize"
                >
                  <option value="submitted">Submitted</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interviewed">Interviewed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-coffee-600 mb-1">Interview Notes</label>
                <textarea
                  name="interviewNotes"
                  rows={3}
                  defaultValue={applicant.interviewNotes ?? ''}
                  placeholder="Optional notes from interview"
                  className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 resize-none"
                />
              </div>
              <SubmitButton
                pendingText="Saving…"
                className="w-full bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
              >
                Save Status
              </SubmitButton>
            </ActionForm>
          </div>

          {/* Accept & Enroll */}
          {canEnroll && (
            <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-6">
              <h2 className="font-semibold text-coffee-800 mb-1">Accept &amp; Enroll</h2>
              <p className="text-coffee-500 text-xs mb-3">Creates a Student record and marks this application as enrolled.</p>
              <form action={handleEnroll} className="space-y-3">
                <input type="hidden" name="id" value={applicant.id} />
                <div>
                  <label className="block text-xs font-medium text-coffee-600 mb-1">Class (current year)</label>
                  <select
                    name="classId"
                    required
                    className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {classes.length === 0 && (
                    <p className="text-red-500 text-xs mt-1">No classes found for the current academic year.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-coffee-600 mb-1">Academic Year</label>
                  <select
                    name="academicYearId"
                    required
                    defaultValue={currentYear?.id ?? ''}
                    className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                  >
                    <option value="">Select year</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ' (current)' : ''}</option>
                    ))}
                  </select>
                </div>
                <SubmitButton
                  pendingText="Enrolling…"
                  className="w-full bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-800 transition-colors"
                >
                  Accept &amp; Enroll
                </SubmitButton>
              </form>
            </div>
          )}

          {/* Remove from the applications list */}
          <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-6">
            <h2 className="font-semibold text-coffee-800 mb-1">Delete Application</h2>
            <p className="text-coffee-500 text-xs mb-3">
              Removes this application permanently.
              {applicant.studentId ? ' The enrolled student record is kept.' : ''}
            </p>
            <form action={handleDelete}>
              <input type="hidden" name="id" value={applicant.id} />
              <SubmitButton
                pendingText="Deleting…"
                className="w-full border border-red-200 text-red-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Delete Application
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-coffee-400 text-xs">{label}</p>
      <p className="text-coffee-900 font-medium">{value}</p>
    </div>
  )
}
