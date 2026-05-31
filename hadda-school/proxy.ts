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
    pathname.startsWith('/events/') ||
    pathname === '/pay' ||
    pathname.startsWith('/pay/') ||
    pathname.startsWith('/api/pay/') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/deactivated'

  if (isPublic) return NextResponse.next()

  const redirectTo = (path: string) => {
    const url = req.nextUrl.clone()
    url.pathname = path
    return NextResponse.redirect(url)
  }

  if (!session) {
    return redirectTo('/login')
  }

  if (!session.user.isActive && pathname !== '/deactivated') {
    return redirectTo('/deactivated')
  }

  const role = session.user.role

  if (pathname.startsWith('/super-admin') && role !== 'super_admin') {
    return redirectTo('/')
  }

  if (pathname.startsWith('/admin') && role !== 'admin' && role !== 'super_admin') {
    return redirectTo('/')
  }

  if (pathname.startsWith('/teacher') && role !== 'teacher' && role !== 'admin' && role !== 'super_admin') {
    return redirectTo('/')
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|pdf)).*)'],
}
