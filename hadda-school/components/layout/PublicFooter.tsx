import Link from 'next/link'
import Image from 'next/image'

export default function PublicFooter() {
  return (
    <footer className="bg-coffee-900 text-coffee-300 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col items-center sm:items-center sm:justify-between gap-4 text-center sm:text-left">
        <span className="flex items-center gap-2 text-base sm:text-lg font-bold text-white justify-center sm:justify-start">
          <Image src="/logo-removebg.png" alt="Logo" width={32} height={32} className="object-contain brightness-200" />
          Abdullahi Bin Masuud Academy
        </span>
        <p className="text-xs sm:text-sm">© {new Date().getFullYear()} Abdullahi Bin Masuud Academy. All rights reserved.</p>
        <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap justify-center">
          <Link href="/events" className="hover:text-white transition-colors">Events</Link>
          <Link href="/pay" className="hover:text-white transition-colors">Pay Fees</Link>
        </div>
      </div>
    </footer>
  )
}
