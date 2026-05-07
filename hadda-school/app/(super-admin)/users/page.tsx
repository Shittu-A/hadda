import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { toggleUserActive } from '@/lib/actions/users'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'

async function handleToggle(formData: FormData): Promise<void> {
  'use server'
  const id = formData.get('id') as string
  await toggleUserActive(id)
}

const ROLE_VARIANT: Record<string, 'success' | 'info' | 'neutral'> = {
  super_admin: 'success',
  admin: 'info',
  teacher: 'neutral',
}

export default async function UsersPage() {
  const users = await db.user.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Users</h1>
          <p className="text-coffee-600 text-sm mt-0.5">{users.length} staff accounts</p>
        </div>
        <Link
          href="/super-admin/users/new"
          className="bg-coffee-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors"
        >
          + Add User
        </Link>
      </div>

      <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-coffee-50 border-b border-coffee-200">
            <tr>
              <th className="text-left px-5 py-3 text-coffee-700 font-semibold">Name</th>
              <th className="text-left px-5 py-3 text-coffee-700 font-semibold">Email</th>
              <th className="text-left px-5 py-3 text-coffee-700 font-semibold">Role</th>
              <th className="text-left px-5 py-3 text-coffee-700 font-semibold">Status</th>
              <th className="text-left px-5 py-3 text-coffee-700 font-semibold">Joined</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-coffee-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-coffee-400">No users yet.</td>
              </tr>
            ) : (
              users.map((user) => {
                return (
                  <tr key={user.id} className="hover:bg-coffee-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-coffee-900">{user.name}</td>
                    <td className="px-5 py-3 text-coffee-600">{user.email}</td>
                    <td className="px-5 py-3">
                      <Badge variant={ROLE_VARIANT[user.role] ?? 'neutral'}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-coffee-500">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/super-admin/users/${user.id}/edit`}
                          className="text-xs font-medium text-coffee-600 hover:text-coffee-900 border border-coffee-200 rounded-lg px-3 py-1.5 hover:bg-coffee-50 transition-colors"
                        >
                          Edit
                        </Link>
                        {user.role !== 'super_admin' && (
                          <form action={handleToggle}>
                            <input type="hidden" name="id" value={user.id} />
                            <button
                              type="submit"
                              className={`text-xs font-medium border rounded-lg px-3 py-1.5 transition-colors ${
                                user.isActive
                                  ? 'text-orange-600 border-orange-200 hover:bg-orange-50'
                                  : 'text-green-600 border-green-200 hover:bg-green-50'
                              }`}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
