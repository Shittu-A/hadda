import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { createElement } from 'react'

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
  colNo: { width: '14%' },
  colName: { width: '26%' },
  colClass: { width: '14%' },
  colP: { width: '9%', textAlign: 'center' },
  colA: { width: '9%', textAlign: 'center' },
  colL: { width: '9%', textAlign: 'center' },
  colE: { width: '9%', textAlign: 'center' },
  colRate: { width: '10%', textAlign: 'right' },
  footer: { marginTop: 20, fontSize: 8, color: '#9ca3af', textAlign: 'center' },
})

type Row = {
  admissionNumber: string; name: string; class: string
  present: number; absent: number; late: number; excused: number; attendanceRate: string
}

function AttendancePdfDoc({ rows, subtitle }: { rows: Row[]; subtitle: string }) {
  return createElement(
    Document, null,
    createElement(Page, { size: 'A4', style: styles.page },
      createElement(Text, { style: styles.title }, 'Attendance Report'),
      createElement(Text, { style: styles.subtitle }, subtitle),

      createElement(View, { style: styles.tableHeader },
        createElement(Text, { style: [styles.headerCell, styles.colNo] }, 'Adm No'),
        createElement(Text, { style: [styles.headerCell, styles.colName] }, 'Student'),
        createElement(Text, { style: [styles.headerCell, styles.colClass] }, 'Class'),
        createElement(Text, { style: [styles.headerCell, styles.colP] }, 'P'),
        createElement(Text, { style: [styles.headerCell, styles.colA] }, 'A'),
        createElement(Text, { style: [styles.headerCell, styles.colL] }, 'L'),
        createElement(Text, { style: [styles.headerCell, styles.colE] }, 'E'),
        createElement(Text, { style: [styles.headerCell, styles.colRate] }, 'Rate'),
      ),

      ...rows.map((r, i) =>
        createElement(View, { key: r.admissionNumber, style: i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow },
          createElement(Text, { style: [styles.cell, styles.colNo] }, r.admissionNumber),
          createElement(Text, { style: [styles.cell, styles.colName] }, r.name),
          createElement(Text, { style: [styles.cell, styles.colClass] }, r.class),
          createElement(Text, { style: [styles.cell, styles.colP] }, String(r.present)),
          createElement(Text, { style: [styles.cell, styles.colA] }, String(r.absent)),
          createElement(Text, { style: [styles.cell, styles.colL] }, String(r.late)),
          createElement(Text, { style: [styles.cell, styles.colE] }, String(r.excused)),
          createElement(Text, { style: [styles.cell, styles.colRate] }, r.attendanceRate),
        )
      ),

      createElement(Text, { style: styles.footer }, 'Abdullahi Bin Masuud Academy — Attendance Report'),
    )
  )
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const classId = searchParams.get('classId') || undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = {}
  if (classId) where.classId = classId
  if (from || to) {
    where.date = {}
    if (from) where.date.gte = new Date(from)
    if (to) where.date.lte = new Date(to + 'T23:59:59')
  }

  const records = await db.studentAttendance.findMany({
    where,
    include: {
      student: { select: { firstName: true, lastName: true, admissionNumber: true } },
      class: { select: { name: true } },
    },
    orderBy: [{ class: { order: 'asc' } }, { student: { firstName: 'asc' } }, { date: 'asc' }],
  })

  const studentMap = new Map<string, { admissionNumber: string; name: string; class: string; present: number; absent: number; late: number; excused: number; total: number }>()

  for (const r of records) {
    if (!studentMap.has(r.studentId)) {
      studentMap.set(r.studentId, {
        admissionNumber: r.student.admissionNumber,
        name: `${r.student.firstName} ${r.student.lastName}`,
        class: r.class.name,
        present: 0, absent: 0, late: 0, excused: 0, total: 0,
      })
    }
    const row = studentMap.get(r.studentId)!
    row.total++
    if (r.status === 'present') row.present++
    else if (r.status === 'absent') row.absent++
    else if (r.status === 'late') row.late++
    else if (r.status === 'excused') row.excused++
  }

  const rows: Row[] = Array.from(studentMap.values()).map((r) => {
    const attended = r.present + r.late + r.excused
    return { ...r, attendanceRate: r.total > 0 ? `${Math.round((attended / r.total) * 100)}%` : '—' }
  })

  const subtitle = `${from && to ? `${from} to ${to}` : 'All Dates'} · Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`

  const buffer = await renderToBuffer(createElement(AttendancePdfDoc, { rows, subtitle }) as any)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="attendance-report.pdf"',
    },
  })
}
