import { db } from '@/lib/db'

export type TeacherAttendanceRow = {
  userId: string
  name: string
  email: string
  present: number
  absent: number
  late: number
  onLeave: number
  total: number
  attendanceRate: string
  latenessRate: string
}

/**
 * Builds per-teacher attendance totals for a date range.
 *
 * TeacherAttendance rows only exist for days someone bothered to mark —
 * a no-show teacher that nobody explicitly marked "absent" simply has no
 * row. Previously that meant they were silently missing from the report
 * instead of counting as absent. To fix that: any date within the range
 * that has at least one attendance record for *any* staff member is
 * treated as a day school was in session, and every active teacher/admin
 * without their own record on that day is counted absent.
 */
export async function getTeacherAttendanceReport(from: string | null, to: string | null): Promise<TeacherAttendanceRow[]> {
  const where: any = {}
  if (from || to) {
    where.date = {}
    if (from) where.date.gte = new Date(from)
    if (to) where.date.lte = new Date(to + 'T23:59:59')
  }

  const [roster, records] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ['teacher', 'admin'] }, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    db.teacherAttendance.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ user: { name: 'asc' } }, { date: 'asc' }],
    }),
  ])

  const schoolDays = new Set(records.map((r) => r.date.toISOString().split('T')[0]))

  const rowMap = new Map<string, TeacherAttendanceRow>()
  for (const t of roster) {
    rowMap.set(t.id, {
      userId: t.id,
      name: t.name ?? '',
      email: t.email ?? '',
      present: 0,
      absent: 0,
      late: 0,
      onLeave: 0,
      total: 0,
      attendanceRate: '0%',
      latenessRate: '0%',
    })
  }

  const recordedByDay = new Map<string, Set<string>>()

  for (const r of records) {
    const day = r.date.toISOString().split('T')[0]
    if (!recordedByDay.has(day)) recordedByDay.set(day, new Set())
    recordedByDay.get(day)!.add(r.userId)

    if (!rowMap.has(r.userId)) {
      // Historical/inactive staff — no roster entry to fill absences for,
      // just tally their explicit records as before.
      rowMap.set(r.userId, {
        userId: r.userId,
        name: r.user.name ?? '',
        email: r.user.email ?? '',
        present: 0,
        absent: 0,
        late: 0,
        onLeave: 0,
        total: 0,
        attendanceRate: '0%',
        latenessRate: '0%',
      })
    }

    const row = rowMap.get(r.userId)!
    row.total++
    if (r.status === 'present') row.present++
    else if (r.status === 'absent') row.absent++
    else if (r.status === 'late') row.late++
    else if (r.status === 'on_leave') row.onLeave++
  }

  // Fill in absences for active roster members on days school was in session
  // but they have no record.
  for (const day of schoolDays) {
    const markedUserIds = recordedByDay.get(day) ?? new Set()
    for (const t of roster) {
      if (markedUserIds.has(t.id)) continue
      const row = rowMap.get(t.id)!
      row.total++
      row.absent++
    }
  }

  for (const row of rowMap.values()) {
    const attended = row.present + row.late + row.onLeave
    row.attendanceRate = row.total > 0 ? `${Math.round((attended / row.total) * 100)}%` : '—'
    // Share of school days the teacher turned up late. Measured against every
    // day school was in session (not just the days they showed up) so it reads
    // on the same scale as the attendance rate beside it.
    row.latenessRate = row.total > 0 ? `${Math.round((row.late / row.total) * 100)}%` : '—'
  }

  return Array.from(rowMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}
