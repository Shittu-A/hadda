import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Badge from '@/components/ui/Badge'

export default async function TeacherProfilesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const teachers = await db.user.findMany({
    where: { role: 'teacher', isActive: true },
    include: { profile: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Teacher Profiles</h1>
          <p className="text-coffee-600 text-sm mt-0.5">Manage public-facing teacher profile cards</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((teacher) => (
          <div key={teacher.id} className="bg-white border border-coffee-200 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {teacher.profile?.photoUrl ? (
                <Image
                  src={teacher.profile.photoUrl}
                  alt={teacher.name}
                  width={48}
                  height={48}
                  className="rounded-full object-cover border border-coffee-200"
                  unoptimized
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-coffee-100 border border-coffee-200 flex items-center justify-center shrink-0">
                  <span className="text-coffee-500 font-bold text-lg">{teacher.name[0]}</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-coffee-900 text-sm truncate">{teacher.name}</p>
                {teacher.profile?.specialization ? (
                  <p className="text-coffee-500 text-xs truncate">{teacher.profile.specialization}</p>
                ) : (
                  <p className="text-coffee-400 text-xs italic">No specialization</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {teacher.profile ? (
                <Badge variant="success">Profile set</Badge>
              ) : (
                <Badge variant="neutral">No profile</Badge>
              )}
              {teacher.profile?.awardTitle && (
                <Badge variant="warning">Award</Badge>
              )}
              {teacher.profile?.videoUrl && (
                <Badge variant="info">Video</Badge>
              )}
            </div>

            <Link
              href={`/admin/teacher-profiles/${teacher.id}`}
              className="block w-full text-center border border-coffee-200 text-coffee-700 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-coffee-50 transition-colors mt-auto"
            >
              {teacher.profile ? 'Edit Profile' : 'Create Profile'}
            </Link>
          </div>
        ))}

        {teachers.length === 0 && (
          <div className="col-span-3 text-center py-12 text-coffee-400">
            No teachers found. Add teachers first via User Management.
          </div>
        )}
      </div>
    </div>
  )
}
