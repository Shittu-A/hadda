import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { createElement } from 'react'
import { getTeacherAttendanceReport } from '@/lib/reports/teacher-attendance'

export const dynamic = 'force-dynamic'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#6b7280', marginBottom: 20 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#f3ede6',
    paddingVertical: 6, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#d6c5b0',
  },
  tableRow: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4,
    borderBottomWidth: 0.5, borderBottomColor: '#ede8e1',
  },
  tableRowAlt: { backgroundColor: '#faf7f4' },
  headerCell: { fontFamily: 'Helvetica-Bold', color: '#4a3728' },
  cell: { color: '#3d2b1f' },
  colName: { width: '26%' },
  colP: { width: '9%', textAlign: 'center' },
  colA: { width: '9%', textAlign: 'center' },
  colL: { width: '9%', textAlign: 'center' },
  colOL: { width: '11%', textAlign: 'center' },
  colTotal: { width: '9%', textAlign: 'center' },
  colRate: { width: '13%', textAlign: 'right' },
  colLateRate: { width: '14%', textAlign: 'right' },
  footer: { marginTop: 20, fontSize: 8, color: '#9ca3af', textAlign: 'center' },
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const rows = await getTeacherAttendanceReport(from, to)

  const generatedAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const subtitle = `${from && to ? `${from} to ${to}` : 'All Dates'} · Generated ${generatedAt}`

  const buffer = await renderToBuffer(
    createElement(
      Document, null,
      createElement(Page, { size: 'A4', style: styles.page },
        createElement(Text, { style: styles.title }, 'Teacher Attendance Report'),
        createElement(Text, { style: styles.subtitle }, subtitle),

        createElement(View, { style: styles.tableHeader },
          createElement(Text, { style: [styles.headerCell, styles.colName] }, 'Teacher'),
          createElement(Text, { style: [styles.headerCell, styles.colP] }, 'Present'),
          createElement(Text, { style: [styles.headerCell, styles.colA] }, 'Absent'),
          createElement(Text, { style: [styles.headerCell, styles.colL] }, 'Late'),
          createElement(Text, { style: [styles.headerCell, styles.colOL] }, 'On Leave'),
          createElement(Text, { style: [styles.headerCell, styles.colTotal] }, 'Total'),
          createElement(Text, { style: [styles.headerCell, styles.colRate] }, 'Attend. Rate'),
          createElement(Text, { style: [styles.headerCell, styles.colLateRate] }, 'Lateness Rate'),
        ),

        ...rows.map((r, i) =>
          createElement(View, { key: r.userId, style: i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow },
            createElement(Text, { style: [styles.cell, styles.colName] }, r.name),
            createElement(Text, { style: [styles.cell, styles.colP] }, String(r.present)),
            createElement(Text, { style: [styles.cell, styles.colA] }, String(r.absent)),
            createElement(Text, { style: [styles.cell, styles.colL] }, String(r.late)),
            createElement(Text, { style: [styles.cell, styles.colOL] }, String(r.onLeave)),
            createElement(Text, { style: [styles.cell, styles.colTotal] }, String(r.total)),
            createElement(Text, { style: [styles.cell, styles.colRate] }, r.attendanceRate),
            createElement(Text, { style: [styles.cell, styles.colLateRate] }, r.latenessRate),
          )
        ),

        createElement(Text, { style: styles.footer }, 'Abdullahi Bin Masuud Academy — Teacher Attendance Report'),
      )
    ) as any
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="teacher-attendance-report.pdf"',
    },
  })
}
