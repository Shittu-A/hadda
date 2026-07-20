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
  colName: { width: '20%' },
  colClass: { width: '11%' },
  colTerm: { width: '12%' },
  colPortion: { width: '25%' },
  colPages: { width: '7%', textAlign: 'right' },
  colPercent: { width: '8%', textAlign: 'center' },
  colGrade: { width: '5%', textAlign: 'center' },
  footer: { marginTop: 20, fontSize: 8, color: '#9ca3af', textAlign: 'center' },
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const classId = searchParams.get('classId') || undefined
  const termId = searchParams.get('termId') || undefined

  // Scoped by term, not by date — one target per student per term.
  const where: any = {}
  if (classId) where.student = { currentClassId: classId }
  if (termId) where.termId = termId

  const [targets, term] = await Promise.all([
    db.memorizationTarget.findMany({
      where,
      include: {
        student: {
          select: { admissionNumber: true, firstName: true, lastName: true, currentClass: { select: { name: true } } },
        },
        term: { select: { name: true, order: true } },
        surahFrom: { select: { nameEnglish: true } },
        surahTo: { select: { nameEnglish: true } },
      },
      orderBy: [
        { student: { currentClass: { order: 'asc' } } },
        { student: { firstName: 'asc' } },
        { term: { order: 'asc' } },
      ],
    }),
    termId ? db.term.findUnique({ where: { id: termId }, select: { name: true } }) : null,
  ])

  const generatedAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const subtitle = `${term?.name ?? 'All Terms'} · Generated ${generatedAt}`

  const rows = targets.map((t) => {
    const percent = t.achievedPercent != null ? Number(t.achievedPercent) : null
    return {
      id: t.id,
      admissionNumber: t.student.admissionNumber,
      name: `${t.student.firstName} ${t.student.lastName}`,
      class: t.student.currentClass?.name ?? 'Unassigned',
      term: t.term.name,
      portion: `${t.surahFrom.nameEnglish} ${t.ayahFrom} - ${t.surahTo.nameEnglish} ${t.ayahTo}`,
      pages: Number(t.targetPages),
      percent: percent != null ? `${percent}%` : '—',
      grade: t.grade ?? '—',
    }
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
          createElement(Text, { style: [styles.headerCell, styles.colTerm] }, 'Term'),
          createElement(Text, { style: [styles.headerCell, styles.colPortion] }, 'Target Portion'),
          createElement(Text, { style: [styles.headerCell, styles.colPages] }, 'Pages'),
          createElement(Text, { style: [styles.headerCell, styles.colPercent] }, 'Achieved'),
          createElement(Text, { style: [styles.headerCell, styles.colGrade] }, 'Grade'),
        ),

        ...rows.map((r, i) =>
          createElement(View, { key: r.id, style: i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow },
            createElement(Text, { style: [styles.cell, styles.colNo] }, r.admissionNumber),
            createElement(Text, { style: [styles.cell, styles.colName] }, r.name),
            createElement(Text, { style: [styles.cell, styles.colClass] }, r.class),
            createElement(Text, { style: [styles.cell, styles.colTerm] }, r.term),
            createElement(Text, { style: [styles.cell, styles.colPortion] }, r.portion),
            createElement(Text, { style: [styles.cell, styles.colPages] }, String(r.pages)),
            createElement(Text, { style: [styles.cell, styles.colPercent] }, r.percent),
            createElement(Text, { style: [styles.cell, styles.colGrade] }, r.grade),
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
