import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const yearId = searchParams.get('yearId') || undefined
  const classId = searchParams.get('classId') || undefined

  const studentWhere: any = { deletedAt: null }
  if (yearId) studentWhere.academicYearId = yearId
  if (classId) studentWhere.currentClassId = classId

  const students = await db.student.findMany({
    where: studentWhere,
    include: {
      currentClass: { select: { name: true } },
      academicYear: { select: { name: true } },
      feeAssignments: {
        include: { feeStructure: { select: { id: true, name: true, amount: true } } },
      },
      feePayments: {
        include: { feeStructure: { select: { id: true, name: true } } },
      },
      feeDiscounts: true,
    },
    orderBy: [{ currentClass: { order: 'asc' } }, { firstName: 'asc' }],
  })

  // Collect applicable fee structures per student (student-level assignments)
  type FeeRow = {
    'Admission No': string
    'First Name': string
    'Last Name': string
    Class: string
    'Academic Year': string
    'Fee Name': string
    'Fee Amount (₦)': number
    'Discount (₦)': number
    'Net Due (₦)': number
    'Amount Paid (₦)': number
    'Outstanding (₦)': number
    Status: string
  }

  const rows: FeeRow[] = []

  for (const s of students) {
    const feeMap = new Map<string, { name: string; amount: number }>()
    for (const fa of s.feeAssignments) {
      if (!feeMap.has(fa.feeStructureId)) {
        feeMap.set(fa.feeStructureId, {
          name: fa.feeStructure.name,
          amount: Number(fa.feeStructure.amount),
        })
      }
    }

    if (feeMap.size === 0) {
      rows.push({
        'Admission No': s.admissionNumber,
        'First Name': s.firstName,
        'Last Name': s.lastName,
        Class: s.currentClass?.name ?? 'Unassigned',
        'Academic Year': s.academicYear.name,
        'Fee Name': '—',
        'Fee Amount (₦)': 0,
        'Discount (₦)': 0,
        'Net Due (₦)': 0,
        'Amount Paid (₦)': 0,
        'Outstanding (₦)': 0,
        Status: 'No fees assigned',
      })
      continue
    }

    for (const [feeId, fee] of feeMap) {
      const discount = s.feeDiscounts.find((d) => d.feeStructureId === feeId)
      const discountAmt = discount
        ? discount.discountType === 'percent'
          ? (fee.amount * Number(discount.value)) / 100
          : Number(discount.value)
        : 0
      const netDue = Math.max(0, fee.amount - discountAmt)
      const paid = s.feePayments
        .filter((p) => p.feeStructureId === feeId)
        .reduce((sum, p) => sum + Number(p.amountPaid), 0)
      const outstanding = Math.max(0, netDue - paid)

      rows.push({
        'Admission No': s.admissionNumber,
        'First Name': s.firstName,
        'Last Name': s.lastName,
        Class: s.currentClass?.name ?? 'Unassigned',
        'Academic Year': s.academicYear.name,
        'Fee Name': fee.name,
        'Fee Amount (₦)': fee.amount,
        'Discount (₦)': Math.round(discountAmt * 100) / 100,
        'Net Due (₦)': Math.round(netDue * 100) / 100,
        'Amount Paid (₦)': Math.round(paid * 100) / 100,
        'Outstanding (₦)': Math.round(outstanding * 100) / 100,
        Status: outstanding <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid',
      })
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Fee Collection')

  const colWidths = Object.keys(rows[0] ?? {}).map((k) => ({ wch: Math.max(k.length, 14) }))
  ws['!cols'] = colWidths

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="fee-collection-report.xlsx"',
    },
  })
}
