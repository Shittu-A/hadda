'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

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
