'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export async function createExpense(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const name = (formData.get('name') as string)?.trim()
  const category = formData.get('category') as string
  const amount = parseFloat(formData.get('amount') as string)
  const expenseDate = formData.get('expenseDate') as string
  const note = (formData.get('note') as string)?.trim() || null

  if (!name || !category || !expenseDate || isNaN(amount) || amount <= 0) {
    return { success: false, error: 'All required fields must be filled' }
  }

  const expense = await db.expense.create({
    data: {
      name,
      category: category as any,
      amount,
      expenseDate: new Date(expenseDate),
      note,
      recordedById: session.user.id,
    },
  })

  await logAudit({
    userId: session.user.id,
    action: 'expense.created',
    auditableType: 'Expense',
    auditableId: expense.id,
    description: `Recorded expense: ${name} (${category}) — ₦${amount}`,
  })

  revalidatePath('/admin/finance')
  revalidatePath('/admin/finance/expenses')
  return { success: true }
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string
  const expense = await db.expense.findUnique({ where: { id }, select: { name: true } })
  if (!expense) return

  await db.expense.delete({ where: { id } })

  await logAudit({
    userId: session.user.id,
    action: 'expense.deleted',
    auditableType: 'Expense',
    auditableId: id,
    description: `Deleted expense: ${expense.name}`,
  })

  revalidatePath('/admin/finance')
  revalidatePath('/admin/finance/expenses')
}

export async function createIncome(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const source = (formData.get('source') as string)?.trim()
  const category = formData.get('category') as string
  const amount = parseFloat(formData.get('amount') as string)
  const incomeDate = formData.get('incomeDate') as string
  const note = (formData.get('note') as string)?.trim() || null

  if (!source || !category || !incomeDate || isNaN(amount) || amount <= 0) {
    return { success: false, error: 'All required fields must be filled' }
  }

  const income = await db.incomeEntry.create({
    data: {
      source,
      category: category as any,
      amount,
      incomeDate: new Date(incomeDate),
      note,
      recordedById: session.user.id,
    },
  })

  await logAudit({
    userId: session.user.id,
    action: 'income.created',
    auditableType: 'IncomeEntry',
    auditableId: income.id,
    description: `Recorded income: ${source} (${category}) — ₦${amount}`,
  })

  revalidatePath('/admin/finance')
  revalidatePath('/admin/finance/income')
  return { success: true }
}

export async function deleteIncome(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session) return

  const id = formData.get('id') as string
  const income = await db.incomeEntry.findUnique({ where: { id }, select: { source: true } })
  if (!income) return

  await db.incomeEntry.delete({ where: { id } })

  await logAudit({
    userId: session.user.id,
    action: 'income.deleted',
    auditableType: 'IncomeEntry',
    auditableId: id,
    description: `Deleted income: ${income.source}`,
  })

  revalidatePath('/admin/finance')
  revalidatePath('/admin/finance/income')
}
