'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function markStudentAttendance(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const classId = formData.get('classId') as string
  const date = formData.get('date') as string
  const studentIds = formData.getAll('studentId').map(String)

  if (!classId || !date || studentIds.length === 0) {
    return { success: false, error: 'Missing required fields' }
  }

  const attendanceDate = new Date(date)

  try {
    await db.$transaction(
      studentIds.map((studentId) => {
        const status = (formData.get(`status_${studentId}`) as string) || 'present'
        const note = (formData.get(`note_${studentId}`) as string) || null

        return db.studentAttendance.upsert({
          where: { studentId_date: { studentId, date: attendanceDate } },
          update: { status: status as any, note, recordedById: session.user.id, classId },
          create: {
            studentId,
            classId,
            recordedById: session.user.id,
            date: attendanceDate,
            status: status as any,
            note,
          },
        })
      })
    )

    await logAudit({
      userId: session.user.id,
      action: 'attendance.student.marked',
      auditableType: 'ClassRoom',
      auditableId: classId,
      description: `Marked student attendance for ${studentIds.length} students on ${date}`,
    })

    revalidatePath('/admin/attendance/students')
    revalidatePath('/teacher/attendance')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to save attendance' }
  }
}

export async function markTeacherAttendance(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const date = formData.get('date') as string
  const teacherIds = formData.getAll('teacherId').map(String)
  const attendanceDate = new Date(date)

  await db.$transaction(
    teacherIds.map((userId) => {
      const status = (formData.get(`status_${userId}`) as string) || 'present'
      const note = (formData.get(`note_${userId}`) as string) || null

      return db.teacherAttendance.upsert({
        where: { userId_date: { userId, date: attendanceDate } },
        update: { status: status as any, note, recordedById: session.user.id },
        create: { userId, recordedById: session.user.id, date: attendanceDate, status: status as any, note },
      })
    })
  )

  await logAudit({
    userId: session.user.id,
    action: 'attendance.teacher.marked',
    description: `Marked teacher attendance for ${teacherIds.length} teachers on ${date}`,
  })

  revalidatePath('/admin/attendance/teachers')
}

export async function markTeacherArrival(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const userId = formData.get('teacherId') as string
  const date = formData.get('date') as string
  if (!userId || !date) return

  const attendanceDate = new Date(date)
  const now = new Date()

  const thresholdSetting = await db.setting.findUnique({ where: { key: 'teacher_late_threshold' } })
  const threshold = thresholdSetting?.value ?? '08:00'
  const [thresholdHour, thresholdMin] = threshold.split(':').map(Number)

  const nowHour = now.getHours()
  const nowMin = now.getMinutes()
  const isLate = nowHour > thresholdHour || (nowHour === thresholdHour && nowMin > thresholdMin)
  const status = isLate ? 'late' : 'present'

  await db.teacherAttendance.upsert({
    where: { userId_date: { userId, date: attendanceDate } },
    update: { status, arrivalTime: now, recordedById: session.user.id },
    create: { userId, recordedById: session.user.id, date: attendanceDate, status, arrivalTime: now },
  })

  await logAudit({
    userId: session.user.id,
    action: 'attendance.teacher.arrived',
    description: `Teacher ${userId} marked arrived at ${now.toTimeString().slice(0, 5)} — status: ${status}`,
  })

  revalidatePath('/admin/attendance/teachers')
}

/**
 * Wipes every teacher attendance record. Super-admin only, and guarded by a
 * typed confirmation so it cannot happen from a stray click — an admin marking
 * daily attendance must not be able to clear the whole history.
 */
export async function resetTeacherAttendance(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session || session.user.role !== 'super_admin') {
    redirect('/admin/attendance/teachers?reset=unauthorized')
  }

  const confirmation = ((formData.get('confirm') as string) || '').trim().toUpperCase()
  if (confirmation !== 'RESET') {
    redirect('/admin/attendance/teachers?reset=unconfirmed')
  }

  const { count } = await db.teacherAttendance.deleteMany({})

  await logAudit({
    userId: session.user.id,
    action: 'attendance.teacher.reset',
    description: `Reset teacher attendance — deleted ${count} record${count !== 1 ? 's' : ''}`,
  })

  revalidatePath('/admin/attendance/teachers')
  redirect(`/admin/attendance/teachers?reset=${count}`)
}
