import type { Metadata } from 'next'
import PublicNav from '@/components/layout/PublicNav'
import PublicFooter from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
  title: 'Privacy Policy — Abdullahi Umar Balarabe Quran',
  description: 'Abdullahi Umar Balarabe Quran is an offline recitation app that does not collect any data.',
}

const lastUpdated = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-coffee-50">
      <PublicNav />

      <section className="pt-24 sm:pt-32 pb-8 sm:pb-12 bg-coffee-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">Abdullahi Umar Balarabe Quran</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-coffee-900 mt-2">Privacy Policy</h1>
          <p className="text-coffee-600 mt-3 text-sm sm:text-base">Last updated: {lastUpdated}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-10 text-sm text-amber-800">
            <strong>In short:</strong> Abdullahi Umar Balarabe Quran plays recitations entirely offline on your
            device. It does not collect, store, or transmit any personal data, usage data, or identifiers.
          </div>

          <div className="space-y-8 text-coffee-700 text-sm sm:text-base leading-relaxed">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Overview</h2>
              <p>
                Abdullahi Umar Balarabe Quran (&quot;the App&quot;) lets listeners play Quran recitations by
                Abdullahi Umar Balarabe, a teacher at Abdullahi Bin Masuud Academy. The App works offline, with
                no accounts, no servers, and no data collection — this policy explains exactly what that means.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Information we collect</h2>
              <p>We do not collect any personal data. Specifically, the App does not collect, store, or transmit:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Your name, email address, or any contact information</li>
                <li>Device identifiers, advertising IDs, or location</li>
                <li>Usage analytics, crash reports, or listening history</li>
                <li>Any account, login, or profile information — the App has none</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Offline functionality</h2>
              <p>
                Recitations play directly from audio bundled with or downloaded into the App. Once downloaded,
                playback does not require an internet connection, and no record of what you listen to or when
                is kept anywhere, on the device or off it.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Permissions</h2>
              <p>
                The App requests only the device permissions strictly necessary to play and, where applicable,
                download audio (such as storage access). It does not request access to your contacts, camera,
                microphone, or location.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Third parties</h2>
              <p>
                The App does not integrate third-party analytics, advertising networks, or tracking software of
                any kind. Because no data is collected, none is shared with advertisers, analytics providers, or
                any other third party.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Children&apos;s privacy</h2>
              <p>
                The App is suitable for listeners of all ages, including children, because it does not
                knowingly collect any personal information from anyone, regardless of age.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Changes to this policy</h2>
              <p>
                If this policy ever changes — for example, if a future version of the App introduces a feature
                that involves data collection — this page will be updated, and the &quot;Last updated&quot; date
                above will reflect the change.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Contact</h2>
              <p>
                Questions about this policy can be directed to Abdullahi Bin Masuud Academy through the contact
                details on our homepage.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
