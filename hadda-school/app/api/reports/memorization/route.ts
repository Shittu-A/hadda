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
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = {}
  if (classId) {
    where.student = { currentClassId: classId }
  }
  if (from || to) {
    where.logDate = {}
    if (from) where.logDate.gte = new Date(from)
    if (to) where.logDate.lte = new Date(to + 'T23:59:59')
  }

  const logs = await db.memorizationLog.findMany({
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
    },
    orderBy: [{ student: { currentClass: { order: 'asc' } } }, { student: { firstName: 'asc' } }, { logDate: 'asc' }],
  })

  // Aggregate per student
  type StudentRow = {
    admissionNumber: string
    firstName: string
    lastName: string
    class: string
    sabaqSessions: number
    sabaqPages: number
    sabqiSessions: number
    sabqiPages: number
    manzilSessions: number
    manzilPages: number
    totalSessions: number
    totalPages: number
    avgQuality: string
  }

  const studentMap = new Map<string, StudentRow & { qualityScores: number[] }>()
  const QUALITY_SCORE: Record<string, number> = { excellent: 4, good: 3, average: 2, weak: 1 }

  for (const log of logs) {
    const key = log.studentId
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        admissionNumber: log.student.admissionNumber,
        firstName: log.student.firstName,
        lastName: log.student.lastName,
        class: log.student.currentClass?.name ?? 'Unassigned',
        sabaqSessions: 0,
        sabaqPages: 0,
        sabqiSessions: 0,
        sabqiPages: 0,
        manzilSessions: 0,
        manzilPages: 0,
        totalSessions: 0,
        totalPages: 0,
        avgQuality: '—',
        qualityScores: [],
      })
    }
    const row = studentMap.get(key)!
    const pages = Number(log.pages)
    row.totalSessions++
    row.totalPages += pages
    row.qualityScores.push(QUALITY_SCORE[log.quality] ?? 0)

    if (log.type === 'sabaq') { row.sabaqSessions++; row.sabaqPages += pages }
    else if (log.type === 'sabqi') { row.sabqiSessions++; row.sabqiPages += pages }
    else if (log.type === 'manzil') { row.manzilSessions++; row.manzilPages += pages }
  }

  const QUALITY_LABEL = ['', 'Weak', 'Average', 'Good', 'Excellent']

  const rows = Array.from(studentMap.values()).map((r) => {
    const avgScore =
      r.qualityScores.length > 0
        ? Math.round(r.qualityScores.reduce((a, b) => a + b, 0) / r.qualityScores.length)
        : 0
    return {
      'Admission No': r.admissionNumber,
      'First Name': r.firstName,
      'Last Name': r.lastName,
      Class: r.class,
      'Sabaq Sessions': r.sabaqSessions,
      'Sabaq Pages': Math.round(r.sabaqPages * 100) / 100,
      'Sabqi Sessions': r.sabqiSessions,
      'Sabqi Pages': Math.round(r.sabqiPages * 100) / 100,
      'Manzil Sessions': r.manzilSessions,
      'Manzil Pages': Math.round(r.manzilPages * 100) / 100,
      'Total Sessions': r.totalSessions,
      'Total Pages': Math.round(r.totalPages * 100) / 100,
      'Avg Quality': QUALITY_LABEL[avgScore] ?? '—',
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Memorization')

  const colWidths = Object.keys(rows[0] ?? {}).map((k) => ({ wch: Math.max(k.length, 12) }))
  ws['!cols'] = colWidths

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const dateLabel = from && to ? `${from}_to_${to}` : 'all'
  const filename = `memorization_${dateLabel}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
