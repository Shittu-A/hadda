'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { getSupabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

const BUCKET = 'attendance-photos'
const PURGE_AFTER_MS = 72 * 60 * 60 * 1000 // 72 hours

async function requireStaff() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== 'admin' && session.user.role !== 'super_admin') return null
  return session
}

// Compute present/late from a capture time against the teacher_late_threshold setting.
// Mirrors the logic in markTeacherArrival (lib/actions/attendance.ts).
async function statusFromCaptureTime(capturedAt: Date): Promise<'present' | 'late'> {
  const thresholdSetting = await db.setting.findUnique({
    where: { key: 'teacher_late_threshold' },
  })
  const threshold = thresholdSetting?.value ?? '08:00'
  const [thresholdHour, thresholdMin] = threshold.split(':').map(Number)
  const h = capturedAt.getHours()
  const m = capturedAt.getMinutes()
  const isLate = h > thresholdHour || (h === thresholdHour && m > thresholdMin)
  return isLate ? 'late' : 'present'
}

export async function verifyAttendancePhoto(formData: FormData): Promise<void> {
  const session = await requireStaff()
  if (!session) return

  const id = formData.get('id') as string
  if (!id) return

  const photo = await db.classAttendancePhoto.findUnique({ where: { id } })
  if (!photo || photo.status !== 'pending') return

  const status = await statusFromCaptureTime(photo.capturedAt)

  await db.$transaction([
    db.classAttendancePhoto.update({
      where: { id },
      data: {
        status: 'verified',
        verifiedById: session.user.id,
        verifiedAt: new Date(),
      },
    }),
    // Auto-mark the teacher's daily attendance from the verified photo.
    db.teacherAttendance.upsert({
      where: { userId_date: { userId: photo.userId, date: photo.attendanceDate } },
      update: {
        status,
        arrivalTime: photo.capturedAt,
        recordedById: session.user.id,
      },
      create: {
        userId: photo.userId,
        recordedById: session.user.id,
        date: photo.attendanceDate,
        status,
        arrivalTime: photo.capturedAt,
      },
    }),
  ])

  await logAudit({
    userId: session.user.id,
    action: 'attendance.photo.verified',
    auditableType: 'ClassAttendancePhoto',
    auditableId: id,
    description: `Verified class photo — marked teacher ${photo.userId} ${status} on ${photo.attendanceDate.toISOString().slice(0, 10)}`,
  })

  revalidatePath('/admin/attendance/class-photos')
  revalidatePath('/admin/attendance/teachers')
  revalidatePath('/teacher/attendance/photo')
}

export async function rejectAttendancePhoto(formData: FormData): Promise<void> {
  const session = await requireStaff()
  if (!session) return

  const id = formData.get('id') as string
  const note = (formData.get('note') as string)?.trim() || null
  if (!id) return

  const photo = await db.classAttendancePhoto.findUnique({ where: { id } })
  if (!photo || photo.status !== 'pending') return

  // A rejected photo is fake/random — delete it from storage immediately.
  if (photo.photoPath) {
    try {
      await getSupabase().storage.from(BUCKET).remove([photo.photoPath])
    } catch {
      // tolerate an already-missing object
    }
  }

  await db.classAttendancePhoto.update({
    where: { id },
    data: {
      status: 'rejected',
      reviewNote: note,
      verifiedById: session.user.id,
      verifiedAt: new Date(),
      photoUrl: null,
      photoPath: null,
      photoDeletedAt: new Date(),
    },
  })

  await logAudit({
    userId: session.user.id,
    action: 'attendance.photo.rejected',
    auditableType: 'ClassAttendancePhoto',
    auditableId: id,
    description: `Rejected class photo from teacher ${photo.userId}${note ? ` — ${note}` : ''}`,
  })

  revalidatePath('/admin/attendance/class-photos')
  revalidatePath('/teacher/attendance/photo')
}

// Delete-on-read 72h cleanup: called when the admin opens the verification page.
// Removes storage objects for verified photos older than 72h, keeping the DB row
// (audit trail) but freeing the bucket.
export async function purgeExpiredAttendancePhotos(): Promise<void> {
  const cutoff = new Date(Date.now() - PURGE_AFTER_MS)

  const expired = await db.classAttendancePhoto.findMany({
    where: {
      status: 'verified',
      photoDeletedAt: null,
      verifiedAt: { lt: cutoff },
    },
    select: { id: true, photoPath: true },
  })
  if (expired.length === 0) return

  const supabase = getSupabase()
  const paths = expired.map((p) => p.photoPath).filter((p): p is string => !!p)
  if (paths.length > 0) {
    try {
      await supabase.storage.from(BUCKET).remove(paths)
    } catch {
      // tolerate already-missing objects; rows are still marked deleted below
    }
  }

  await db.classAttendancePhoto.updateMany({
    where: { id: { in: expired.map((p) => p.id) } },
    data: { photoUrl: null, photoPath: null, photoDeletedAt: new Date() },
  })
}
