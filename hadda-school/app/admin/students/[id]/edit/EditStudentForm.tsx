'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Guardian = { id: string; name: string; phone: string; email: string | null; relationship: string; isPrimary: boolean }
type ClassRoom = { id: string; name: string; academicYear: { name: string } }
type Student = {
  id: string
  firstName: string
  lastName: string
  admissionNumber: string
  gender: string | null
  dateOfBirth: Date | null
  address: string | null
  status: string
  currentClassId: string | null
  photoUrl: string | null
  guardians: Guardian[]
}

export default function EditStudentForm({
  student,
  classes,
  action,
}: {
  student: Student
  classes: ClassRoom[]
  action: (formData: FormData) => Promise<void>
}) {
  const primary = student.guardians.find((g) => g.isPrimary) ?? student.guardians[0]

  const [photoUrl, setPhotoUrl] = useState(student.photoUrl ?? '')
  const [photoPreview, setPhotoPreview] = useState(student.photoUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const dobValue = student.dateOfBirth
    ? new Date(student.dateOfBirth).toISOString().split('T')[0]
    : ''

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
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (uploading) {
      e.preventDefault()
      return
    }
    setSubmitting(true)
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="mb-6">
        <Link href={`/admin/students/${student.id}`} className="text-coffee-500 text-sm hover:text-coffee-700">
          ← Back to Student
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-coffee-900 mt-2">
          Edit: {student.firstName} {student.lastName}
        </h1>
        <p className="text-coffee-400 font-mono text-sm">{student.admissionNumber}</p>
      </div>

      <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-6 bg-white border border-coffee-200 rounded-xl p-4 sm:p-6">

        {/* Photo */}
        <div>
          <h2 className="text-base font-semibold text-coffee-800 mb-4 pb-2 border-b border-coffee-100">Student Photo</h2>
          <div className="flex items-start gap-4">
            <div className="w-24 h-28 rounded-lg border-2 border-dashed border-coffee-300 flex items-center justify-center overflow-hidden bg-coffee-50 shrink-0">
              {photoPreview ? (
                <Image src={photoPreview} alt="Preview" width={96} height={112} className="w-full h-full object-cover" unoptimized />
              ) : (
                <span className="text-coffee-400 text-xs text-center px-1">No photo</span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                {student.photoUrl ? 'Change Photo' : 'Upload Photo'}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-coffee-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-coffee-100 file:text-coffee-800 file:text-sm hover:file:bg-coffee-200"
              />
              {uploading && <p className="text-xs text-coffee-500 mt-1">Uploading…</p>}
              {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
              {photoUrl && !uploading && photoUrl !== student.photoUrl && (
                <p className="text-xs text-green-600 mt-1">New photo uploaded ✓</p>
              )}
              <input type="hidden" name="photoUrl" value={photoUrl} />
            </div>
          </div>
        </div>

        {/* Student Info */}
        <div>
          <h2 className="text-base font-semibold text-coffee-800 mb-4 pb-2 border-b border-coffee-100">Student Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">First Name *</label>
              <input
                name="firstName"
                required
                defaultValue={student.firstName}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Last Name *</label>
              <input
                name="lastName"
                required
                defaultValue={student.lastName}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Gender</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="gender" value="M" defaultChecked={student.gender === 'M'} className="accent-coffee-700" />
                  <span className="text-sm text-coffee-700">Male (M)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="gender" value="F" defaultChecked={student.gender === 'F'} className="accent-coffee-700" />
                  <span className="text-sm text-coffee-700">Female (F)</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                defaultValue={dobValue}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Status *</label>
              <select
                name="status"
                defaultValue={student.status}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="active">Active</option>
                <option value="promoted">Promoted</option>
                <option value="graduated">Graduated</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Class</label>
              <select
                name="currentClassId"
                defaultValue={student.currentClassId ?? ''}
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-coffee-700 mb-1">Address</label>
              <textarea
                name="address"
                rows={2}
                defaultValue={student.address ?? ''}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>
        </div>

        {/* Guardian Info */}
        <div>
          <h2 className="text-base font-semibold text-coffee-800 mb-4 pb-2 border-b border-coffee-100">Primary Guardian</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Guardian Name</label>
              <input
                name="guardianName"
                defaultValue={primary?.name ?? ''}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Relationship</label>
              <select
                name="guardianRelationship"
                defaultValue={primary?.relationship ?? 'Guardian'}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Phone</label>
              <input
                name="guardianPhone"
                type="tel"
                defaultValue={primary?.phone ?? ''}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Email</label>
              <input
                name="guardianEmail"
                type="email"
                defaultValue={primary?.email ?? ''}
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <Link
            href={`/admin/students/${student.id}`}
            className="w-full sm:w-auto text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={uploading || submitting}
            className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Saving…' : uploading ? 'Uploading photo…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
