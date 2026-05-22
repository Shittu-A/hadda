import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image as PdfImage } from '@react-pdf/renderer'
import { createElement } from 'react'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 10, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderBottomWidth: 2, borderBottomColor: '#3d2b1f', paddingBottom: 16 },
  logo: { width: 64, height: 64, marginRight: 16 },
  schoolName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#3d2b1f' },
  schoolTagline: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: '#3d2b1f', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 2 },
  titleUnderline: { height: 2, backgroundColor: '#c8a97e', width: 120, alignSelf: 'center', marginBottom: 24 },
  body: { marginBottom: 24 },
  row: { flexDirection: 'row', marginBottom: 12 },
  label: { width: 150, fontFamily: 'Helvetica-Bold', color: '#4a3728', fontSize: 10 },
  value: { flex: 1, color: '#1a1a1a', fontSize: 10, borderBottomWidth: 0.5, borderBottomColor: '#d1c5b8', paddingBottom: 2 },
  qrSection: { alignItems: 'center', marginVertical: 20 },
  qrImage: { width: 90, height: 90 },
  qrLabel: { fontSize: 8, color: '#9ca3af', marginTop: 4 },
  footer: { marginTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signatureBlock: { alignItems: 'center' },
  signatureImage: { width: 120, height: 50, objectFit: 'contain' },
  signatureLine: { width: 140, height: 0.5, backgroundColor: '#6b7280', marginTop: 4, marginBottom: 4 },
  signatureLabel: { fontSize: 9, color: '#4a3728', fontFamily: 'Helvetica-Bold' },
  dateBlock: { alignItems: 'flex-end' },
  dateLabel: { fontSize: 9, color: '#6b7280' },
  dateValue: { fontSize: 10, color: '#3d2b1f', fontFamily: 'Helvetica-Bold' },
  watermark: { fontSize: 7, color: '#d1c5b8', textAlign: 'center', marginTop: 30 },
})

function AdmissionLetterDoc({
  student,
  className,
  schoolName,
  logoUrl,
  signatureUrl,
  qrDataUrl,
  issueDate,
}: {
  student: { firstName: string; lastName: string; admissionNumber: string; gender: string | null }
  className: string
  schoolName: string
  logoUrl: string | null
  signatureUrl: string | null
  qrDataUrl: string
  issueDate: string
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
        logoUrl
          ? createElement(PdfImage, { src: logoUrl, style: styles.logo } as any)
          : null,
        createElement(
          View,
          null,
          createElement(Text, { style: styles.schoolName }, schoolName),
          createElement(Text, { style: styles.schoolTagline }, 'Quran Memorization Academy'),
        ),
      ),

      // Title
      createElement(Text, { style: styles.title }, 'Admission Letter'),
      createElement(View, { style: styles.titleUnderline }),

      // Fields
      createElement(
        View,
        { style: styles.body },
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, 'Full Name:'),
          createElement(Text, { style: styles.value }, `${student.firstName} ${student.lastName}`),
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, 'Admission Number:'),
          createElement(Text, { style: styles.value }, student.admissionNumber),
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
          createElement(Text, { style: styles.label }, 'Gender:'),
          createElement(Text, { style: styles.value }, student.gender === 'M' ? 'Male' : student.gender === 'F' ? 'Female' : '—'),
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, 'Date of Admission:'),
          createElement(Text, { style: styles.value }, issueDate),
        ),
      ),

      // QR Code
      createElement(
        View,
        { style: styles.qrSection },
        createElement(PdfImage, { src: qrDataUrl, style: styles.qrImage } as any),
        createElement(Text, { style: styles.qrLabel }, `Scan to verify: ${student.admissionNumber}`),
      ),

      // Footer
      createElement(
        View,
        { style: styles.footer },
        createElement(
          View,
          { style: styles.signatureBlock },
          signatureUrl
            ? createElement(PdfImage, { src: signatureUrl, style: styles.signatureImage } as any)
            : null,
          createElement(View, { style: styles.signatureLine }),
          createElement(Text, { style: styles.signatureLabel }, 'Director'),
        ),
        createElement(
          View,
          { style: styles.dateBlock },
          createElement(Text, { style: styles.dateLabel }, 'Issued on'),
          createElement(Text, { style: styles.dateValue }, issueDate),
        ),
      ),

      createElement(Text, { style: styles.watermark }, `${schoolName} — Official Admission Letter`),
    ),
  )
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [student, settings] = await Promise.all([
    db.student.findFirst({
      where: { id, deletedAt: null },
      include: { currentClass: { select: { name: true } } },
    }),
    db.setting.findMany({
      where: { key: { in: ['school_name', 'school_logo_url', 'director_signature_url'] } },
    }),
  ])

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value ?? null
  const schoolName = getSetting('school_name') ?? 'Abdullahi Bin Masuud Academy'
  const logoUrl = getSetting('school_logo_url')
  const signatureUrl = getSetting('director_signature_url')
  const className = student.currentClass?.name ?? 'Not yet assigned'

  const qrDataUrl = await QRCode.toDataURL(student.admissionNumber, { width: 180, margin: 1 })

  const issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  const buffer = await renderToBuffer(
    createElement(AdmissionLetterDoc, {
      student,
      className,
      schoolName,
      logoUrl,
      signatureUrl,
      qrDataUrl,
      issueDate,
    }) as any,
  )

  const safeName = `${student.firstName}-${student.lastName}-${student.admissionNumber}`.replace(/\s+/g, '-')

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="admission-letter-${safeName}.pdf"`,
    },
  })
}
