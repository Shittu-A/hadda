import type { Metadata } from 'next'
import PublicNav from '@/components/layout/PublicNav'
import PublicFooter from '@/components/layout/PublicFooter'

const APP_NAME = 'Abubakar Umar Balarabe Quran'
const PACKAGE_NAME = 'com.balarabe.quran'
const DEVELOPER = 'Fasaha Global Enterprises'
const DEVELOPER_EMAIL = 'fasahaglobalenterprises@gmail.com'
const DEVELOPER_SITE = 'https://fasahaglobalenterprises.com.ng/'
const LAST_UPDATED = 'November 13, 2026'

export const metadata: Metadata = {
  title: `Privacy Policy — ${APP_NAME}`,
  description: `Privacy policy for ${APP_NAME}, an offline Qur'an recitation app by ${DEVELOPER}. The app does not collect any personal data.`,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">{title}</h2>
      {children}
    </div>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-coffee-50">
      <PublicNav />

      <section className="pt-24 sm:pt-32 pb-8 sm:pb-12 bg-coffee-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">{APP_NAME}</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-coffee-900 mt-2">Privacy Policy</h1>
          <p className="text-coffee-600 mt-3 text-sm sm:text-base">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-10 text-sm text-amber-800">
            <strong>In short:</strong> {APP_NAME}, published by {DEVELOPER}, plays Qur&apos;an recitations
            offline on your device. It does not collect, store, share, or transmit any personal data, usage
            data, or identifiers.
          </div>

          <div className="space-y-8 text-coffee-700 text-sm sm:text-base leading-relaxed">
            <Section title="Who we are">
              <p>
                This policy applies to the Android app <strong>{APP_NAME}</strong> (package name{' '}
                <code>{PACKAGE_NAME}</code>) (&quot;the App&quot;), published on Google Play by{' '}
                <strong>{DEVELOPER}</strong> (&quot;we&quot;, &quot;us&quot;). The App plays Qur&apos;an
                recitations by Abubakar Umar Balarabe, a Qur&apos;an teacher at Abdullahi Bin Masuud Academy.
              </p>
              <ul className="list-none mt-3 space-y-1">
                <li>Developer: {DEVELOPER}</li>
                <li>
                  Email: <a className="underline" href={`mailto:${DEVELOPER_EMAIL}`}>{DEVELOPER_EMAIL}</a>
                </li>
                <li>
                  Website: <a className="underline" href={DEVELOPER_SITE}>{DEVELOPER_SITE}</a>
                </li>
              </ul>
            </Section>

            <Section title="Information we collect">
              <p>We do not collect any personal data. Specifically, the App does not collect, store, or transmit:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Your name, email address, phone number, or any contact information</li>
                <li>Device identifiers, advertising IDs, or location</li>
                <li>Usage analytics, crash reports, or listening history</li>
                <li>Any account, login, or profile information — the App has none</li>
              </ul>
              <p className="mt-2">
                Your preferences (such as theme, playback speed, and last played surah) are saved only on your
                device and never leave it.
              </p>
            </Section>

            <Section title="How we use information">
              <p>Because we collect no personal data, we do not use, sell, or share any.</p>
            </Section>

            <Section title="Offline functionality and internet access">
              <p>
                The recitations are built into the App and play without an internet connection. The App may
                connect to the internet only to download app updates (code and content fixes) from our update
                server. These requests contain no personal information.
              </p>
            </Section>

            <Section title="Permissions">
              <p>
                The App requests only the permissions needed to play audio, including playing in the background
                and showing playback controls in the notification area. It does not request access to your
                contacts, camera, microphone, or location.
              </p>
            </Section>

            <Section title="Third parties">
              <p>
                The App does not integrate third-party analytics, advertising networks, or tracking software of
                any kind. No data is shared with advertisers, analytics providers, or any other third party.
              </p>
            </Section>

            <Section title="Data retention and deletion">
              <p>
                We hold no personal data about you, so there is nothing for us to retain or delete. Preferences
                stored on your device are removed when you clear the App&apos;s data or uninstall the App. If you
                have any question about your data, email us at {DEVELOPER_EMAIL} and we will respond.
              </p>
            </Section>

            <Section title="Children's privacy">
              <p>
                The App is suitable for listeners of all ages, including children. It does not knowingly collect
                personal information from anyone, including children under 13.
              </p>
            </Section>

            <Section title="Changes to this policy">
              <p>
                If this policy changes — for example, if a future version of the App introduces a feature that
                involves data — we will update this page and the &quot;Last updated&quot; date above.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions about this policy can be sent to {DEVELOPER} at{' '}
                <a className="underline" href={`mailto:${DEVELOPER_EMAIL}`}>{DEVELOPER_EMAIL}</a>.
              </p>
            </Section>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
