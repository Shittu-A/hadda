import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const classId = searchParams.get('classId') || undefined
  const termId = searchParams.get('termId') || undefined

  // Memorization is recorded once per term, so the report is scoped by term
  // rather than by a date range.
  const where: any = {}
  if (classId) where.student = { currentClassId: classId }
  if (termId) where.termId = termId

  const [targets, term] = await Promise.all([
    db.memorizationTarget.findMany({
      where,
      include: {
        student: {
          select: {
            admissionNumber: true,
            firstName: true,
            lastName: true,
            currentClass: { select: { name: true } },
          },
        },
        teacher: { select: { name: true } },
        term: { select: { name: true, order: true, academicYear: { select: { name: true } } } },
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

  const rows = targets.map((t) => {
    const percent = t.achievedPercent != null ? Number(t.achievedPercent) : null
    return {
      'Admission No': t.student.admissionNumber,
      'First Name': t.student.firstName,
      'Last Name': t.student.lastName,
      Class: t.student.currentClass?.name ?? 'Unassigned',
      'Academic Year': t.term.academicYear.name,
      Term: t.term.name,
      'Target Portion': `${t.surahFrom.nameEnglish} ${t.ayahFrom} - ${t.surahTo.nameEnglish} ${t.ayahTo}`,
      'Target Pages': Number(t.targetPages),
      'Achieved (%)': percent ?? '—',
      Grade: t.grade ?? '—',
      Status: percent != null ? 'Graded' : 'Awaiting grade',
      Teacher: t.teacher.name,
      Remark: t.remark ?? t.notes ?? '',
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Memorization')

  const colWidths = Object.keys(rows[0] ?? {}).map((k) => ({ wch: Math.max(k.length, 12) }))
  ws['!cols'] = colWidths

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const label = term?.name?.replace(/\s+/g, '_').toLowerCase() ?? 'all_terms'
  const filename = `memorization_${label}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
