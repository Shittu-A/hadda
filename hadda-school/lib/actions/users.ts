'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'

const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'teacher'], {
    error: 'Role must be admin or teacher',
  }),
})

const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'teacher'], {
    error: 'Role must be admin or teacher',
  }),
})

const ChangePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function createUser(formData: FormData) {
  try {
    const session = await auth()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    const rawData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
    }

    const validatedData = CreateUserSchema.parse(rawData)

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return { success: false, error: 'Email already exists' }
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10)
    const passwordHash = await bcryptjs.hash(validatedData.password, salt)

    const user = await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
        role: validatedData.role,
        isActive: true,
      },
    })

    await logAudit({
      userId: session.user.id,
      action: 'user.created',
      auditableType: 'User',
      auditableId: user.id,
      description: `Created user: ${validatedData.name} (${validatedData.email})`,
    })

    revalidatePath('/super-admin/users')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to create user' }
  }
}

export async function updateUser(id: string, formData: FormData) {
  try {
    const session = await auth()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    const rawData = {
      name: formData.get('name'),
      email: formData.get('email'),
      role: formData.get('role'),
    }

    const validatedData = UpdateUserSchema.parse(rawData)

    // Check email uniqueness (excluding current user)
    const existingUser = await db.user.findFirst({
      where: {
        email: validatedData.email,
        id: { not: id },
      },
    })

    if (existingUser) {
      return { success: false, error: 'Email already exists' }
    }

    const user = await db.user.update({
      where: { id },
      data: {
        name: validatedData.name,
        email: validatedData.email,
        role: validatedData.role,
      },
    })

    await logAudit({
      userId: session.user.id,
      action: 'user.updated',
      auditableType: 'User',
      auditableId: id,
      description: `Updated user: ${validatedData.name}`,
    })

    revalidatePath('/super-admin/users')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to update user' }
  }
}

export async function toggleUserActive(id: string) {
  try {
    const session = await auth()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    const user = await db.user.findUnique({
      where: { id },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Prevent self-deactivation
    if (id === session.user.id && user.isActive) {
      return { success: false, error: 'Cannot deactivate your own account' }
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    })

    const action = updatedUser.isActive ? 'user.activated' : 'user.deactivated'

    await logAudit({
      userId: session.user.id,
      action,
      auditableType: 'User',
      auditableId: id,
      description: `${action === 'user.activated' ? 'Activated' : 'Deactivated'} user: ${user.name}`,
    })

    revalidatePath('/super-admin/users')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to toggle user status' }
  }
}

export async function changeUserPassword(id: string, formData: FormData) {
  try {
    const session = await auth()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    const rawData = {
      newPassword: formData.get('newPassword'),
    }

    const validatedData = ChangePasswordSchema.parse(rawData)

    // Hash password
    const salt = await bcryptjs.genSalt(10)
    const passwordHash = await bcryptjs.hash(validatedData.newPassword, salt)

    await db.user.update({
      where: { id },
      data: { passwordHash },
    })

    await logAudit({
      userId: session.user.id,
      action: 'user.password_changed',
      auditableType: 'User',
      auditableId: id,
      description: `Changed password for user`,
    })

    revalidatePath('/super-admin/users')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to change password' }
  }
}

