'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import exifr from 'exifr'
import imageCompression from 'browser-image-compression'

type ClassOption = { id: string; name: string }

export default function PhotoAttendanceUploader({ classes }: { classes: ClassOption[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [classId, setClassId] = useState(classes.length === 1 ? classes[0].id : '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [capturedAt, setCapturedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  function reset() {
    setFile(null)
    setPreview('')
    setCapturedAt(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    setSuccess('')
    const f = e.target.files?.[0]
    if (!f) {
      reset()
      return
    }

    // Read the capture time from the ORIGINAL file (most reliable EXIF read).
    let captured: Date | null = null
    try {
      const exif = await exifr.parse(f, ['DateTimeOriginal', 'CreateDate'])
      const raw = exif?.DateTimeOriginal ?? exif?.CreateDate
      if (raw) {
        const d = raw instanceof Date ? raw : new Date(raw)
        if (!isNaN(d.getTime())) captured = d
      }
    } catch {
      captured = null
    }

    if (!captured) {
      setError(
        'No capture date found in this image. Take a fresh photo with your camera — screenshots and forwarded images (e.g. WhatsApp) cannot be used for attendance.',
      )
      reset()
      return
    }

    setFile(f)
    setCapturedAt(captured)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit() {
    if (!file || !capturedAt) return
    if (!classId) {
      setError('Please select your class.')
      return
    }
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      // Compress to at most 4 MB, preserving EXIF so the server can re-verify.
      const compressed = await imageCompression(file, {
        maxSizeMB: 4,
        maxWidthOrHeight: 2000,
        fileType: 'image/jpeg',
        preserveExif: true,
        useWebWorker: true,
      })

      const fd = new FormData()
      fd.append('file', compressed, 'class-photo.jpg')
      fd.append('classId', classId)
      fd.append('capturedAt', capturedAt.toISOString())

      const res = await fetch('/api/teacher/attendance-photo', {
        method: 'POST',
        body: fd,
      })
      const text = await res.text()
      let json: { ok?: boolean; id?: string; status?: string; error?: string } = {}
      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Server error (${res.status}). Please try again.`)
      }
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')

      setSuccess('Photo submitted. Awaiting admin verification.')
      reset()
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-coffee-700 mb-1">Class *</label>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coffee-400"
        >
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-coffee-700 mb-1">Class Photo *</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="block w-full text-sm text-coffee-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-coffee-100 file:text-coffee-800 file:text-sm hover:file:bg-coffee-200"
        />
        <p className="text-xs text-coffee-500 mt-1">
          Take the photo with your phone camera. The capture time becomes your attendance time.
        </p>
      </div>

      {preview && (
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="w-28 h-28 object-cover rounded-lg border border-coffee-200"
          />
          {capturedAt && (
            <div className="text-sm text-coffee-700">
              <p className="font-medium">Captured</p>
              <p className="text-coffee-500">
                {capturedAt.toLocaleString('en-GB', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || !file || !classId}
          className="w-full sm:w-auto bg-coffee-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors disabled:opacity-60"
        >
          {busy ? 'Submitting…' : 'Submit Photo'}
        </button>
      </div>
    </div>
  )
}
