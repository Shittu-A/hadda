import Link from 'next/link'

export default function DeactivatedPage() {
  return (
    <div className="min-h-screen bg-coffee-100 flex items-center justify-center px-4 py-6">
      <div className="text-center max-w-md">
        <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">🔒</div>
        <h1 className="text-xl sm:text-2xl font-bold text-coffee-900 mb-3">Account Deactivated</h1>
        <p className="text-coffee-600 mb-6 text-sm sm:text-base px-2">
          Your account has been deactivated. Please contact the school administrator for assistance.
        </p>
        <Link
          href="/login"
          className="text-coffee-700 hover:text-coffee-900 underline text-xs sm:text-sm"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
