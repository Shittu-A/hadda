import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { updateUser, changeUserPassword } from '@/lib/actions/users'
import SubmitButton from '@/components/ui/SubmitButton'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await db.user.findUnique({ where: { id } })
  if (!user) notFound()

  async function handleUpdate(formData: FormData) {
    'use server'
    const result = await updateUser(id, formData)
    if (result.success) redirect('/super-admin/users')
  }

  async function handlePasswordChange(formData: FormData) {
    'use server'
    await changeUserPassword(id, formData)
    redirect('/super-admin/users')
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl space-y-6">
      <div>
        <Link href="/super-admin/users" className="text-coffee-500 text-sm hover:text-coffee-700">
          ← Back to Users
        </Link>
        <h1 className="text-2xl font-bold text-coffee-900 mt-2">Edit User</h1>
      </div>

      {/* Update info */}
      <form action={handleUpdate} className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold text-coffee-800 mb-2">User Information</h2>
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Name *</label>
          <input
            name="name"
            required
            defaultValue={user.name}
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Email *</label>
          <input
            name="email"
            type="email"
            required
            defaultValue={user.email}
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Role *</label>
          <select
            name="role"
            defaultValue={user.role === 'super_admin' ? 'admin' : user.role}
            disabled={user.role === 'super_admin'}
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 disabled:bg-coffee-50"
          >
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
          </select>
          {user.role === 'super_admin' && (
            <p className="text-xs text-coffee-400 mt-1">Role cannot be changed for super admin accounts.</p>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-1">
          <Link
            href="/super-admin/users"
            className="border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 text-center"
          >
            Cancel
          </Link>
          <SubmitButton
            pendingText="Saving…"
            disabled={user.role === 'super_admin'}
            className="bg-coffee-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors disabled:opacity-50"
          >
            Save Changes
          </SubmitButton>
        </div>
      </form>

      {/* Change password */}
      <form action={handlePasswordChange} className="bg-white border border-coffee-200 rounded-xl p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold text-coffee-800 mb-2">Change Password</h2>
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">New Password *</label>
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="w-full border border-coffee-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
        </div>
        <div className="flex justify-end">
          <SubmitButton
            pendingText="Saving…"
            className="bg-coffee-700 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-600 transition-colors"
          >
            Change Password
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}
