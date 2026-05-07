import Link from 'next/link'

export default function PublicFooter() {
  return (
    <footer className="bg-coffee-900 text-coffee-300 py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xl font-bold text-white">📖 Hadda School</span>
        <p className="text-sm">© {new Date().getFullYear()} Hadda School. All rights reserved.</p>
        <div className="flex gap-4 text-sm">
          <Link href="/events" className="hover:text-white transition-colors">Events</Link>
          <Link href="/pay" className="hover:text-white transition-colors">Pay Fees</Link>
        </div>
      </div>
    </footer>
  )
}
