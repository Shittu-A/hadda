import type { Metadata } from 'next'
import PublicNav from '@/components/layout/PublicNav'
import PublicFooter from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
  title: 'Privacy Policy — Abdullahi Bin Masuud Academy',
  description: 'How Abdullahi Bin Masuud Academy handles student and visitor data.',
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
          <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">Legal</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-coffee-900 mt-2">Privacy Policy</h1>
          <p className="text-coffee-600 mt-3 text-sm sm:text-base">Last updated: {lastUpdated}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-10 text-sm text-amber-800">
            <strong>In short:</strong> our public website does not use analytics, advertising, or tracking
            cookies, and does not collect personal information from visitors beyond what you choose to submit
            through forms such as admissions applications or fee payments.
          </div>

          <div className="space-y-8 text-coffee-700 text-sm sm:text-base leading-relaxed">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Overview</h2>
              <p>
                This policy covers the public website of Abdullahi Bin Masuud Academy, a Quran memorization
                school. It explains what information we collect when you browse the site, apply for admission,
                or pay school fees, and how that information is used.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Browsing the site</h2>
              <p>
                Pages such as our homepage, events, and teacher profiles can be viewed without creating an
                account. We do not use analytics, advertising, or tracking cookies, and we do not collect
                device identifiers or browsing history on these pages.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Admissions applications</h2>
              <p>
                When you submit an admission application through the Apply page, we collect the information
                you provide — such as a student&apos;s name and guardian contact details — solely to process
                the application and communicate with you about it. This information is not sold or shared with
                advertisers.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Fee payments</h2>
              <p>
                Fee payments are processed through Paystack, a third-party payment provider. We share only the
                information necessary to complete the transaction (such as the amount due and the student it
                relates to); Paystack handles payment card details directly and in accordance with its own
                privacy policy.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Staff and student accounts</h2>
              <p>
                Teachers, administrators, and students who are enrolled at the Academy use a separate login
                area to manage attendance, memorization targets, and school records. Information entered there
                is used only for running the school and is accessible only to authorized staff.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Children&apos;s privacy</h2>
              <p>
                As a school for students of varying ages, we collect the minimum information needed from a
                parent or guardian to admit and educate a student, and we do not use that information for any
                purpose beyond running the school.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Changes to this policy</h2>
              <p>
                If this policy changes, the update will be posted on this page with a revised &quot;Last
                updated&quot; date above.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-coffee-400 mb-2">Contact</h2>
              <p>
                Questions about this policy can be directed to the Academy through the contact details on our
                homepage.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
