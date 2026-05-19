'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavLink {
  href: string
  label: string
  icon?: React.ReactNode
}

interface SidebarProps {
  links: NavLink[]
  role: 'admin' | 'teacher' | 'super_admin'
}

const roleLabels = { admin: 'Administrator', teacher: 'Teacher', super_admin: 'Super Admin' }
const roleHome = { admin: '/admin/dashboard', teacher: '/teacher/dashboard', super_admin: '/super-admin/dashboard' }

export default function Sidebar({ links, role }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:fixed left-0 top-0 w-64 h-screen bg-coffee-900 flex-col z-30 overflow-y-auto">
      <div className="p-6 border-b border-coffee-800">
        <Link href={roleHome[role]} className="block">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Image src="/logo-removebg.png" alt="Logo" width={30} height={30} className="object-contain brightness-200" />
            Abdullahi Bin Masuud Academy
          </h1>
          <p className="text-coffee-400 text-xs mt-1">{roleLabels[role]}</p>
        </Link>
      </div>

      <nav className="flex-1 py-4 space-y-0.5">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 mx-2 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium',
                isActive ? 'bg-coffee-700 text-white' : 'text-coffee-300 hover:bg-coffee-800 hover:text-white'
              )}
            >
              {link.icon && <span>{link.icon}</span>}
              {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
