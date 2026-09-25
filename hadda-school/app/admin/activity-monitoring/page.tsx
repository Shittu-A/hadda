import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'

function day(value: string) { return new Date(`${value}T00:00:00`) }

export default async function ActivityMonitoringPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requirePermission('activity_monitoring_view')
  const sp = await searchParams
  const selectedDate = sp.date || new Date().toISOString().slice(0, 10)
  const date = day(selectedDate)
  // Admins who are assigned a class this year are teachers too and are monitored alongside them.
  const teachers = await db.user.findMany({
    where: { isActive: true, OR: [{ role: 'teacher' }, { role: 'admin', taughtClasses: { some: { class: { academicYear: { isCurrent: true } } } } }] }, orderBy: { name: 'asc' },
    include: { taughtClasses: { where: { class: { academicYear: { isCurrent: true } } }, include: { class: { select: { id: true, name: true } } } } },
  })
  const classIds = teachers.flatMap(t => t.taughtClasses.map(c => c.classId))
  const [attendance, photos, teacherAttendance, currentTerm] = await Promise.all([
    db.studentAttendance.findMany({ where: { date, classId: { in: classIds } }, select: { classId: true, recordedById: true } }),
    db.classAttendancePhoto.findMany({ where: { attendanceDate: date }, select: { userId: true, status: true } }),
    db.teacherAttendance.findMany({ where: { date }, select: { userId: true, status: true } }),
    db.term.findFirst({ where: { isCurrent: true }, select: { id: true } }),
  ])
  const targets = currentTerm ? await db.memorizationTarget.findMany({ where: { termId: currentTerm.id }, select: { teacherId: true, achievedPercent: true } }) : []
  const attendanceClasses = new Set(attendance.map(a => a.classId))
  const photoByTeacher = new Map(photos.map(photo => [photo.userId, photo.status]))
  const staffByTeacher = new Map(teacherAttendance.map(record => [record.userId, record.status]))
  const targetsByTeacher = new Map<string, { total: number; completed: number }>()
  for (const target of targets) { const value = targetsByTeacher.get(target.teacherId) ?? { total: 0, completed: 0 }; value.total++; if (target.achievedPercent !== null) value.completed++; targetsByTeacher.set(target.teacherId, value) }
  const submitted = teachers.filter(t => t.taughtClasses.length > 0 && t.taughtClasses.every(c => attendanceClasses.has(c.classId))).length

  return <div className="p-4 sm:p-6 space-y-6">
    <div className="flex flex-col sm:flex-row justify-between gap-3"><div><h1 className="text-2xl font-bold text-coffee-900">Admin Activity Monitoring</h1><p className="text-sm text-coffee-600">Daily teacher attendance and required work at a glance.</p></div><form><input type="date" name="date" defaultValue={selectedDate} max={new Date().toISOString().slice(0, 10)} className="border border-coffee-200 rounded-lg px-3 py-2 text-sm" /><button className="ml-2 bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm">View</button></form></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div className="bg-white border border-coffee-200 rounded-xl p-4"><p className="text-2xl font-bold">{submitted}/{teachers.length}</p><p className="text-xs text-coffee-500">Teachers with class attendance submitted</p></div><div className="bg-white border border-coffee-200 rounded-xl p-4"><p className="text-2xl font-bold">{teachers.length - submitted}</p><p className="text-xs text-coffee-500">Still pending attendance</p></div><div className="bg-white border border-coffee-200 rounded-xl p-4"><p className="text-2xl font-bold">{photos.filter(p => p.status === 'verified').length}</p><p className="text-xs text-coffee-500">Verified class-photo submissions</p></div></div>
    <div className="bg-white border border-coffee-200 rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-coffee-50"><tr><th className="text-left p-3">Teacher / class</th><th className="text-left p-3">Class attendance</th><th className="text-left p-3">Photo</th><th className="text-left p-3">Staff attendance</th><th className="text-left p-3">Termly task status</th></tr></thead><tbody className="divide-y divide-coffee-100">{teachers.map(teacher => { const classesDone = teacher.taughtClasses.length > 0 && teacher.taughtClasses.every(c => attendanceClasses.has(c.classId)); const target = targetsByTeacher.get(teacher.id); return <tr key={teacher.id}><td className="p-3"><p className="font-medium text-coffee-900">{teacher.name}</p><p className="text-xs text-coffee-500">{teacher.taughtClasses.map(c => c.class.name).join(', ') || 'No current class'}</p></td><td className="p-3"><Badge variant={classesDone ? 'success' : 'warning'}>{classesDone ? 'Submitted' : 'Pending'}</Badge></td><td className="p-3"><Badge variant={photoByTeacher.get(teacher.id) === 'verified' ? 'success' : photoByTeacher.has(teacher.id) ? 'warning' : 'neutral'}>{photoByTeacher.get(teacher.id) ?? 'Not submitted'}</Badge></td><td className="p-3"><Badge variant={staffByTeacher.get(teacher.id) === 'present' ? 'success' : staffByTeacher.has(teacher.id) ? 'warning' : 'neutral'}>{staffByTeacher.get(teacher.id)?.replace('_', ' ') ?? 'Not marked'}</Badge></td><td className="p-3">{target ? <span>{target.completed}/{target.total} graded</span> : <span className="text-coffee-400">No targets set</span>}</td></tr> })}</tbody></table></div>
    <p className="text-xs text-coffee-500">Termly task status uses the existing memorization target and grade workflow. <Link className="underline" href="/admin/memorization">View memorization</Link></p>
  </div>
}
