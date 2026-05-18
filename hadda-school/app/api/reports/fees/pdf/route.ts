import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { createElement } from 'react'

export const dynamic = 'force-dynamic'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#6b7280', marginBottom: 20 },
  section: { marginBottom: 16 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3ede6',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#d6c5b0',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ede8e1',
  },
  tableRowAlt: { backgroundColor: '#faf7f4' },
  headerCell: { fontFamily: 'Helvetica-Bold', color: '#4a3728' },
  cell: { color: '#3d2b1f' },
  colName: { width: '28%' },
  colClass: { width: '14%' },
  colFee: { width: '18%' },
  colDue: { width: '12%', textAlign: 'right' },
  colPaid: { width: '12%', textAlign: 'right' },
  colOutstanding: { width: '16%', textAlign: 'right' },
  statusPaid: { color: '#16a34a' },
  statusPartial: { color: '#d97706' },
  statusUnpaid: { color: '#dc2626' },
  footer: { marginTop: 20, fontSize: 8, color: '#9ca3af', textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 20 },
  summaryLabel: { fontSize: 9, color: '#6b7280' },
  summaryValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#3d2b1f' },
})

type FeeRow = {
  admissionNumber: string
  name: string
  className: string
  feeName: string
  netDue: number
  paid: number
  outstanding: number
  status: string
}

function FeeReportDoc({ rows, generatedAt, yearName }: { rows: FeeRow[]; generatedAt: string; yearName: string }) {
  const totalDue = rows.reduce((s, r) => s + r.netDue, 0)
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0)
  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0)

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'A4', style: styles.page },
      createElement(Text, { style: styles.title }, 'Fee Collection Report'),
      createElement(Text, { style: styles.subtitle }, `${yearName} · Generated ${generatedAt}`),

      // Table header
      createElement(
        View,
        { style: styles.tableHeader },
        createElement(Text, { style: [styles.headerCell, styles.colName] }, 'Student'),
        createElement(Text, { style: [styles.headerCell, styles.colClass] }, 'Class'),
        createElement(Text, { style: [styles.headerCell, styles.colFee] }, 'Fee'),
        createElement(Text, { style: [styles.headerCell, styles.colDue] }, 'Net Due'),
        createElement(Text, { style: [styles.headerCell, styles.colPaid] }, 'Paid'),
        createElement(Text, { style: [styles.headerCell, styles.colOutstanding] }, 'Outstanding'),
      ),

      // Rows
      ...rows.map((r, i) =>
        createElement(
          View,
          { key: r.admissionNumber + r.feeName, style: i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow },
          createElement(
            View,
            { style: styles.colName },
            createElement(Text, { style: styles.cell }, r.name),
            createElement(Text, { style: { fontSize: 7, color: '#9ca3af' } }, r.admissionNumber),
          ),
          createElement(Text, { style: [styles.cell, styles.colClass] }, r.className),
          createElement(Text, { style: [styles.cell, styles.colFee] }, r.feeName),
          createElement(Text, { style: [styles.cell, styles.colDue] }, fmt(r.netDue)),
          createElement(Text, { style: [styles.cell, styles.colPaid] }, fmt(r.paid)),
          createElement(
            Text,
            {
              style: [
                styles.colOutstanding,
                r.status === 'Paid' ? styles.statusPaid : r.status === 'Partial' ? styles.statusPartial : styles.statusUnpaid,
              ],
            },
            r.outstanding <= 0 ? 'Paid ✓' : fmt(r.outstanding),
          ),
        )
      ),

      // Totals
      createElement(
        View,
        { style: styles.summaryRow },
        createElement(
          View,
          { style: { alignItems: 'flex-end' } },
          createElement(Text, { style: styles.summaryLabel }, `Total Due: ${fmt(totalDue)}`),
          createElement(Text, { style: styles.summaryLabel }, `Total Paid: ${fmt(totalPaid)}`),
          createElement(Text, { style: [styles.summaryLabel, { color: totalOutstanding > 0 ? '#dc2626' : '#16a34a' }] }, `Outstanding: ${fmt(totalOutstanding)}`),
        ),
      ),

      createElement(Text, { style: styles.footer }, 'Abdullahi Bin Masuud Academy Management System'),
    )
  )
}

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

  const [students, year] = await Promise.all([
    db.student.findMany({
      where: studentWhere,
      include: {
        currentClass: { select: { name: true } },
        academicYear: { select: { name: true } },
        feeAssignments: {
          include: { feeStructure: { select: { id: true, name: true, amount: true } } },
        },
        feePayments: true,
        feeDiscounts: true,
      },
      orderBy: [{ currentClass: { order: 'asc' } }, { firstName: 'asc' }],
    }),
    yearId ? db.academicYear.findUnique({ where: { id: yearId }, select: { name: true } }) : null,
  ])

  const rows: FeeRow[] = []

  for (const s of students) {
    const feeMap = new Map<string, { name: string; amount: number }>()
    for (const fa of s.feeAssignments) {
      if (!feeMap.has(fa.feeStructureId)) {
        feeMap.set(fa.feeStructureId, { name: fa.feeStructure.name, amount: Number(fa.feeStructure.amount) })
      }
    }
    if (feeMap.size === 0) continue

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
        admissionNumber: s.admissionNumber,
        name: `${s.firstName} ${s.lastName}`,
        className: s.currentClass?.name ?? 'Unassigned',
        feeName: fee.name,
        netDue: Math.round(netDue * 100) / 100,
        paid: Math.round(paid * 100) / 100,
        outstanding: Math.round(outstanding * 100) / 100,
        status: outstanding <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid',
      })
    }
  }

  const generatedAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const yearName = year?.name ?? 'All Years'

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(FeeReportDoc, { rows, generatedAt, yearName }) as any
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="fee-collection-report.pdf"',
    },
  })
}
