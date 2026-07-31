'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import SubmitButton from '@/components/ui/SubmitButton'

type Profile = {
  photoUrl: string | null
  bio: string | null
  specialization: string | null
  awardTitle: string | null
  awardDesc: string | null
  videoUrl: string | null
} | null

export default function ProfileForm({
  teacherName,
  teacherId,
  existingProfile,
  action,
}: {
  teacherName: string
  teacherId: string
  existingProfile: Profile
  action: (formData: FormData) => Promise<void>
}) {
  const [photoUrl, setPhotoUrl] = useState(existingProfile?.photoUrl ?? '')
  const [photoPreview, setPhotoPreview] = useState(existingProfile?.photoUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

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

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/teacher-profiles" className="text-coffee-500 text-sm hover:text-coffee-700">
          ← Back to Teacher Profiles
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-coffee-900 mt-2">
          {existingProfile ? 'Edit' : 'Create'} Profile — {teacherName}
        </h1>
      </div>

      <form action={action} className="space-y-6 bg-white border border-coffee-200 rounded-xl p-4 sm:p-6">
        {/* Photo */}
        <div>
          <h2 className="text-base font-semibold text-coffee-800 mb-4 pb-2 border-b border-coffee-100">Profile Photo</h2>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-coffee-300 flex items-center justify-center overflow-hidden bg-coffee-50 shrink-0">
              {photoPreview ? (
                <Image src={photoPreview} alt="Preview" width={80} height={80} className="w-full h-full object-cover" unoptimized />
              ) : (
                <span className="text-coffee-400 text-2xl font-bold">{teacherName[0]}</span>
              )}
            </div>
            <div className="flex-1">
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

        {/* Info */}
        <div>
          <h2 className="text-base font-semibold text-coffee-800 mb-4 pb-2 border-b border-coffee-100">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Specialization / Role</label>
              <input
                name="specialization"
                defaultValue={existingProfile?.specialization ?? ''}
                placeholder="e.g. Hifz Teacher, Arabic Language"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Bio</label>
              <textarea
                name="bio"
                rows={4}
                defaultValue={existingProfile?.bio ?? ''}
                placeholder="Brief description about the teacher…"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>
        </div>

        {/* Award */}
        <div>
          <h2 className="text-base font-semibold text-coffee-800 mb-4 pb-2 border-b border-coffee-100">Award / Achievement</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Award Title</label>
              <input
                name="awardTitle"
                defaultValue={existingProfile?.awardTitle ?? ''}
                placeholder="e.g. 1st Place — National Musabaqah 2023"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">Award Description</label>
              <textarea
                name="awardDesc"
                rows={2}
                defaultValue={existingProfile?.awardDesc ?? ''}
                placeholder="Details about the award or competition…"
                className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>
        </div>

        {/* Video */}
        <div>
          <h2 className="text-base font-semibold text-coffee-800 mb-4 pb-2 border-b border-coffee-100">Musabaqah Video</h2>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">YouTube / Video URL</label>
            <input
              name="videoUrl"
              type="url"
              defaultValue={existingProfile?.videoUrl ?? ''}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
            <p className="text-xs text-coffee-400 mt-1">Paste a YouTube link to show the teacher&apos;s recitation or musabaqah video on the public page.</p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <Link
            href="/admin/teacher-profiles"
            className="w-full sm:w-auto text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
          >
            Cancel
          </Link>
          <SubmitButton
            pendingText="Saving…"
            disabled={uploading}
            className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors disabled:opacity-60"
          >
            Save Profile
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}
