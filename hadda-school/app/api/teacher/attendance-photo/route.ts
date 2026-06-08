import { NextRequest, NextResponse } from 'next/server'
import exifr from 'exifr'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getSupabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const BUCKET = 'attendance-photos'
const MAX_BYTES = 4 * 1024 * 1024 // 4 MB ceiling — client compresses below this

// Returns a valid Date or null. EXIF dates may come back as Date objects already.
function toValidDate(value: unknown): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value as string)
  return isNaN(d.getTime()) ? null : d
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (
    !session ||
    !['teacher', 'admin', 'super_admin'].includes(session.user.role)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const classId = formData.get('classId') as string | null
  const clientCapturedAt = formData.get('capturedAt') as string | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No photo provided' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Photo exceeds 4 MB after compression. Please try again.' },
      { status: 400 },
    )
  }
  if (!classId) {
    return NextResponse.json({ error: 'No class selected' }, { status: 400 })
  }

  // Authorize: the class must exist, and teachers may only upload for a class
  // they are assigned to. Admins / super admins may upload for any class.
  const cls = await db.classRoom.findUnique({
    where: { id: classId },
    include: { teachers: { where: { userId: session.user.id } } },
  })
  if (!cls) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }
  const isStaff = session.user.role === 'admin' || session.user.role === 'super_admin'
  if (!isStaff && cls.teachers.length === 0) {
    return NextResponse.json(
      { error: 'You are not assigned to this class' },
      { status: 403 },
    )
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  // Authoritative capture time: re-read EXIF server-side from the uploaded file.
  // Fall back to the client-extracted value only if compression dropped the EXIF.
  let capturedAt: Date | null = null
  try {
    const exif = await exifr.parse(bytes, ['DateTimeOriginal', 'CreateDate'])
    capturedAt = toValidDate(exif?.DateTimeOriginal) ?? toValidDate(exif?.CreateDate)
  } catch {
    capturedAt = null
  }
  if (!capturedAt) capturedAt = toValidDate(clientCapturedAt)

  if (!capturedAt) {
    return NextResponse.json(
      {
        error:
          'This image has no capture date in its metadata. Take a fresh photo with your camera — screenshots and forwarded images cannot be used for attendance.',
      },
      { status: 400 },
    )
  }

  // Date portion (local) used to match the attendance day.
  const attendanceDate = new Date(
    Date.UTC(capturedAt.getFullYear(), capturedAt.getMonth(), capturedAt.getDate()),
  )

  const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const supabase = getSupabase()
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const record = await db.classAttendancePhoto.create({
    data: {
      userId: session.user.id,
      classId,
      photoUrl: pub.publicUrl,
      photoPath: path,
      capturedAt,
      attendanceDate,
      status: 'pending',
    },
  })

  await logAudit({
    userId: session.user.id,
    action: 'attendance.photo.uploaded',
    auditableType: 'ClassAttendancePhoto',
    auditableId: record.id,
    description: `Uploaded class photo for ${cls.name}, captured ${capturedAt.toISOString()}`,
  })

  return NextResponse.json({ ok: true, id: record.id, status: record.status })
}
