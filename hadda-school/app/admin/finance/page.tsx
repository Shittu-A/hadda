import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Coins, Receipt, PiggyBank, HandCoins, Banknote } from 'lucide-react'

export default async function FinanceOverviewPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

  const [
    feeTotal,
    incomeTotal,
    expenseTotal,
    feesThisMonth,
    incomeThisMonth,
    expensesThisMonth,
    recentExpenses,
    recentIncome,
  ] = await Promise.all([
    db.feePayment.aggregate({ _sum: { amountPaid: true } }),
    db.incomeEntry.aggregate({ _sum: { amount: true } }),
    db.expense.aggregate({ _sum: { amount: true } }),
    db.feePayment.aggregate({
      where: { paymentDate: { gte: monthStart, lte: monthEnd } },
      _sum: { amountPaid: true },
    }),
    db.incomeEntry.aggregate({
      where: { incomeDate: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    db.expense.aggregate({
      where: { expenseDate: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    db.expense.findMany({
      take: 5,
      orderBy: { expenseDate: 'desc' },
      include: { recordedBy: { select: { name: true } } },
    }),
    db.incomeEntry.findMany({
      take: 5,
      orderBy: { incomeDate: 'desc' },
      include: { recordedBy: { select: { name: true } } },
    }),
  ])

  const totalFees = Number(feeTotal._sum.amountPaid ?? 0)
  const totalOtherIncome = Number(incomeTotal._sum.amount ?? 0)
  const totalIncome = totalFees + totalOtherIncome
  const totalExpenses = Number(expenseTotal._sum.amount ?? 0)
  const balance = totalIncome - totalExpenses

  const monthIncome =
    Number(feesThisMonth._sum.amountPaid ?? 0) + Number(incomeThisMonth._sum.amount ?? 0)
  const monthExpenses = Number(expensesThisMonth._sum.amount ?? 0)

  const headline = [
    {
      label: 'Total Income',
      value: formatCurrency(totalIncome),
      sub: `Fees ${formatCurrency(totalFees)} · Other ${formatCurrency(totalOtherIncome)}`,
      icon: Coins,
      color: 'text-green-700',
      bg: 'bg-green-50',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      sub: `This month ${formatCurrency(monthExpenses)}`,
      icon: Receipt,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Available Balance',
      value: formatCurrency(balance),
      sub: 'Income − Expenses (all time)',
      icon: PiggyBank,
      color: balance >= 0 ? 'text-coffee-700' : 'text-red-600',
      bg: balance >= 0 ? 'bg-coffee-50' : 'bg-red-50',
    },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Finance Overview</h1>
          <p className="text-coffee-600 text-sm mt-0.5">All-time income, expenses, and available balance</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/admin/finance/income"
            className="text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
          >
            Manage Income →
          </Link>
          <Link
            href="/admin/finance/expenses"
            className="text-center border border-coffee-200 text-coffee-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-coffee-50 transition-colors"
          >
            Manage Expenses →
          </Link>
        </div>
      </div>

      {/* Headline figures */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {headline.map((s) => (
          <div key={s.label} className="bg-white border border-coffee-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl ${s.bg} ${s.color} shrink-0`}>
                <s.icon size={20} />
              </div>
              <p className="text-sm font-medium text-coffee-500">{s.label}</p>
            </div>
            <p className="text-2xl font-bold text-coffee-900 leading-tight break-words">{s.value}</p>
            <p className="text-xs text-coffee-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* This-month strip */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm bg-white border border-coffee-200 rounded-xl px-5 py-3">
        <span className="text-coffee-600">
          This month income:{' '}
          <span className="font-semibold text-green-700">{formatCurrency(monthIncome)}</span>
        </span>
        <span className="text-coffee-600">
          This month expenses:{' '}
          <span className="font-semibold text-red-600">{formatCurrency(monthExpenses)}</span>
        </span>
        <span className="text-coffee-600">
          Net this month:{' '}
          <span className="font-semibold text-coffee-900">{formatCurrency(monthIncome - monthExpenses)}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent income */}
        <div className="bg-white border border-coffee-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-coffee-800 flex items-center gap-2">
              <HandCoins size={16} className="text-green-700" /> Recent Other Income
            </h2>
            <Link href="/admin/finance/income" className="text-xs text-coffee-400 hover:text-coffee-700">View all →</Link>
          </div>
          {recentIncome.length === 0 ? (
            <p className="text-coffee-400 text-sm">No manual income recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentIncome.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-coffee-900 truncate">{i.source}</p>
                    <p className="text-xs text-coffee-400 capitalize">{i.category}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-medium text-green-700">{formatCurrency(Number(i.amount))}</p>
                    <p className="text-xs text-coffee-400">{formatDate(i.incomeDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-coffee-400 mt-4 flex items-center gap-1.5 pt-3 border-t border-coffee-100">
            <Banknote size={13} /> Fee payments are also counted as income.
            <Link href="/admin/fees/payments" className="text-coffee-600 hover:text-coffee-800 underline">View fees →</Link>
          </p>
        </div>

        {/* Recent expenses */}
        <div className="bg-white border border-coffee-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-coffee-800 flex items-center gap-2">
              <Receipt size={16} className="text-red-600" /> Recent Expenses
            </h2>
            <Link href="/admin/finance/expenses" className="text-xs text-coffee-400 hover:text-coffee-700">View all →</Link>
          </div>
          {recentExpenses.length === 0 ? (
            <p className="text-coffee-400 text-sm">No expenses recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentExpenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-coffee-900 truncate">{e.name}</p>
                    <p className="text-xs text-coffee-400 capitalize">{e.category}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-medium text-red-600">{formatCurrency(Number(e.amount))}</p>
                    <p className="text-xs text-coffee-400">{formatDate(e.expenseDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
