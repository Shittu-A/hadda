import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PublicNav from '@/components/layout/PublicNav'
import PublicFooter from '@/components/layout/PublicFooter'
import { formatDate, youtubeToEmbed } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({ where: { id, isPublished: true } })
  if (!event) notFound()

  return (
    <div className="bg-coffee-50 min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-1 pt-24 sm:pt-32 pb-16 sm:pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link href="/events" className="text-coffee-500 text-sm hover:text-coffee-800 transition-colors">
            ← Back to Events
          </Link>

          <p className="text-coffee-500 text-sm font-medium mt-6">{formatDate(event.eventDate)}</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-coffee-900 mt-2 leading-tight">
            {event.title}
          </h1>

          {event.youtubeUrl && (
            <div className="mt-6 sm:mt-8 aspect-video rounded-2xl overflow-hidden shadow-md">
              <iframe
                src={youtubeToEmbed(event.youtubeUrl)}
                className="w-full h-full"
                allowFullScreen
                title={event.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}

          {event.description && (
            <p className="mt-6 sm:mt-8 text-coffee-700 text-base sm:text-lg leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
