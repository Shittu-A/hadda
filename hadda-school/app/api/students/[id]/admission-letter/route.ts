import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image as PdfImage } from '@react-pdf/renderer'
import { createElement } from 'react'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

// US-Letter page in points (72dpi), matching the 2550x3300 (300dpi) background template's aspect ratio.
const PAGE_W = 612
const PAGE_H = 792

// Read as a Buffer (not a path string) — @react-pdf/image's local-path resolver mis-parses
// Windows paths like "C:\..." (the drive letter is read as a URL protocol), so a plain path
// string silently fails there. A Buffer bypasses that resolver entirely and works everywhere.
const BG_BUFFER = fs.readFileSync(path.join(process.cwd(), 'public/templates/admission-letter-bg.jpg'))

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica' },
  bg: { position: 'absolute', top: 0, left: 0, width: PAGE_W, height: PAGE_H },
  field: { position: 'absolute', fontSize: 12, color: '#1a1a1a', fontFamily: 'Helvetica-Bold' },
  photo: {
    position: 'absolute',
    left: 441,
    top: 321,
    width: 86,
    height: 87,
    objectFit: 'cover',
  },
})

interface LetterData {
  fullName: string
  className: string
  admissionNumber: string
  photoUrl: string | null
}

function AdmissionLetterDoc({ data }: { data: LetterData }) {
  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'LETTER', style: styles.page },

      // Background template (letterhead, curriculum, fees, rules — all baked into the image).
      // fixed = removed from layout flow so it can't force a page break.
      createElement(PdfImage, { src: BG_BUFFER, style: styles.bg, fixed: true } as any),

      // Passport photo
      data.photoUrl
        ? createElement(PdfImage, { src: data.photoUrl, style: styles.photo } as any)
        : null,

      // "The school is congratulating you ____"
      createElement(Text, { style: { ...styles.field, left: 222, top: 306 } }, data.fullName),

      // "Class: ____"
      createElement(Text, { style: { ...styles.field, left: 92, top: 344 } }, data.className),

      // "Admission No: ____"
      createElement(Text, { style: { ...styles.field, left: 132, top: 362 } }, data.admissionNumber),
    ),
  )
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const student = await db.student.findFirst({
    where: { id, deletedAt: null },
    include: { currentClass: { select: { name: true } } },
  })

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const data: LetterData = {
    fullName: `${student.firstName} ${student.lastName}`,
    className: student.currentClass?.name ?? 'Not yet assigned',
    admissionNumber: student.admissionNumber,
    photoUrl: student.photoUrl,
  }

  const buffer = await renderToBuffer(createElement(AdmissionLetterDoc, { data }) as any)

  const safeName = `${student.firstName}-${student.lastName}-${student.admissionNumber}`.replace(/\s+/g, '-')

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="admission-letter-${safeName}.pdf"`,
    },
  })
}
