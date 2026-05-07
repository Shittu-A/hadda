'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createEvent(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const youtubeUrl = (formData.get('youtubeUrl') as string)?.trim() || ''
  const eventDate = formData.get('eventDate') as string
  const isPublished = formData.get('isPublished') === 'true'

  if (!title || !eventDate) return

  await db.event.create({
    data: { title, description, youtubeUrl, eventDate: new Date(eventDate), isPublished },
  })

  await logAudit({
    userId: session.user.id,
    action: 'event.created',
    description: `Event created: ${title}`,
  })

  revalidatePath('/super-admin/events')
  revalidatePath('/')
}

export async function updateEvent(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string
  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const youtubeUrl = (formData.get('youtubeUrl') as string)?.trim() || ''
  const eventDate = formData.get('eventDate') as string
  const isPublished = formData.get('isPublished') === 'true'

  if (!id || !title || !eventDate) return

  await db.event.update({
    where: { id },
    data: { title, description, youtubeUrl, eventDate: new Date(eventDate), isPublished },
  })

  await logAudit({
    userId: session.user.id,
    action: 'event.updated',
    auditableType: 'Event',
    auditableId: id,
    description: `Event updated: ${title}`,
  })

  revalidatePath('/super-admin/events')
  revalidatePath('/')
  redirect('/super-admin/events')
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string
  await db.event.delete({ where: { id } })

  await logAudit({
    userId: session.user.id,
    action: 'event.deleted',
    auditableType: 'Event',
    auditableId: id,
    description: 'Event deleted',
  })

  revalidatePath('/super-admin/events')
  revalidatePath('/')
}

export async function toggleEventPublish(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string
  const current = await db.event.findUnique({ where: { id }, select: { isPublished: true } })
  if (!current) return

  await db.event.update({ where: { id }, data: { isPublished: !current.isPublished } })

  revalidatePath('/super-admin/events')
  revalidatePath('/')
}
