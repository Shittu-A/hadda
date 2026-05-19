export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { youtubeVideoId, formatDate } from '@/lib/utils'
import PublicNav from '@/components/layout/PublicNav'
import PublicFooter from '@/components/layout/PublicFooter'
import Link from 'next/link'

interface PageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function EventsPage({ searchParams }: PageProps) {
  // Pagination setup
  const page = Number(searchParams?.page ?? 1)
  const take = 12
  const skip = (page - 1) * take

  // Fetch events and total count
  const [events, total] = await Promise.all([
    db.event.findMany({
      where: { isPublished: true },
      orderBy: { eventDate: 'desc' },
      skip,
      take,
    }),
    db.event.count({
      where: { isPublished: true },
    }),
  ])

  const totalPages = Math.ceil(total / take)
  const hasPrevious = page > 1
  const hasNext = page < totalPages

  return (
    <div className="bg-coffee-50 min-h-screen flex flex-col">
      {/* Navigation */}
      <PublicNav />

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 bg-coffee-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-coffee-900">
            School Events
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-coffee-600 mt-3 sm:mt-4 max-w-2xl mx-auto px-2">
            Join us for celebrations, competitions, and community gatherings at Abdullahi Bin Masuud Academy
          </p>
        </div>
      </section>

      {/* Events Grid or Empty State */}
      <div className="flex-1">
        {events.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
              {events.map((event: any) => {
                const videoId = youtubeVideoId(event.youtubeUrl)
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="bg-white border border-coffee-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group block"
                  >
                    <div className="aspect-video bg-coffee-100 relative overflow-hidden">
                      {videoId ? (
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-coffee-400 text-sm">No preview</div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 bg-black/60 rounded-full flex items-center justify-center group-hover:bg-black/80 transition-colors">
                          <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 sm:p-6">
                      <p className="text-coffee-500 text-xs sm:text-sm font-medium">
                        {formatDate(event.eventDate)}
                      </p>
                      <h3 className="font-bold text-coffee-900 mt-2 text-base sm:text-lg line-clamp-2">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-coffee-600 text-xs sm:text-sm mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                {hasPrevious && (
                  <Link
                    href={`/events?page=${page - 1}`}
                    className="bg-coffee-900 text-white rounded-xl px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base hover:bg-coffee-800 transition-colors"
                  >
                    Previous
                  </Link>
                )}

                <span className="text-coffee-700 font-medium text-sm sm:text-base">
                  Page {page} of {totalPages}
                </span>

                {hasNext && (
                  <Link
                    href={`/events?page=${page + 1}`}
                    className="bg-coffee-900 text-white rounded-xl px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base hover:bg-coffee-800 transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-16 sm:py-24 px-4">
            <div className="text-center max-w-md">
              <p className="text-xl sm:text-2xl font-semibold text-coffee-900">No events published yet.</p>
              <p className="text-coffee-600 mt-2 text-sm sm:text-base">Check back soon for updates!</p>
              <Link
                href="/"
                className="inline-block bg-coffee-900 text-white rounded-xl px-5 sm:px-6 py-2 sm:py-3 font-semibold text-sm sm:text-base hover:bg-coffee-800 transition-colors mt-6"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <PublicFooter />
    </div>
  )
}
