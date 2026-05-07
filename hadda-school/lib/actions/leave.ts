'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export async function createLeaveRequest(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string
  const reason = (formData.get('reason') as string)?.trim()

  if (!startDate || !endDate || !reason) {
    return { success: false, error: 'All fields are required' }
  }

  if (new Date(startDate) > new Date(endDate)) {
    return { success: false, error: 'Start date must be before end date' }
  }

  const leave = await db.leaveRequest.create({
    data: {
      userId: session.user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
    },
  })

  // Notify all admins + super_admins
  const admins = await db.user.findMany({
    where: { role: { in: ['admin', 'super_admin'] }, isActive: true },
    select: { id: true },
  })

  await db.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: 'new_leave_request',
      data: { leaveId: leave.id, requesterId: session.user.id, startDate, endDate },
    })),
  })

  await logAudit({
    userId: session.user.id,
    action: 'leave.requested',
    auditableType: 'LeaveRequest',
    auditableId: leave.id,
    description: `Leave request submitted: ${startDate} to ${endDate}`,
  })

  revalidatePath('/teacher/leave')
  return { success: true }
}

export async function approveLeaveRequest(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string

  const leave = await db.leaveRequest.update({
    where: { id },
    data: {
      status: 'approved',
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  })

  await db.notification.create({
    data: {
      userId: leave.userId,
      type: 'leave_request_decided',
      data: { leaveId: id, decision: 'approved' },
    },
  })

  await logAudit({
    userId: session.user.id,
    action: 'leave.approved',
    auditableType: 'LeaveRequest',
    auditableId: id,
    description: 'Leave request approved',
  })

  revalidatePath('/admin/leave-requests')
}

export async function rejectLeaveRequest(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string
  const reviewNote = (formData.get('reviewNote') as string)?.trim()

  const leave = await db.leaveRequest.update({
    where: { id },
    data: {
      status: 'rejected',
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
    },
  })

  await db.notification.create({
    data: {
      userId: leave.userId,
      type: 'leave_request_decided',
      data: { leaveId: id, decision: 'rejected', note: reviewNote },
    },
  })

  await logAudit({
    userId: session.user.id,
    action: 'leave.rejected',
    auditableType: 'LeaveRequest',
    auditableId: id,
    description: `Leave request rejected${reviewNote ? ': ' + reviewNote : ''}`,
  })

  revalidatePath('/admin/leave-requests')
}
