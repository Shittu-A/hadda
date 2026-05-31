'use client'

import { Bell, LogOut, Menu, X } from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface NavLink {
  href: string
  label: string
  icon?: React.ReactNode
}

interface TopnavProps {
  user: { name: string; role: string }
  notificationCount?: number
  links: NavLink[]
  role: 'admin' | 'teacher' | 'super_admin'
}

const roleHome = { admin: '/admin', teacher: '/teacher', super_admin: '/super-admin' }
const roleLabels = { admin: 'Administrator', teacher: 'Teacher', super_admin: 'Super Admin' }

export default function Topnav({ user, notificationCount = 0, links, role }: TopnavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close drawer on navigation
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const notifHref =
    role === 'teacher' ? '/teacher/notifications'
    : role === 'super_admin' ? '/super-admin/notifications'
    : '/admin/notifications'

  return (
    <>
      <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-white border-b border-coffee-200 flex items-center justify-between md:justify-end px-4 md:px-6 z-20">
        {/* Mobile: hamburger + logo */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="text-coffee-700 hover:text-coffee-900 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <Link href={roleHome[role]} className="text-sm font-semibold text-coffee-900 hover:text-coffee-600">
            ABMA
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link href={notifHref} className="relative text-coffee-600 hover:text-coffee-900 transition-colors">
            <Bell size={22} />
            {notificationCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Link>

          <div className="hidden sm:block border-l border-coffee-200 pl-4">
            <p className="text-sm font-semibold text-coffee-900 leading-none truncate">{user.name}</p>
            <p className="text-xs text-coffee-500 mt-0.5">{user.role.replace('_', ' ')}</p>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="hidden sm:flex items-center gap-1.5 text-coffee-600 hover:text-coffee-900 text-sm transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="sm:hidden text-coffee-600 hover:text-coffee-900 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-72 bg-coffee-900 z-50 flex flex-col transition-transform duration-300 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-coffee-800">
          <div>
            <p className="text-sm font-bold text-white">Abdullahi Bin Masuud Academy</p>
            <p className="text-coffee-400 text-xs mt-0.5">{roleLabels[role]}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-coffee-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 mx-2 px-4 py-3 rounded-lg transition-colors text-sm font-medium',
                  isActive ? 'bg-coffee-700 text-white' : 'text-coffee-300 hover:bg-coffee-800 hover:text-white'
                )}
              >
                {link.icon && <span>{link.icon}</span>}
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-coffee-800">
          <div className="mb-3 px-2">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-coffee-400 mt-0.5">{user.role.replace('_', ' ')}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 text-coffee-300 hover:text-white text-sm transition-colors px-2 py-1.5"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
