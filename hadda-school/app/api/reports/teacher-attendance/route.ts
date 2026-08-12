import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as XLSX from 'xlsx'
import { getTeacherAttendanceReport } from '@/lib/reports/teacher-attendance'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const teacherRows = await getTeacherAttendanceReport(from, to)

  const rows = teacherRows.map((r) => ({
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
