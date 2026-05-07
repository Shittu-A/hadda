import Link from 'next/link'

export default function PublicNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-coffee-50/90 backdrop-blur-sm border-b border-coffee-200 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-coffee-900">
          📖 Hadda School
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/events" className="text-coffee-700 hover:text-coffee-900 font-medium transition-colors text-sm">
            Events
          </Link>
          <Link
            href="/login"
            className="bg-coffee-900 text-coffee-100 hover:bg-coffee-800 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
          >
            Staff Login
          </Link>
        </div>
      </div>
    </nav>
  )
}
