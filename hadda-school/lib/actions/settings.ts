'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { SETTINGS_CONFIG } from '@/lib/settings-config'

export async function upsertSettings(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session || session.user.role !== 'super_admin') return

  for (const setting of SETTINGS_CONFIG) {
    const raw = formData.get(setting.key)
    const value = raw !== null ? (raw as string).trim() : null

    await db.setting.upsert({
      where: { key: setting.key },
      update: { value },
      create: {
        key: setting.key,
        label: setting.label,
        group: setting.group as any,
        type: setting.type as any,
        options: setting.options ? setting.options : undefined,
        value,
      },
    })
  }

  await logAudit({
    userId: session.user.id,
    action: 'settings.updated',
    description: 'System settings updated',
  })

  revalidatePath('/super-admin/settings')
  redirect('/super-admin/settings?saved=1')
}
