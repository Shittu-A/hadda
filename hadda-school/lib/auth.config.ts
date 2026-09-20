import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.isActive = (user as any).isActive
        token.permissions = (user as any).permissions ?? []
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as any
        session.user.isActive = token.isActive as boolean
        session.user.permissions = (token.permissions as any) ?? []
      }
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
}
