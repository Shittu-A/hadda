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
  colNo: { width: '12%' },
  colName: { width: '22%' },
  colClass: { width: '12%' },
  colSessions: { width: '8%', textAlign: 'center' },
  colPages: { width: '8%', textAlign: 'right' },
  colTotal: { width: '10%', textAlign: 'right' },
  colQuality: { width: '10%', textAlign: 'center' },
  footer: { marginTop: 20, fontSize: 8, color: '#9ca3af', textAlign: 'center' },
})

const QUALITY_SCORE: Record<string, number> = { excellent: 4, good: 3, average: 2, weak: 1 }
const QUALITY_LABEL = ['', 'Weak', 'Average', 'Good', 'Excellent']

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
  if (classId) where.student = { currentClassId: classId }
  if (from || to) {
    where.logDate = {}
    if (from) where.logDate.gte = new Date(from)
    if (to) where.logDate.lte = new Date(to + 'T23:59:59')
  }

  const logs = await db.memorizationLog.findMany({
    where,
    include: {
      student: {
        select: { admissionNumber: true, firstName: true, lastName: true, currentClass: { select: { name: true } } },
      },
    },
    orderBy: [{ student: { currentClass: { order: 'asc' } } }, { student: { firstName: 'asc' } }, { logDate: 'asc' }],
  })

  const studentMap = new Map<string, { admissionNumber: string; name: string; class: string; sessions: number; pages: number; qualityScores: number[] }>()

  for (const log of logs) {
    if (!studentMap.has(log.studentId)) {
      studentMap.set(log.studentId, {
        admissionNumber: log.student.admissionNumber,
        name: `${log.student.firstName} ${log.student.lastName}`,
        class: log.student.currentClass?.name ?? 'Unassigned',
        sessions: 0, pages: 0, qualityScores: [],
      })
    }
    const r = studentMap.get(log.studentId)!
    r.sessions++
    r.pages += Number(log.pages)
    r.qualityScores.push(QUALITY_SCORE[log.quality] ?? 0)
  }

  const generatedAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const subtitle = `${from && to ? `${from} to ${to}` : 'All Dates'} · Generated ${generatedAt}`

  const rows = Array.from(studentMap.values()).map((r) => {
    const avgScore = r.qualityScores.length > 0
      ? Math.round(r.qualityScores.reduce((a, b) => a + b, 0) / r.qualityScores.length)
      : 0
    return { ...r, avgQuality: QUALITY_LABEL[avgScore] ?? '—' }
  })

  const buffer = await renderToBuffer(
    createElement(
      Document, null,
      createElement(Page, { size: 'A4', style: styles.page },
        createElement(Text, { style: styles.title }, 'Memorization Report'),
        createElement(Text, { style: styles.subtitle }, subtitle),

        createElement(View, { style: styles.tableHeader },
          createElement(Text, { style: [styles.headerCell, styles.colNo] }, 'Adm No'),
          createElement(Text, { style: [styles.headerCell, styles.colName] }, 'Student'),
          createElement(Text, { style: [styles.headerCell, styles.colClass] }, 'Class'),
          createElement(Text, { style: [styles.headerCell, styles.colSessions] }, 'Sessions'),
          createElement(Text, { style: [styles.headerCell, styles.colPages] }, 'Pages'),
          createElement(Text, { style: [styles.headerCell, styles.colQuality] }, 'Avg Quality'),
        ),

        ...rows.map((r, i) =>
          createElement(View, { key: r.admissionNumber, style: i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow },
            createElement(Text, { style: [styles.cell, styles.colNo] }, r.admissionNumber),
            createElement(Text, { style: [styles.cell, styles.colName] }, r.name),
            createElement(Text, { style: [styles.cell, styles.colClass] }, r.class),
            createElement(Text, { style: [styles.cell, styles.colSessions] }, String(r.sessions)),
            createElement(Text, { style: [styles.cell, styles.colPages] }, (Math.round(r.pages * 100) / 100).toFixed(2)),
            createElement(Text, { style: [styles.cell, styles.colQuality] }, r.avgQuality),
          )
        ),

        createElement(Text, { style: styles.footer }, 'Abdullahi Bin Masuud Academy — Memorization Report'),
      )
    ) as any
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="memorization-report.pdf"',
    },
  })
}
