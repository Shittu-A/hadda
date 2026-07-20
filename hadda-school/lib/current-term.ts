import { db } from '@/lib/db'

// Resolving "the current term" in one place. The equivalent query for academic
// years is copy-pasted across ~15 files; new term-aware code goes through here
// instead so the fallback rules stay consistent.

export type CurrentTerm = {
  id: string
  name: string
  order: number
  startDate: Date
  endDate: Date
  academicYearId: string
}

// The term an admin has flagged as current. Falls back to the term whose date
// range covers today within the current academic year, so the app still behaves
// sensibly if nobody has set one yet.
export async function getCurrentTerm(): Promise<CurrentTerm | null> {
  const flagged = await db.term.findFirst({
    where: { isCurrent: true },
    select: { id: true, name: true, order: true, startDate: true, endDate: true, academicYearId: true },
  })
  if (flagged) return flagged

  const now = new Date()
  const byDate = await db.term.findFirst({
    where: {
      academicYear: { isCurrent: true },
      startDate: { lte: now },
      endDate: { gte: now },
    },
    select: { id: true, name: true, order: true, startDate: true, endDate: true, academicYearId: true },
  })
  if (byDate) return byDate

  // Nothing covers today (mid-holiday, or dates never set) — use the first term
  // of the current year so screens have something to anchor to.
  return db.term.findFirst({
    where: { academicYear: { isCurrent: true } },
    orderBy: { order: 'asc' },
    select: { id: true, name: true, order: true, startDate: true, endDate: true, academicYearId: true },
  })
}

// Every term of the current academic year, in order. Used by the fee screens and
// the parent payment page, which need to show terms the student has not reached
// yet so a parent can choose to pay ahead.
export async function getTermsForCurrentYear() {
  return db.term.findMany({
    where: { academicYear: { isCurrent: true } },
    orderBy: { order: 'asc' },
  })
}
