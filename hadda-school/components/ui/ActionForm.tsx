'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useToast } from './ToastProvider'

type ActionResult = { success?: boolean; error?: string; message?: string } | void

// Next marks redirect()/notFound() thrown from a server action with a digest
// like "NEXT_REDIRECT;..." — those must keep propagating so navigation still
// happens. Only genuine failures should be turned into a toast.
function isFrameworkSignal(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest
  return typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND') || digest.startsWith('NEXT_HTTP_ERROR_FALLBACK'))
}

interface ActionFormProps<T extends ActionResult> {
  action: (formData: FormData) => Promise<T> | T
  // Shown on success when the action doesn't return its own `message`.
  successMessage?: string
  // Generic fallback shown when the action throws without a useful message.
  errorMessage?: string
  resetOnSuccess?: boolean
  children: React.ReactNode
  className?: string
}

// Drop-in replacement for `<form action={serverAction}>` that adds a toast
// after the action settles — success or error — without changing what the
// action itself does. Loading state on the submit button still comes from
// useFormStatus via <SubmitButton>, which reads this form automatically.
export default function ActionForm<T extends ActionResult>({
  action,
  successMessage = 'Saved.',
  errorMessage = 'Something went wrong. Please try again.',
  resetOnSuccess = false,
  children,
  className,
}: ActionFormProps<T>) {
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const submissions = useRef(0)

  const [state, formAction] = useActionState<T | null, FormData>(async (_prev, formData) => {
    try {
      const result = await action(formData)
      return (result ?? { success: true }) as T
    } catch (err) {
      if (isFrameworkSignal(err)) throw err
      console.error(err)
      return { success: false, error: errorMessage } as T
    }
  }, null)

  useEffect(() => {
    if (state == null) return
    submissions.current += 1
    const result = state as { success?: boolean; error?: string; message?: string }
    if (result.success === false) {
      toast.error(result.error || errorMessage)
    } else {
      toast.success(result.message || successMessage)
      if (resetOnSuccess) formRef.current?.reset()
    }
    // Only react to a new completed submission, not to prop identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
    </form>
  )
}
