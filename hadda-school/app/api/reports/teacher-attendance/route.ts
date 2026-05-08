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
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = {}
  if (from || to) {
    where.date = {}
    if (from) where.date.gte = new Date(from)
    if (to) where.date.lte = new Date(to + 'T23:59:59')
  }

  const records = await db.teacherAttendance.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ user: { name: 'asc' } }, { date: 'asc' }],
  })

  type TeacherRow = {
    name: string
    email: string
    present: number
    absent: number
    late: number
    onLeave: number
    total: number
    attendanceRate: string
  }

  const teacherMap = new Map<string, TeacherRow>()

  for (const r of records) {
    const key = r.userId
    if (!teacherMap.has(key)) {
      teacherMap.set(key, {
        name: r.user.name ?? '',
        email: r.user.email ?? '',
        present: 0,
        absent: 0,
        late: 0,
        onLeave: 0,
        total: 0,
        attendanceRate: '0%',
      })
    }
    const row = teacherMap.get(key)!
    row.total++
    if (r.status === 'present') row.present++
    else if (r.status === 'absent') row.absent++
    else if (r.status === 'late') row.late++
    else if (r.status === 'on_leave') row.onLeave++
  }

  for (const row of teacherMap.values()) {
    const attended = row.present + row.late + row.onLeave
    row.attendanceRate = row.total > 0 ? `${Math.round((attended / row.total) * 100)}%` : '—'
  }

  const rows = Array.from(teacherMap.values()).map((r) => ({
    Name: r.name,
    Email: r.email,
    Present: r.present,
    Absent: r.absent,
    Late: r.late,
    'On Leave': r.onLeave,
    'Total Days': r.total,
    'Attendance Rate': r.attendanceRate,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Teacher Attendance')

  const colWidths = Object.keys(rows[0] ?? {}).map((k) => ({ wch: Math.max(k.length, 14) }))
  ws['!cols'] = colWidths

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const dateLabel = from && to ? `${from}_to_${to}` : 'all'
  const filename = `teacher_attendance_${dateLabel}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
