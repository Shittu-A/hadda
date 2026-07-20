// Memorization grade bands. The teacher enters only a percentage; the letter
// follows from it, so the two can never contradict each other.
//
// Lives outside lib/actions because a 'use server' module may only export async
// functions — these are plain helpers shared by the server actions and the UI.

export function gradeFor(percent: number): string {
  if (percent >= 80) return 'A'
  if (percent >= 70) return 'B'
  if (percent >= 60) return 'C'
  if (percent >= 50) return 'D'
  return 'F'
}

export const GRADE_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  A: 'success',
  B: 'success',
  C: 'info',
  D: 'warning',
  F: 'danger',
}

// Shown next to the percentage field so teachers know what they are awarding.
export const GRADE_SCALE_LABEL = 'A 80+ · B 70+ · C 60+ · D 50+ · F below 50'
