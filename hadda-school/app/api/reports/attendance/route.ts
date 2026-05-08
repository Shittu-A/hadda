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

  // Aggregate per student
  type StudentRow = {
    admissionNumber: string
    firstName: string
    lastName: string
    class: string
    present: number
    absent: number
    late: number
    excused: number
    total: number
    attendanceRate: string
  }

  const studentMap = new Map<string, StudentRow>()

  for (const r of records) {
    const key = r.studentId
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        admissionNumber: r.student.admissionNumber,
        firstName: r.student.firstName,
        lastName: r.student.lastName,
        class: r.class.name,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
        attendanceRate: '0%',
      })
    }
    const row = studentMap.get(key)!
    row.total++
    if (r.status === 'present') row.present++
    else if (r.status === 'absent') row.absent++
    else if (r.status === 'late') row.late++
    else if (r.status === 'excused') row.excused++
  }

  for (const row of studentMap.values()) {
    const attended = row.present + row.late + row.excused
    row.attendanceRate = row.total > 0 ? `${Math.round((attended / row.total) * 100)}%` : '—'
  }

  const rows = Array.from(studentMap.values()).map((r) => ({
    'Admission No': r.admissionNumber,
    'First Name': r.firstName,
    'Last Name': r.lastName,
    Class: r.class,
    Present: r.present,
    Absent: r.absent,
    Late: r.late,
    Excused: r.excused,
    'Total Days': r.total,
    'Attendance Rate': r.attendanceRate,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance')

  // Auto column widths
  const colWidths = Object.keys(rows[0] ?? {}).map((k) => ({ wch: Math.max(k.length, 12) }))
  ws['!cols'] = colWidths

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const dateLabel = from && to ? `${from}_to_${to}` : 'all'
  const filename = `attendance_${dateLabel}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
