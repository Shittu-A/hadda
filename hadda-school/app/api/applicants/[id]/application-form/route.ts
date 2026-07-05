import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image as PdfImage } from '@react-pdf/renderer'
import { createElement } from 'react'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

// A4 page in points (72dpi), matching the 1656x2340 (200dpi) background template's aspect ratio.
const PAGE_W = 595.28
const PAGE_H = 841.89

// Read as a Buffer (not a path string) — @react-pdf/image's local-path resolver mis-parses
// Windows paths like "C:\..." (the drive letter is read as a URL protocol), so a plain path
// string silently fails there. A Buffer bypasses that resolver entirely and works everywhere.
const BG_BUFFER = fs.readFileSync(path.join(process.cwd(), 'public/templates/application-form-bg.png'))

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica' },
  bg: { position: 'absolute', top: 0, left: 0, width: PAGE_W, height: PAGE_H },
  field: { position: 'absolute', fontSize: 10, color: '#1a1a1a' },
  photo: {
    position: 'absolute',
    left: 478,
    top: 128,
    width: 69,
    height: 89,
    objectFit: 'cover',
  },
  mark: { position: 'absolute', fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },
})

interface ApplicantData {
  fullName: string
  gender: string | null
  maritalStatus: string | null
  dateOfBirth: string
  residence: string
  phone: string
  hizbMemorized: string
  formerSchool: string
  reasonForLeaving: string
  photoUrl: string | null
}

function ApplicationFormDoc({ applicant }: { applicant: ApplicantData }) {
  const genderX = applicant.gender === 'F' ? 396 : applicant.gender === 'M' ? 470 : null
  const maritalX = applicant.maritalStatus === 'Married' ? 149 : applicant.maritalStatus === 'Single' ? 223 : null

  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'A4', style: styles.page },

      // Background template (fixed = removed from layout flow so the full-height
      // A4 image can't force a page break that would push overlays onto page 2)
      createElement(PdfImage, { src: BG_BUFFER, style: styles.bg, fixed: true } as any),

      // Passport photo
      applicant.photoUrl
        ? createElement(PdfImage, { src: applicant.photoUrl, style: styles.photo } as any)
        : null,

      // Name
      createElement(Text, { style: { ...styles.field, left: 92, top: 293 } }, applicant.fullName),

      // Marital status / Gender checkmarks
      maritalX != null
        ? createElement(Text, { style: { ...styles.mark, left: maritalX, top: 347 } }, 'X')
        : null,
      genderX != null
        ? createElement(Text, { style: { ...styles.mark, left: genderX, top: 347 } }, 'X')
        : null,

      // Date of Birth
      createElement(Text, { style: { ...styles.field, left: 125, top: 369 } }, applicant.dateOfBirth),

      // Place of Residence
      createElement(Text, { style: { ...styles.field, left: 142, top: 400 } }, applicant.residence),

      // Phone Number
      createElement(Text, { style: { ...styles.field, left: 125, top: 427 } }, applicant.phone),

      // Hizb memorized
      createElement(Text, { style: { ...styles.field, left: 265, top: 457 } }, applicant.hizbMemorized),

      // Former School
      createElement(Text, { style: { ...styles.field, left: 182, top: 484 } }, applicant.formerSchool),

      // Reason for leaving
      createElement(
        Text,
        { style: { ...styles.field, left: 191, top: 510, width: 330, fontSize: 9 } },
        applicant.reasonForLeaving,
      ),
    ),
  )
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const applicant = await db.applicant.findUnique({ where: { id } })
  if (!applicant) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })

  const data: ApplicantData = {
    fullName: applicant.fullName,
    gender: applicant.gender,
    maritalStatus: applicant.maritalStatus,
    dateOfBirth: applicant.dateOfBirth
      ? new Date(applicant.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      : '',
    residence: applicant.residence ?? '',
    phone: applicant.phone ?? '',
    hizbMemorized: applicant.hizbMemorized != null ? String(applicant.hizbMemorized) : '',
    formerSchool: applicant.formerSchool ?? '',
    reasonForLeaving: applicant.reasonForLeaving ?? '',
    photoUrl: applicant.photoUrl,
  }

  const buffer = await renderToBuffer(createElement(ApplicationFormDoc, { applicant: data }) as any)

  const safeName = applicant.fullName.replace(/\s+/g, '-')

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="application-form-${safeName}.pdf"`,
    },
  })
}
