'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createUser } from '@/lib/actions/users'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Link from 'next/link'

const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'teacher'], {
    error: 'Role must be admin or teacher',
  }),
})

type CreateUserInput = z.infer<typeof CreateUserSchema>

export default function NewUserPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(CreateUserSchema),
  })

  const onSubmit = async (data: CreateUserInput) => {
    try {
      setIsLoading(true)
      setServerError(null)

      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('email', data.email)
      formData.append('password', data.password)
      formData.append('role', data.role)

      const result = await createUser(formData)

      if (result.success) {
        router.push('/super-admin/users')
      } else {
        setServerError(result.error || 'Failed to create user')
      }
    } catch (error) {
      setServerError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-coffee-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/super-admin/users">
            <Button className="bg-coffee-600 hover:bg-coffee-700 text-white font-semibold py-2 px-4 rounded-md transition-colors">
              Back to Users
            </Button>
          </Link>
        </div>

        <Card className="bg-white border border-coffee-200">
          <CardContent className="p-4 sm:p-8">
            <h1 className="text-2xl font-bold text-coffee-900 mb-6">Create New User</h1>

            {serverError && (
              <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded text-red-800">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-2">
                  Name
                </label>
                <Input
                  type="text"
                  placeholder="Full name"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-coffee-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coffee-500"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  {...register('email')}
                  className="w-full px-3 py-2 border border-coffee-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coffee-500"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  {...register('password')}
                  className="w-full px-3 py-2 border border-coffee-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coffee-500"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-2">
                  Role
                </label>
                <select
                  {...register('role')}
                  className="w-full px-3 py-2 border border-coffee-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coffee-500 bg-white text-coffee-900"
                >
                  <option value="">Select a role</option>
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-coffee-600 hover:bg-coffee-700 disabled:bg-coffee-400 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                >
                  {isLoading ? 'Creating...' : 'Create User'}
                </Button>
                <Link href="/super-admin/users" className="flex-1">
                  <Button
                    type="button"
                    className="w-full bg-coffee-200 hover:bg-coffee-300 text-coffee-900 font-semibold py-2 px-4 rounded-md transition-colors"
                  >
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
