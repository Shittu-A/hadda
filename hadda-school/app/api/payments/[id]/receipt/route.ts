import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image as PdfImage } from '@react-pdf/renderer'
import { createElement } from 'react'
import { getStudentBalance } from '@/lib/fees/balance'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 10, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderBottomWidth: 2, borderBottomColor: '#3d2b1f', paddingBottom: 16 },
  logo: { width: 64, height: 64, marginRight: 16 },
  schoolName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#3d2b1f' },
  schoolMeta: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: '#3d2b1f', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 2 },
  titleUnderline: { height: 2, backgroundColor: '#c8a97e', width: 120, alignSelf: 'center', marginBottom: 24 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metaLabel: { fontSize: 8, color: '#9ca3af' },
  metaValue: { fontSize: 10, color: '#3d2b1f', fontFamily: 'Helvetica-Bold', marginTop: 1 },
  body: { marginBottom: 24 },
  row: { flexDirection: 'row', marginBottom: 12 },
  label: { width: 160, fontFamily: 'Helvetica-Bold', color: '#4a3728', fontSize: 10 },
  value: { flex: 1, color: '#1a1a1a', fontSize: 10, borderBottomWidth: 0.5, borderBottomColor: '#d1c5b8', paddingBottom: 2 },
  amountBox: { backgroundColor: '#f6f1ea', borderRadius: 6, padding: 16, marginVertical: 16, alignItems: 'center' },
  amountLabel: { fontSize: 9, color: '#6b7280' },
  amountValue: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#3d2b1f', marginTop: 4 },
  balanceBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fdf2f2', borderRadius: 6, padding: 12, marginTop: 4 },
  balanceLabel: { fontSize: 10, color: '#7f1d1d' },
  balanceValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#7f1d1d' },
  balanceBoxOk: { backgroundColor: '#f0fdf4' },
  balanceLabelOk: { color: '#14532d' },
  balanceValueOk: { color: '#14532d' },
  footer: { marginTop: 40, alignItems: 'center' },
  signatureLabel: { fontSize: 9, color: '#4a3728' },
  watermark: { fontSize: 7, color: '#d1c5b8', textAlign: 'center', marginTop: 30 },
})

