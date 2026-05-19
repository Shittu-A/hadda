'use client'

import { Bell, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

interface TopnavProps {
  user: { name: string; role: string }
  notificationCount?: number
}

export default function Topnav({ user, notificationCount = 0 }: TopnavProps) {
  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-white border-b border-coffee-200 flex items-center justify-between md:justify-end px-4 md:px-6 z-20">
      <Link href={user.role === 'teacher' ? '/teacher/dashboard' : user.role === 'super_admin' ? '/super-admin/dashboard' : '/admin/dashboard'} className="md:hidden text-sm font-semibold text-coffee-900 hover:text-coffee-600">ABMA</Link>
      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href={user.role === 'teacher' ? '/teacher/notifications' : user.role === 'super_admin' ? '/super-admin/notifications' : '/admin/notifications'}
          className="relative text-coffee-600 hover:text-coffee-900 transition-colors"
        >
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
  )
}
