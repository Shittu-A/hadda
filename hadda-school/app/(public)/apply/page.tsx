'use client'

import { useRef, useState, useTransition } from 'react'
import PublicNav from '@/components/layout/PublicNav'
import PublicFooter from '@/components/layout/PublicFooter'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { submitApplication } from '@/lib/actions/applications'

export default function ApplyPage() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [applicantId, setApplicantId] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await submitApplication(formData)
      if (result.success) {
        setApplicantId(result.applicantId ?? 'submitted')
        formRef.current?.reset()
      } else {
        setError(result.error ?? 'Failed to submit application.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }

  if (applicantId) {
    return (
      <div className="min-h-screen bg-coffee-50">
        <PublicNav />
        <section className="pt-24 sm:pt-32 pb-16 sm:pb-24">
          <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
            <div className="bg-white border border-coffee-200 rounded-2xl p-8 sm:p-12">
              <p className="text-5xl mb-4">✅</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-coffee-900">Application Submitted!</h1>
              <p className="text-coffee-600 mt-3 text-sm sm:text-base">
                Thank you for applying to Abdullahi Bin Masuud Academy. Our admissions team will review your
                application and contact you via the phone number you provided regarding next steps, including any
                interview.
              </p>
              <Button className="mt-8" onClick={() => setApplicantId(null)}>
                Submit Another Application
              </Button>
            </div>
          </div>
        </section>
        <PublicFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-coffee-50">
      <PublicNav />

      <section className="pt-24 sm:pt-32 pb-8 sm:pb-12 bg-coffee-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">Admissions</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-coffee-900 mt-2">Study Application Form</h1>
          <p className="text-coffee-600 mt-3 text-sm sm:text-base px-2">
            Apply online for admission to Abdullahi Bin Masuud Academy. Fill in the form below and our team will
            reach out to you.
          </p>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="bg-white border border-coffee-200 rounded-2xl p-6 sm:p-8">
            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-6">
                {error}
              </p>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" encType="multipart/form-data">
              <Input label="Full Name *" name="fullName" required placeholder="e.g. Aisha Muhammad Bello" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Gender *" name="gender" required defaultValue="">
                  <option value="" disabled>Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </Select>
                <Select label="Marital Status *" name="maritalStatus" required defaultValue="">
                  <option value="" disabled>Select status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Date of Birth" name="dateOfBirth" type="date" max={new Date().toISOString().split('T')[0]} />
                <Input label="Phone Number *" name="phone" type="tel" required placeholder="e.g. 08012345678" />
              </div>

              <Input label="Place of Residence *" name="residence" required placeholder="e.g. Anguwan Alkali, Zaria" />

              <Input
                label="Number of Hizb Memorized from the Qur'an"
                name="hizbMemorized"
                type="number"
                min={0}
                max={60}
                placeholder="e.g. 5"
              />

              <Input label="Name of Former School" name="formerSchool" placeholder="Optional" />

              <Textarea
                label="Reason for Leaving Former School"
                name="reasonForLeaving"
                rows={3}
                placeholder="Optional"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-coffee-100">
                <Input label="Guardian Name *" name="guardianName" required placeholder="Parent / Guardian full name" />
                <Input label="Guardian Phone *" name="guardianPhone" type="tel" required placeholder="e.g. 08012345678" />
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-900 mb-1.5">Passport Photograph</label>
                <input
                  type="file"
                  name="photo"
                  accept="image/png,image/jpeg,image/webp"
                  className="w-full text-sm text-coffee-700 file:mr-4 file:rounded-xl file:border-0 file:bg-coffee-900 file:text-coffee-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-coffee-800 file:cursor-pointer cursor-pointer"
                />
                <p className="text-coffee-400 text-xs mt-1">A clear passport-style photo (JPG, PNG or WEBP, max 5MB).</p>
              </div>

              {/* Undertaking */}
              <div className="bg-coffee-50 border border-coffee-200 rounded-xl p-4 sm:p-5">
                <h3 className="font-bold text-red-600 text-sm mb-2">Undertaking</h3>
                <p className="text-coffee-700 text-xs sm:text-sm leading-relaxed">
                  I the applicant do hereby testify and confirm all the foregoing information is true and correct. I
                  further undertake to abide by the rules and regulations of the school as listed in the admission
                  letter. In case of any violation, the school has the right to take any action it deems fit.
                </p>
                <label className="flex items-start gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" name="agree" required className="mt-1 accent-coffee-900" />
                  <span className="text-coffee-900 text-sm font-medium">
                    I agree to the undertaking above *
                  </span>
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Submitting…' : 'Submit Application'}
              </Button>
            </form>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
