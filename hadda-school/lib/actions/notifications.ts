'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { sendParentNotification } from '@/lib/actions/sms'

export async function markAllNotificationsRead(): Promise<void> {
  const session = await auth()
  if (!session) return

  await db.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  })

  revalidatePath('/notifications')
  revalidatePath('/admin/notifications')
  revalidatePath('/teacher/notifications')
  revalidatePath('/super-admin/notifications')
}

export async function markNotificationRead(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string
  await db.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { readAt: new Date() },
  })

  revalidatePath('/admin/notifications')
  revalidatePath('/teacher/notifications')
  revalidatePath('/super-admin/notifications')
}

// Notification here only targets internal Users (userId is required on the model);
// there's no existing concept of a parent-facing broadcast. This is a new, additive
// action: it texts every active student's primary guardian via SMS (lib/sms/termii.ts)
// rather than writing Notification rows. Admin/super_admin only.
export async function broadcastSmsNotification(message: string): Promise<{ sent: number; skipped: number; failed: number }> {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return { sent: 0, skipped: 0, failed: 0 }
  }

  const trimmed = message.trim()
  if (!trimmed) return { sent: 0, skipped: 0, failed: 0 }

  const students = await db.student.findMany({
    where: { deletedAt: null, status: 'active' },
    select: { id: true },
  })

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const student of students) {
    const result = await sendParentNotification({ studentId: student.id, message: trimmed })
    if (result.success) sent++
    else if (result.skipped) skipped++
    else failed++
  }

  await logAudit({
    userId: session.user.id,
    action: 'sms.broadcast_notification',
    description: `Broadcast SMS notification to guardians: ${sent} sent, ${skipped} skipped, ${failed} failed`,
  })

  return { sent, skipped, failed }
}
