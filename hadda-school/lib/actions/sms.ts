'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { getStudentBalance } from '@/lib/fees/balance'
import { sendSms } from '@/lib/sms/termii'
import { formatCurrency } from '@/lib/utils'

async function getCurrencySymbol() {
  const setting = await db.setting.findUnique({ where: { key: 'currency_symbol' } })
  const raw = setting?.value || '₦'
  // The ₦ (U+20A6) symbol is NOT in the GSM 7-bit alphabet, so including it forces
  // Termii to encode the whole SMS as Unicode — which drops the billing page size
  // from 160 chars to 70, tripling the cost of a typical reminder. Map ₦ -> "N"
  // (same as the receipt PDF; also how the school writes amounts, e.g. "N3,500") so
  // messages stay plain GSM text and bill at 1 page instead of 3. Other symbols pass through.
  return raw === '₦' ? 'N' : raw
}

async function getSchoolName() {
  const setting = await db.setting.findUnique({ where: { key: 'school_name' } })
  return setting?.value || 'Abdullahi Bin Masuud Academy'
}

function primaryGuardianPhone(guardians: { phone: string | null; isPrimary: boolean }[]): string | null {
  const primary = guardians.find((g) => g.isPrimary && g.phone)
  if (primary?.phone) return primary.phone
  const anyWithPhone = guardians.find((g) => g.phone)
  return anyWithPhone?.phone ?? null
}

type SmsActionResult = { success: boolean; skipped?: boolean; error?: string }

// Sends a single balance-reminder SMS to a student's primary guardian.
// Admin/super_admin only. Uses getStudentBalance() (lib/fees/balance.ts) so the
// amount quoted always matches what the payments UI and receipts show.
export async function sendBalanceReminder(studentId: string): Promise<SmsActionResult> {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return { success: false, error: 'Unauthorized' }
  }

  const [balance, student, currencySymbol, schoolName] = await Promise.all([
    getStudentBalance(studentId),
    db.student.findFirst({ where: { id: studentId, deletedAt: null }, include: { guardians: true } }),
    getCurrencySymbol(),
    getSchoolName(),
  ])

  if (!student) return { success: false, error: 'Student not found' }
  if (!balance || balance.total <= 0) return { success: false, error: 'This student has no outstanding balance' }

  const phone = primaryGuardianPhone(student.guardians)
  if (!phone) return { success: false, error: 'No guardian phone number on file for this student' }

  // Quote what is actually due now rather than the year's full total, so a
  // parent is not chased for terms that have not started. How many terms are
  // owing is added as a short count — listing them by name would push the
  // message past one GSM-7 page and double the cost.
  const dueNow = balance.dueNow > 0 ? balance.dueNow : balance.total
  const termsOwing = new Set(
    balance.fees.filter((f) => !f.isUpcoming && f.termName).map((f) => f.termName)
  ).size
  const termPart = termsOwing > 1 ? ` across ${termsOwing} terms` : ''

  const message = `Dear Parent, outstanding school fees for ${student.firstName} ${student.lastName} (${student.admissionNumber}) is ${formatCurrency(dueNow, currencySymbol)}${termPart}. You may pay one term at a time. Kindly settle at your earliest convenience. - ${schoolName}`

  const result = await sendSms({
    to: phone,
    body: message,
    purpose: 'balance_reminder',
    studentId: student.id,
    createdById: session.user.id,
  })

  await logAudit({
    userId: session.user.id,
    action: 'sms.balance_reminder',
    auditableType: 'Student',
    auditableId: student.id,
    description: result.ok
      ? `Sent balance reminder SMS to ${student.firstName} ${student.lastName}'s guardian`
      : result.skipped
        ? `Balance reminder SMS skipped for ${student.firstName} ${student.lastName} (SMS not configured)`
        : `Failed to send balance reminder SMS to ${student.firstName} ${student.lastName}: ${result.error}`,
  })

  if (result.ok) return { success: true }
  return { success: false, skipped: result.skipped, error: result.error ?? 'Failed to send SMS' }
}

// Sends the balance reminder to every active student with an outstanding balance.
// Admin/super_admin only. Reuses sendBalanceReminder() per student.
export async function sendBulkBalanceReminders(): Promise<{ sent: number; skipped: number; failed: number }> {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return { sent: 0, skipped: 0, failed: 0 }
  }

  const students = await db.student.findMany({
    where: { deletedAt: null, status: 'active' },
    select: { id: true },
  })

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const student of students) {
    const balance = await getStudentBalance(student.id)
    if (!balance || balance.total <= 0) continue

    const result = await sendBalanceReminder(student.id)
    if (result.success) sent++
    else if (result.skipped) skipped++
    else failed++
  }

  await logAudit({
    userId: session.user.id,
    action: 'sms.bulk_balance_reminders',
    description: `Bulk balance reminders: ${sent} sent, ${skipped} skipped, ${failed} failed`,
  })

  return { sent, skipped, failed }
}

// General-purpose parent notification SMS — either by studentId (uses the primary
// guardian's phone) or a direct phone number.
export async function sendParentNotification({
  studentId,
  phone,
  message,
}: {
  studentId?: string
  phone?: string
  message: string
}): Promise<SmsActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  let toPhone = phone ?? null
  let resolvedStudentId: string | undefined = studentId

  if (!toPhone && studentId) {
    const student = await db.student.findFirst({ where: { id: studentId, deletedAt: null }, include: { guardians: true } })
    if (!student) return { success: false, error: 'Student not found' }
    toPhone = primaryGuardianPhone(student.guardians)
  }

  if (!toPhone) return { success: false, error: 'No phone number available' }

  const result = await sendSms({
    to: toPhone,
    body: message,
    purpose: 'notification',
    studentId: resolvedStudentId,
    createdById: session.user.id,
  })

  if (result.ok) return { success: true }
  return { success: false, skipped: result.skipped, error: result.error ?? 'Failed to send SMS' }
}
