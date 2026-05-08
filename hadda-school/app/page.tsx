export const dynamic = 'force-dynamic'

import PublicNav from '@/components/layout/PublicNav'
import PublicFooter from '@/components/layout/PublicFooter'
import { db } from '@/lib/db'
import { youtubeToEmbed, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function LandingPage() {
  const events = await db.event.findMany({
    where: { isPublished: true },
    orderBy: { eventDate: 'desc' },
    take: 3,
  })

  return (
    <div className="min-h-screen bg-coffee-50">
      <PublicNav />

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-coffee-300 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-coffee-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 text-center relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500 mb-4">Hafiz Academy</p>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-coffee-900 leading-tight">
            Where Every Heart<br />Finds Its Verse
          </h1>
          <p className="text-coffee-600 text-xl mt-6 max-w-2xl mx-auto">
            A Quran memorization school dedicated to nurturing the next generation of Huffadh with care, structure, and love.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <Link href="/pay" className="bg-coffee-900 text-coffee-100 hover:bg-coffee-800 rounded-xl px-6 py-3 font-medium transition-colors">
              Pay School Fees
            </Link>
            <a href="#about" className="border-2 border-coffee-300 text-coffee-700 hover:border-coffee-500 rounded-xl px-6 py-3 font-medium transition-colors">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-coffee-900 py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '500+', label: 'Students' },
            { value: '120+', label: 'Graduates' },
            { value: '30+', label: 'Teachers' },
            { value: '10+', label: 'Years' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-extrabold text-white">{s.value}</p>
              <p className="text-coffee-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">About Us</p>
            <h2 className="text-4xl font-bold text-coffee-900 mt-2">Nurturing Huffadh Since Day One</h2>
            <p className="text-coffee-600 mt-4 leading-relaxed">
              Hadda School is a dedicated Quran memorization institution built on the belief that every child has
              the capacity to become a Hafiz or Hafiza. Our structured curriculum, caring teachers, and modern
              management system ensure every student reaches their full potential.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Small class sizes for individual attention',
                'Daily Sabaq, Sabqi & Manzil tracking',
                'Transparent fee management for parents',
                'Regular parent progress updates',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-coffee-700">
                  <span className="text-green-600 font-bold mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-coffee-900 rounded-2xl p-8">
            <p className="text-3xl text-coffee-200 text-right leading-relaxed" dir="rtl">
              خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
            </p>
            <p className="text-coffee-300 italic mt-6 text-sm">
              &quot;The best of you are those who learn the Quran and teach it.&quot;
            </p>
            <p className="text-coffee-400 text-xs mt-2">— The Prophet Muhammad ﷺ (Sahih al-Bukhari)</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-coffee-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">Why Choose Us</p>
            <h2 className="text-4xl font-bold text-coffee-900 mt-2">Everything Your Child Needs to Succeed</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '📊', title: 'Daily Progress Tracking', desc: "Real-time monitoring of each student's sabaq, sabqi, and manzil sessions." },
              { icon: '👥', title: 'Small Class Sizes', desc: 'Personalized attention for every student to ensure optimal memorization.' },
              { icon: '🛡️', title: 'Safe Environment', desc: 'A nurturing, structured environment designed for focused learning.' },
              { icon: '🎯', title: 'Tajweed Excellence', desc: 'Proper pronunciation and recitation rules taught alongside memorization.' },
              { icon: '🎓', title: 'Graduated Promotion', desc: 'Structured progression through levels as students advance.' },
              { icon: '💳', title: 'Transparent Fee Management', desc: 'Clear fee structure with online payment option for parents.' },
            ].map((f) => (
              <div key={f.title} className="bg-white border border-coffee-200 rounded-2xl p-6 hover:border-coffee-400 hover:shadow-md transition-all">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-coffee-900">{f.title}</h3>
                <p className="text-coffee-600 text-sm mt-2">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      {events.length > 0 && (
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">Latest Events</p>
              <h2 className="text-4xl font-bold text-coffee-900 mt-2">School Highlights</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {events.map((event) => (
                <div key={event.id} className="bg-white border border-coffee-200 rounded-2xl overflow-hidden hover:border-coffee-400 hover:shadow-md transition-all">
                  <div className="aspect-video">
                    <iframe
                      src={youtubeToEmbed(event.youtubeUrl)}
                      className="w-full h-full"
                      allowFullScreen
                      title={event.title}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-coffee-500 text-xs">{formatDate(event.eventDate)}</p>
                    <h3 className="font-bold text-coffee-900 mt-1">{event.title}</h3>
                    {event.description && (
                      <p className="text-coffee-600 text-sm mt-1 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/events" className="border-2 border-coffee-300 text-coffee-700 hover:border-coffee-500 rounded-xl px-6 py-3 font-medium transition-colors inline-block">
                See All Events
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-coffee-900 rounded-3xl p-12 text-center">
          <p className="text-coffee-300 italic text-lg max-w-2xl mx-auto">
            &quot;Alhamdulillah, the school&apos;s online system makes it so easy to track my child&apos;s progress and pay fees from anywhere.&quot;
          </p>
          <p className="text-coffee-400 text-sm mt-2">— Parent, 2024</p>
          <h2 className="text-3xl font-bold text-white mt-8">Ready to Enroll?</h2>
          <div className="flex flex-wrap gap-4 justify-center mt-6">
            <Link href="/pay" className="bg-white text-coffee-900 hover:bg-coffee-100 rounded-xl px-6 py-3 font-medium transition-colors">
              Pay Fees Online
            </Link>
            <Link href="/login" className="border-2 border-coffee-400 text-coffee-200 hover:border-coffee-300 rounded-xl px-6 py-3 font-medium transition-colors">
              Staff Portal
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