function ReceiptDoc({
  schoolName,
  schoolAddress,
  schoolPhone,
  logoUrl,
  receiptNo,
  issueDate,
  studentName,
  admissionNumber,
  className,
  feeName,
  amountPaid,
  currencySymbol,
  paymentMethod,
  reference,
  recordedByName,
  remainingBalance,
}: {
  schoolName: string
  schoolAddress: string | null
  schoolPhone: string | null
  logoUrl: string | null
  receiptNo: string
  issueDate: string
  studentName: string
  admissionNumber: string
  className: string
  feeName: string
  amountPaid: number
  currencySymbol: string
  paymentMethod: string
  reference: string | null
  recordedByName: string
  remainingBalance: number
}) {
  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'A4', style: styles.page },

      // Header
      createElement(
        View,
        { style: styles.header },
        logoUrl ? createElement(PdfImage, { src: logoUrl, style: styles.logo } as any) : null,
        createElement(
          View,
          null,
          createElement(Text, { style: styles.schoolName }, schoolName),
          schoolAddress ? createElement(Text, { style: styles.schoolMeta }, schoolAddress) : null,
          schoolPhone ? createElement(Text, { style: styles.schoolMeta }, schoolPhone) : null,
        ),
      ),

      // Title
      createElement(Text, { style: styles.title }, 'Payment Receipt'),
      createElement(View, { style: styles.titleUnderline }),

      // Receipt no / date
      createElement(
        View,
        { style: styles.metaRow },
        createElement(
          View,
          null,
          createElement(Text, { style: styles.metaLabel }, 'RECEIPT NO.'),
          createElement(Text, { style: styles.metaValue }, receiptNo),
        ),
        createElement(
          View,
          null,
          createElement(Text, { style: styles.metaLabel }, 'DATE'),
          createElement(Text, { style: styles.metaValue }, issueDate),
        ),
      ),

      // Fields
      createElement(
        View,
        { style: styles.body },
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, 'Student Name:'),
          createElement(Text, { style: styles.value }, studentName),
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, 'Admission Number:'),
          createElement(Text, { style: styles.value }, admissionNumber),
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, 'Class:'),
          createElement(Text, { style: styles.value }, className),
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, 'Fee:'),
          createElement(Text, { style: styles.value }, feeName),
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, 'Payment Method:'),
          createElement(Text, { style: styles.value }, paymentMethod),
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, 'Reference:'),
          createElement(Text, { style: styles.value }, reference || '—'),
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, 'Received By:'),
          createElement(Text, { style: styles.value }, recordedByName),
        ),
      ),

      // Amount paid
      createElement(
        View,
        { style: styles.amountBox },
        createElement(Text, { style: styles.amountLabel }, 'AMOUNT PAID'),
        createElement(Text, { style: styles.amountValue }, `${currencySymbol}${amountPaid.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`),
      ),

      // Remaining balance
      createElement(
        View,
        { style: [styles.balanceBox, remainingBalance <= 0 ? styles.balanceBoxOk : {}] },
        createElement(
          Text,
          { style: [styles.balanceLabel, remainingBalance <= 0 ? styles.balanceLabelOk : {}] },
          'Remaining Outstanding Balance',
        ),
        createElement(
          Text,
          { style: [styles.balanceValue, remainingBalance <= 0 ? styles.balanceValueOk : {}] },
          `${currencySymbol}${remainingBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        ),
      ),

      createElement(
        View,
        { style: styles.footer },
        createElement(Text, { style: styles.signatureLabel }, 'Thank you for your payment.'),
      ),

      createElement(Text, { style: styles.watermark }, `${schoolName} — Official Payment Receipt`),
    ),
  )
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin' && session.user.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [payment, settings] = await Promise.all([
    db.feePayment.findUnique({
      where: { id },
      include: {
        student: { include: { currentClass: { select: { name: true } } } },
        feeStructure: { select: { name: true, term: { select: { name: true } } } },
        recordedBy: { select: { name: true } },
      },
    }),
    db.setting.findMany({
      where: { key: { in: ['school_name', 'school_logo_url', 'school_address', 'school_phone', 'currency_symbol'] } },
    }),
  ])

  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value ?? null
  const schoolName = getSetting('school_name') ?? 'Abdullahi Bin Masuud Academy'
  const logoUrl = getSetting('school_logo_url')
  const schoolAddress = getSetting('school_address')
  const schoolPhone = getSetting('school_phone')
  const rawCurrency = getSetting('currency_symbol') || '₦'
  // @react-pdf's base Helvetica font has no ₦ (U+20A6) glyph — it renders as a blank
  // bar. Fall back to "N", which is also how the school writes amounts on its own
  // documents (e.g. "N3,500"). Non-Naira symbols (e.g. $) pass through unchanged.
  const currencySymbol = rawCurrency === '₦' ? 'N' : rawCurrency

  const balance = await getStudentBalance(payment.studentId)
  const remainingBalance = balance?.total ?? 0

  const issueDate = new Date(payment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const receiptNo = `RCT-${payment.id.slice(-8).toUpperCase()}`

  const buffer = await renderToBuffer(
    createElement(ReceiptDoc, {
      schoolName,
      schoolAddress,
      schoolPhone,
      logoUrl,
      receiptNo,
      issueDate,
      studentName: `${payment.student.firstName} ${payment.student.lastName}`,
      admissionNumber: payment.student.admissionNumber,
      className: payment.student.currentClass?.name ?? 'Unassigned',
      // Which term the money settled. Falls back to the free-text period so
      // receipts for non-termly fees still show what was paid for.
      feeName: (() => {
        const term = payment.feeStructure.term?.name ?? payment.period
        return term ? `${payment.feeStructure.name} — ${term}` : payment.feeStructure.name
      })(),
      amountPaid: Number(payment.amountPaid),
      currencySymbol,
      paymentMethod: payment.paymentMethod.replace('_', ' '),
      reference: payment.reference,
      recordedByName: payment.recordedBy.name,
      remainingBalance,
    }) as any,
  )

  const safeName = `${payment.student.firstName}-${payment.student.lastName}-${receiptNo}`.replace(/\s+/g, '-')

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receipt-${safeName}.pdf"`,
    },
  })
}
