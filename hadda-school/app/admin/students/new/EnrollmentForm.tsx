'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type AcademicYear = { id: string; name: string; isCurrent: boolean }

const SCHOOL_RULES = `1. Students must be punctual and attend all scheduled sessions.
2. Full respect must be shown to teachers, staff, and fellow students at all times.
3. Students must come to class with their Quran (Mushaf) and memorization notebook daily.
4. Mobile phones and electronic devices are not permitted during class hours.
5. Students must maintain proper Islamic dress code at all times within the school premises.
6. Any absence must be reported to the school administration in advance.
7. Students must complete all assigned memorization (Sabaq, Sabqi, Manzil) daily.
8. Fighting, bullying, or any form of misconduct will lead to disciplinary action.
9. Students must keep the school premises clean and respect school property.
10. Parents/guardians are required to attend all parent-teacher meetings when invited.
11. Fee payments must be made on time as per the agreed schedule.
12. Any student who fails to meet academic standards will be counselled and, if necessary, withdrawn.`

export default function EnrollmentForm({
  academicYears,
  currentYearId,
  action,
}: {
  academicYears: AcademicYear[]
  currentYearId: string
  action: (formData: FormData) => Promise<void>
}) {
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setPhotoPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', 'uploads')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setPhotoUrl(json.url)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
      setPhotoUrl('')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (uploading) {
      e.preventDefault()
      return
    }
    setSubmitting(true)
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/students" className="text-coffee-500 text-sm hover:text-coffee-700">
          ← Back to Students
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-coffee-900 mt-2">Enroll New Student</h1>
      </div>

      <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-6 bg-white border border-coffee-200 rounded-xl p-4 sm:p-6">
        {/* Student Photo */}
        <div>
          <h2 className="text-base font-semibold text-coffee-800 mb-4 pb-2 border-b border-coffee-100">
            Student Photo
          </h2>
          <div className="flex items-start gap-4">
            <div className="w-24 h-28 rounded-lg border-2 border-dashed border-coffee-300 flex items-center justify-center overflow-hidden bg-coffee-50 shrink-0">
              {photoPreview ? (
                <Image src={photoPreview} alt="Preview" width={96} height={112} className="w-full h-full object-cover" unoptimized />
              ) : (
                <span className="text-coffee-400 text-xs text-center px-1">No photo</span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-coffee-700 mb-1">Upload Photo *</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-coffee-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-coffee-100 file:text-coffee-800 file:text-sm hover:file:bg-coffee-200"
              />
              {uploading && <p className="text-xs text-coffee-500 mt-1">Uploading…</p>}
              {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
              {photoUrl && !uploading && <p className="text-xs text-green-600 mt-1">Photo uploaded ✓</p>}
              <input type="hidden" name="photoUrl" value={photoUrl} />
            </div>
          </div>
        </div>

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
              <label className="block text-sm font-medium text-coffee-700 mb-1">Gender *</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="gender" value="M" required className="accent-coffee-700" />
                  <span className="text-sm text-coffee-700">Male (M)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="gender" value="F" className="accent-coffee-700" />
                  <span className="text-sm text-coffee-700">Female (F)</span>
                </label>
              </div>
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
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Academic Year *</label>
              <select
                name="academicYearId"
                required
                defaultValue={currentYearId}
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-coffee-700 mb-1">Address</label>
              <textarea
                name="address"
                rows={2}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
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

        {/* Rules & Regulations */}
        <div>
          <h2 className="text-base font-semibold text-coffee-800 mb-4 pb-2 border-b border-coffee-100">
            School Rules & Regulations
          </h2>
          <div className="bg-coffee-50 border border-coffee-200 rounded-lg p-4 h-48 overflow-y-auto mb-4">
            <pre className="text-xs text-coffee-700 whitespace-pre-wrap font-sans leading-relaxed">{SCHOOL_RULES}</pre>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="rulesAccepted"
              value="yes"
              required
              className="mt-0.5 accent-coffee-700 w-4 h-4 shrink-0"
            />
            <span className="text-sm text-coffee-700">
              I have read and agree to abide by the school&apos;s rules and regulations on behalf of this student.
            </span>
          </label>
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
            disabled={uploading || submitting}
            className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Enrolling…' : uploading ? 'Uploading photo…' : 'Enroll Student'}
          </button>
        </div>
      </form>
    </div>
  )
}
