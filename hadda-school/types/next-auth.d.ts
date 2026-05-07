import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'super_admin' | 'admin' | 'teacher'
      isActive: boolean
    } & DefaultSession['user']
  }
  interface User {
    role: 'super_admin' | 'admin' | 'teacher'
    isActive: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'super_admin' | 'admin' | 'teacher'
    isActive: boolean
  }
}
