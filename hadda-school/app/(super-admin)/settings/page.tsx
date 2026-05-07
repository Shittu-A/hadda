import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SETTINGS_CONFIG, SETTING_GROUP_LABELS } from '@/lib/settings-config'
import { upsertSettings } from '@/lib/actions/settings'

async function handleSave(formData: FormData): Promise<void> {
  'use server'
  await upsertSettings(formData)
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string }
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const dbSettings = await db.setting.findMany()
  const valueMap = new Map(dbSettings.map((s) => [s.key, s.value ?? '']))

  // Group settings by group key
  const grouped = SETTINGS_CONFIG.reduce<Record<string, typeof SETTINGS_CONFIG>>((acc, s) => {
    if (!acc[s.group]) acc[s.group] = []
    acc[s.group].push(s)
    return acc
  }, {})

  const groupOrder = ['school', 'finance', 'sms', 'general'] as const

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Settings</h1>
        <p className="text-coffee-600 text-sm mt-0.5">Configure system-wide preferences</p>
      </div>

      {searchParams.saved === '1' && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-green-800 text-sm font-medium">
          Settings saved successfully.
        </div>
      )}

      <form action={handleSave} className="space-y-6">
        {groupOrder.map((groupKey) => {
          const settings = grouped[groupKey]
          if (!settings || settings.length === 0) return null
          return (
            <div key={groupKey} className="bg-white border border-coffee-200 rounded-xl p-5">
              <h2 className="font-semibold text-coffee-800 mb-4">
                {SETTING_GROUP_LABELS[groupKey]}
              </h2>
              <div className="space-y-4">
                {settings.map((setting) => {
                  const currentValue = valueMap.get(setting.key) ?? ''
                  return (
                    <div key={setting.key}>
                      <label className="block text-sm font-medium text-coffee-700 mb-1">
                        {setting.label}
                      </label>
                      {setting.type === 'textarea' ? (
                        <textarea
                          name={setting.key}
                          defaultValue={currentValue}
                          placeholder={setting.placeholder}
                          rows={3}
                          className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 resize-none"
                        />
                      ) : setting.type === 'select' && setting.options ? (
                        <select
                          name={setting.key}
                          defaultValue={currentValue}
                          className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                        >
                          {setting.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : setting.type === 'boolean' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            name={setting.key}
                            value="true"
                            defaultChecked={currentValue === 'true'}
                            className="rounded border-coffee-300 text-coffee-900 focus:ring-coffee-400"
                          />
                          <span className="text-sm text-coffee-600">Enabled</span>
                        </div>
                      ) : (
                        <input
                          type={setting.type === 'number' ? 'number' : 'text'}
                          name={setting.key}
                          defaultValue={currentValue}
                          placeholder={setting.placeholder}
                          className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-coffee-900 text-white rounded-lg px-8 py-2.5 text-sm font-medium hover:bg-coffee-800 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  )
}
