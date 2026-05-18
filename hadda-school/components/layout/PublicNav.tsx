import Link from 'next/link'
import Image from 'next/image'

export default function PublicNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-coffee-50/90 backdrop-blur-sm border-b border-coffee-200 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <Image src="/logo-removebg.png" alt="Logo" width={36} height={36} className="object-contain flex-shrink-0" />
          <span className="text-sm sm:text-lg font-bold text-coffee-900 leading-tight truncate">Abdullahi Bin Masuud Academy</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
          <Link href="/events" className="text-coffee-700 hover:text-coffee-900 font-medium transition-colors text-xs sm:text-sm">
            Events
          </Link>
          <Link
            href="/login"
            className="bg-coffee-900 text-coffee-100 hover:bg-coffee-800 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
          >
            Staff Login
          </Link>
        </div>
      </div>
    </nav>
  )
}
