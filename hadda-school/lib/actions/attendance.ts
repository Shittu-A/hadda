'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

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
        update: { status: status as any, note },
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
