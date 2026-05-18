import NextAuth from 'next-auth'
import { authConfig } from './lib/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  const isPublic =
    pathname === '/' ||
    pathname === '/events' ||
    pathname === '/pay' ||
    pathname.startsWith('/pay/') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/deactivated'

  if (isPublic) return NextResponse.next()

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (!session.user.isActive && pathname !== '/deactivated') {
    return NextResponse.redirect(new URL('/deactivated', req.url))
  }

  const role = session.user.role

  if (pathname.startsWith('/super-admin') && role !== 'super_admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (pathname.startsWith('/admin') && role !== 'admin' && role !== 'super_admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (pathname.startsWith('/teacher') && role !== 'teacher' && role !== 'admin' && role !== 'super_admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2)).*)'],
}
