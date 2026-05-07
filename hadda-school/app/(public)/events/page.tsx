import { db } from '@/lib/db'
import { youtubeToEmbed, formatDate } from '@/lib/utils'
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
      <section className="pt-32 pb-16 bg-coffee-50">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-coffee-900">
            School Events
          </h1>
          <p className="text-xl text-coffee-600 mt-4 max-w-2xl mx-auto">
            Join us for celebrations, competitions, and community gatherings at Hadda School
          </p>
        </div>
      </section>

      {/* Events Grid or Empty State */}
      <div className="flex-1">
        {events.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto px-6 py-12">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white border border-coffee-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* YouTube Embed */}
                  <div className="aspect-video bg-coffee-200">
                    <iframe
                      width="100%"
                      height="100%"
                      src={youtubeToEmbed(event.youtubeUrl)}
                      title={event.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <p className="text-coffee-500 text-sm font-medium">
                      {formatDate(event.eventDate)}
                    </p>
                    <h3 className="font-bold text-coffee-900 mt-2 text-lg line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="text-coffee-600 text-sm mt-2 line-clamp-2">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="max-w-6xl mx-auto px-6 pb-12 flex items-center justify-center gap-4">
                {hasPrevious && (
                  <Link
                    href={`/events?page=${page - 1}`}
                    className="bg-coffee-900 text-white rounded-xl px-4 py-2 font-semibold hover:bg-coffee-800 transition-colors"
                  >
                    Previous
                  </Link>
                )}

                <span className="text-coffee-700 font-medium">
                  Page {page} of {totalPages}
                </span>

                {hasNext && (
                  <Link
                    href={`/events?page=${page + 1}`}
                    className="bg-coffee-900 text-white rounded-xl px-4 py-2 font-semibold hover:bg-coffee-800 transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <p className="text-2xl font-semibold text-coffee-900">No events published yet.</p>
              <p className="text-coffee-600 mt-2">Check back soon for updates!</p>
              <Link
                href="/"
                className="inline-block bg-coffee-900 text-white rounded-xl px-6 py-3 font-semibold hover:bg-coffee-800 transition-colors mt-6"
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
