import { formatDate } from '@/lib/utils'

/**
 * Tick-box for "this document has already been printed". Submitting toggles it,
 * so the same control both marks a fresh document and clears a mistaken mark.
 */
export default function PrintedToggle({
  action,
  id,
  printedAt,
  label = 'Mark printed',
}: {
  action: (formData: FormData) => Promise<void>
  id: string
  printedAt: Date | null
  label?: string
}) {
  const printed = printedAt !== null

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title={printed ? 'Printed — click to un-mark' : 'Click to mark as printed'}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
          printed
            ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
            : 'border-coffee-200 text-coffee-500 hover:bg-coffee-50'
        }`}
      >
        <span
          className={`flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border text-[9px] leading-none ${
            printed ? 'border-green-600 bg-green-600 text-white' : 'border-coffee-300'
          }`}
        >
          {printed ? '✓' : ''}
        </span>
        {printed ? `Printed ${formatDate(printedAt!)}` : label}
      </button>
    </form>
  )
}
