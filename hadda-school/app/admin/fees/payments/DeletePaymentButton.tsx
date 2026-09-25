'use client'

import { useRef } from 'react'
import SubmitButton from '@/components/ui/SubmitButton'

const DELETE_CONFIRM_WORD = 'DELETE'

// Deleting a payment can't be undone, so the user must type a word first —
// a stray tap on "Delete" no longer removes the record.
export default function DeletePaymentButton({ label }: { label: string }) {
  const confirmRef = useRef<HTMLInputElement>(null)

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    const typed = window.prompt(`Delete the payment for ${label}?\n\nThis cannot be undone. Type ${DELETE_CONFIRM_WORD} to confirm.`)
    if (typed?.trim().toUpperCase() !== DELETE_CONFIRM_WORD) {
      e.preventDefault()
      if (typed !== null) window.alert(`Not deleted — you must type ${DELETE_CONFIRM_WORD} exactly.`)
      return
    }
    if (confirmRef.current) confirmRef.current.value = DELETE_CONFIRM_WORD
  }

  return (
    <>
      <input ref={confirmRef} type="hidden" name="confirm" defaultValue="" />
      <SubmitButton
        pendingText="Deleting…"
        className="text-xs text-red-400 hover:text-red-600 transition-colors"
        onClick={onClick}
      >
        Delete
      </SubmitButton>
    </>
  )
}
