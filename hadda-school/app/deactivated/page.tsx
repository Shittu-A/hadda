import Link from 'next/link'

export default function DeactivatedPage() {
  return (
    <div className="min-h-screen bg-coffee-100 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-2xl font-bold text-coffee-900 mb-3">Account Deactivated</h1>
        <p className="text-coffee-600 mb-6">
          Your account has been deactivated. Please contact the school administrator for assistance.
        </p>
        <Link
          href="/login"
          className="text-coffee-700 hover:text-coffee-900 underline text-sm"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
