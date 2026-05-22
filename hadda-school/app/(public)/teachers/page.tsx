import { db } from '@/lib/db'
import PublicNav from '@/components/layout/PublicNav'
import PublicFooter from '@/components/layout/PublicFooter'
import Image from 'next/image'

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1)
      if (id) return `https://www.youtube.com/embed/${id}`
    }
  } catch {
    // ignore invalid URLs
  }
  return null
}

export default async function TeachersPage() {
  const teachers = await db.user.findMany({
    where: { role: 'teacher', isActive: true, profile: { isNot: null } },
    include: { profile: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="min-h-screen bg-coffee-50">
      <PublicNav />

      <section className="pt-24 sm:pt-32 pb-8 sm:pb-12 bg-coffee-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">Faculty</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-coffee-900 mt-2">Our Teachers</h1>
          <p className="text-coffee-600 mt-3 text-sm sm:text-base">Dedicated scholars and educators committed to excellence in Quranic memorization</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {teachers.length === 0 ? (
            <div className="text-center py-16 text-coffee-400">
              <p className="text-4xl mb-3">📚</p>
              <p>Teacher profiles coming soon.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {teachers.map((teacher) => {
                const p = teacher.profile!
                const embedUrl = p.videoUrl ? getYoutubeEmbedUrl(p.videoUrl) : null

                return (
                  <div key={teacher.id} className="bg-white border border-coffee-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-0">
                      {/* Left: photo + basic info */}
                      <div className="sm:w-64 bg-coffee-50 p-6 flex flex-col items-center text-center gap-3 shrink-0 border-b sm:border-b-0 sm:border-r border-coffee-200">
                        {p.photoUrl ? (
                          <Image
                            src={p.photoUrl}
                            alt={teacher.name}
                            width={120}
                            height={120}
                            className="rounded-full object-cover border-2 border-coffee-300 w-28 h-28"
                            unoptimized
                          />
                        ) : (
                          <div className="w-28 h-28 rounded-full bg-coffee-200 border-2 border-coffee-300 flex items-center justify-center">
                            <span className="text-coffee-600 font-bold text-4xl">{teacher.name[0]}</span>
                          </div>
                        )}
                        <div>
                          <h2 className="font-bold text-coffee-900 text-lg leading-tight">{teacher.name}</h2>
                          {p.specialization && (
                            <p className="text-coffee-500 text-sm mt-1">{p.specialization}</p>
                          )}
                        </div>
                        {p.awardTitle && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 w-full">
                            <p className="font-semibold">🏆 {p.awardTitle}</p>
                            {p.awardDesc && <p className="mt-1 text-amber-700">{p.awardDesc}</p>}
                          </div>
                        )}
                      </div>

                      {/* Right: bio + video */}
                      <div className="flex-1 p-6 space-y-4">
                        {p.bio && (
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">About</h3>
                            <p className="text-coffee-700 text-sm leading-relaxed">{p.bio}</p>
                          </div>
                        )}

                        {embedUrl && (
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Musabaqah Video</h3>
                            <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                              <iframe
                                src={embedUrl}
                                title={`${teacher.name} — Musabaqah`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full rounded-xl"
                              />
                            </div>
                          </div>
                        )}

                        {!p.bio && !embedUrl && (
                          <p className="text-coffee-400 text-sm italic">Profile details coming soon.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
