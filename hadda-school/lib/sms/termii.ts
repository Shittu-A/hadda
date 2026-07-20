import { db } from '@/lib/db'

type SendSmsParams = {
  to: string
  body: string
  purpose: string
  studentId?: string
  createdById?: string
}

type SendSmsResult = {
  ok: boolean
  skipped?: boolean
  error?: string
}

// Rewrites the few common non-GSM characters that creep into fee/notification text
// into GSM 7-bit equivalents. Any character outside the GSM alphabet forces Termii to
// encode the WHOLE message as Unicode, which cuts the billing page size from 160 chars
// to 70 — roughly tripling the cost. Keeping messages plain GSM keeps them at 1 page.
// This is a safety net; callers building fee reminders already substitute ₦ -> N.
function toGsmSafe(body: string): string {
  return body
    .replace(/₦/g, 'N') // Naira sign (U+20A6)
    .replace(/[‘’‚‛]/g, "'") // curly / angled single quotes
    .replace(/[“”„‟]/g, '"') // curly double quotes
    .replace(/[–—―]/g, '-') // en/em/horizontal-bar dashes
    .replace(/…/g, '...') // ellipsis
    .replace(/ /g, ' ') // non-breaking space
}

// Normalizes a Nigerian phone number to international format (e.g. "080..." -> "234...").
// Termii expects numbers without a leading "+". Kept defensive: falls back to the
// original string (stripped of stray characters) if it doesn't look Nigerian-local.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+234')) return digits.slice(1)
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0')) return `234${digits.slice(1)}`
  return digits
}

async function logSms(params: {
  toPhone: string
  body: string
  purpose: string
  studentId?: string
  status: string
  provider?: string
  providerReference?: string
  error?: string
  createdById?: string
}) {
  await db.smsLog.create({
    data: {
      toPhone: params.toPhone,
      body: params.body,
      purpose: params.purpose,
      studentId: params.studentId ?? null,
      status: params.status,
      provider: params.provider ?? null,
      providerReference: params.providerReference ?? null,
      error: params.error ?? null,
      createdById: params.createdById ?? null,
    },
  })
}

// Central SMS sender. Reads provider config from the Setting table so it can be
// switched on later without any code changes — until a provider + api key are
// configured, every call degrades gracefully to a logged "skipped" SmsLog row.
// Never throws: callers can always trust the returned result.
export async function sendSms({ to, body: rawBody, purpose, studentId, createdById }: SendSmsParams): Promise<SendSmsResult> {
  const toPhone = normalizePhone(to)
  // Sanitize once up front so every branch (send + log) uses the GSM-safe, single-page text.
  const body = toGsmSafe(rawBody)

  try {
    const settings = await db.setting.findMany({
      where: { key: { in: ['sms_provider', 'sms_api_key', 'sms_sender_id', 'sms_base_url', 'sms_channel'] } },
    })
    const getSetting = (key: string) => settings.find((s) => s.key === key)?.value?.trim() || ''

    const provider = getSetting('sms_provider') || 'none'
    const apiKey = getSetting('sms_api_key')
    const senderId = getSetting('sms_sender_id') || 'School'
    // Termii's current live cluster is v4; the legacy api.ng cluster rejects newer
    // (tlv_...) keys with "Invalid API Key". Configurable so a different cluster can be
    // set without a code change. Trailing slashes trimmed so the path joins cleanly.
    const baseUrl = (getSetting('sms_base_url') || 'https://v4.api.termii.com').replace(/\/+$/, '')
    // 'generic' = promotional route, 'dnd' = transactional (delivers to DND-registered numbers).
    const channel = getSetting('sms_channel') || 'dnd'

    if (provider === 'none' || !apiKey) {
      await logSms({ toPhone, body, purpose, studentId, createdById, status: 'skipped' })
      return { ok: false, skipped: true }
    }

    if (provider === 'termii') {
      try {
        const res = await fetch(`${baseUrl}/api/sms/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: toPhone,
            from: senderId,
            sms: body,
            type: 'plain',
            channel,
            api_key: apiKey,
          }),
        })

        const data = await res.json().catch(() => ({}) as any)

        // v4 signals errors with an HTTP 4xx/5xx + a numeric `status` and `error`/`message`;
        // the legacy cluster used `code: 'error'`. Treat any non-2xx or error marker as a failure.
        const failed =
          !res.ok ||
          data?.code === 'error' ||
          data?.code === 'network_issue' ||
          (typeof data?.status === 'number' && data.status >= 400)

        if (failed) {
          const errorMsg = data?.message || data?.error || `Termii request failed (${res.status})`
          await logSms({ toPhone, body, purpose, studentId, createdById, status: 'failed', provider: 'termii', error: errorMsg })
          return { ok: false, error: errorMsg }
        }

        await logSms({
          toPhone,
          body,
          purpose,
          studentId,
          createdById,
          status: 'sent',
          provider: 'termii',
          providerReference: data?.message_id ?? data?.message_id_str ?? data?.data?.message_id ?? undefined,
        })
        return { ok: true }
      } catch (err: any) {
        const errorMsg = err?.message || 'Termii request threw an error'
        await logSms({ toPhone, body, purpose, studentId, createdById, status: 'failed', provider: 'termii', error: errorMsg })
        return { ok: false, error: errorMsg }
      }
    }

    if (provider === 'twilio') {
      // Not implemented yet — log as skipped so the caller flow keeps working.
      await logSms({
        toPhone,
        body,
        purpose,
        studentId,
        createdById,
        status: 'skipped',
        provider: 'twilio',
        error: 'Twilio integration not implemented yet',
      })
      return { ok: false, skipped: true, error: 'Twilio integration not implemented yet' }
    }

    // Unknown provider value.
    await logSms({ toPhone, body, purpose, studentId, createdById, status: 'skipped', error: `Unknown sms_provider: ${provider}` })
    return { ok: false, skipped: true, error: `Unknown sms_provider: ${provider}` }
  } catch (err: any) {
    // Absolute last resort — should be unreachable, but never throw from sendSms.
    try {
      await logSms({ toPhone, body, purpose, studentId, createdById, status: 'failed', error: err?.message || 'Unknown error' })
    } catch {
      // If even logging fails, swallow it — sendSms must never throw.
    }
    return { ok: false, error: err?.message || 'Unknown error' }
  }
}
