import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { balanceInclude, computeStudentBalance } from '@/lib/fees/balance'

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query) return NextResponse.json({ error: 'Query is required' }, { status: 400 })

  const trimmed = query.trim()
  const commonInclude = balanceInclude

  // First: try exact admission number match
  const byAdmission = await db.student.findFirst({
    where: { admissionNumber: { equals: trimmed, mode: 'insensitive' }, deletedAt: null, status: 'active' },
    include: commonInclude,
  })

  const paystackSetting = await db.setting.findUnique({ where: { key: 'paystack_public_key' } })
  const paystackKey = paystackSetting?.value || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || null

  if (byAdmission) {
    return NextResponse.json({ student: computeStudentBalance(byAdmission), paystackKey })
  }

  // Fall back: phone number — may match multiple students
  const byPhone = await db.student.findMany({
    where: { deletedAt: null, status: 'active', guardians: { some: { phone: trimmed } } },
    include: commonInclude,
    orderBy: [{ firstName: 'asc' }],
  })

  if (byPhone.length === 0) {
    return NextResponse.json({ error: 'No student found with that admission number or phone number.' }, { status: 404 })
  }

  if (byPhone.length === 1) {
    return NextResponse.json({ student: computeStudentBalance(byPhone[0]), paystackKey })
  }

  return NextResponse.json({ students: byPhone.map((s) => computeStudentBalance(s)), paystackKey })
}
