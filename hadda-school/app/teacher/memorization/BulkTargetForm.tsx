'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { bulkUpsertMemorizationTargets } from '@/lib/actions/memorization'
import { useToast } from '@/components/ui/ToastProvider'
import Spinner from '@/components/ui/Spinner'

type StudentLite = {
  id: string
  firstName: string
  lastName: string
  admissionNumber: string
  className: string
  hasTarget: boolean
}

type Surah = { id: number; nameEnglish: string }

export default function BulkTargetForm({
  students,
  surahs,
}: {
  students: StudentLite[]
  surahs: Surah[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState(false)

  // Group students by class so the teacher can select a whole class at once.
  const groups = useMemo(() => {
    const map = new Map<string, StudentLite[]>()
    for (const s of students) {
      const list = map.get(s.className) ?? []
      list.push(s)
      map.set(s.className, list)
    }
    return Array.from(map.entries())
  }, [students])

  const allIds = useMemo(() => students.map((s) => s.id), [students])
  const withoutTargetIds = useMemo(
    () => students.filter((s) => !s.hasTarget).map((s) => s.id),
    [students]
  )

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const setMany = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })

  const allSelected = selected.size > 0 && allIds.every((id) => selected.has(id))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (selected.size === 0) {
      toast.error('Select at least one student first.')
      return
    }

    const formData = new FormData(e.currentTarget)
    for (const id of selected) formData.append('studentIds', id)

    setPending(true)
    // try/finally guarantees `pending` always clears, even if the request
    // itself throws — otherwise the button could get stuck "Applying…" forever.
    try {
      const result = await bulkUpsertMemorizationTargets(formData)

      if (result.success) {
        toast.success(`Target applied to ${result.count} student${result.count !== 1 ? 's' : ''}.`)
        setSelected(new Set())
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to apply target.')
      }
    } catch (err) {
      console.error('Bulk target update failed:', err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="bg-white border border-coffee-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left hover:bg-coffee-50 transition-colors"
      >
        <div>
          <p className="font-semibold text-coffee-900">Set a target for many students</p>
          <p className="text-coffee-500 text-xs mt-0.5">
            Apply one portion to the whole class or a selected group at once
          </p>
        </div>
        <span className="text-coffee-400 text-sm">{open ? 'Hide' : 'Open'}</span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-coffee-100 p-4 sm:p-5 space-y-5">
          {/* Portion + goal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-coffee-600 mb-1">From surah</label>
              <select
                name="surahFromId"
                required
                defaultValue=""
                className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="">Select</option>
                {surahs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}. {s.nameEnglish}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-coffee-600 mb-1">From ayah</label>
              <input
                type="number"
                name="ayahFrom"
                required
                min={1}
                className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-coffee-600 mb-1">To surah</label>
              <select
                name="surahToId"
                required
                defaultValue=""
                className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                <option value="">Select</option>
                {surahs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}. {s.nameEnglish}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-coffee-600 mb-1">To ayah</label>
              <input
                type="number"
                name="ayahTo"
                required
                min={1}
                className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-coffee-600 mb-1">Target pages</label>
              <input
                type="number"
                name="targetPages"
                required
                min={0.25}
                step={0.25}
                className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-coffee-600 mb-1">Notes (optional)</label>
              <input
                type="text"
                name="notes"
                className="w-full border border-coffee-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>

          {/* Who it applies to */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-coffee-700 uppercase tracking-wide">
                Apply to ({selected.size} selected)
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setMany(allIds, !allSelected)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-coffee-50 text-coffee-700 hover:bg-coffee-100 transition-colors"
                >
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
                {withoutTargetIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelected(new Set(withoutTargetIds))}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-coffee-50 text-coffee-700 hover:bg-coffee-100 transition-colors"
                  >
                    Only without a target ({withoutTargetIds.length})
                  </button>
                )}
              </div>
            </div>

            <div className="border border-coffee-200 rounded-lg divide-y divide-coffee-100 max-h-72 overflow-y-auto">
              {groups.map(([className, list]) => {
                const ids = list.map((s) => s.id)
                const allInClass = ids.every((id) => selected.has(id))
                return (
                  <div key={className}>
                    <div className="flex items-center justify-between px-3 py-2 bg-coffee-50 sticky top-0">
                      <p className="text-xs font-semibold text-coffee-700">{className}</p>
                      <button
                        type="button"
                        onClick={() => setMany(ids, !allInClass)}
                        className="text-xs font-medium text-coffee-600 hover:text-coffee-900"
                      >
                        {allInClass ? 'Clear class' : 'Select class'}
                      </button>
                    </div>
                    {list.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-coffee-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggle(s.id)}
                          className="rounded border-coffee-300 text-coffee-900 focus:ring-coffee-400"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="text-coffee-900">
                            {s.firstName} {s.lastName}
                          </span>
                          <span className="text-coffee-400 text-xs"> · {s.admissionNumber}</span>
                        </span>
                        {s.hasTarget && (
                          <span className="text-xs text-coffee-400 shrink-0">has target</span>
                        )}
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-coffee-400 mt-1.5">
              Students who already have a target for this term will have it updated; any grade
              already recorded is kept.
            </p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-coffee-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-coffee-800 transition-colors disabled:opacity-60"
          >
            {pending && <Spinner />}
            {pending ? 'Applying…' : `Apply to ${selected.size || 'selected'} student${selected.size === 1 ? '' : 's'}`}
          </button>
        </form>
      )}
    </div>
  )
}
