'use client'

import { useFormStatus } from 'react-dom'
import Spinner from './Spinner'
import { cn } from '@/lib/utils'

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // Text (or element) shown in place of children while the enclosing form is
  // submitting. Defaults to the same children with a spinner in front.
  pendingText?: React.ReactNode
}

// Drop-in replacement for `<button type="submit">`. Reads pending state from
// the nearest enclosing <form action={...}> via useFormStatus, so it works
// for both plain server actions and useActionState-driven forms with no
// extra wiring — just swap the tag.
export default function SubmitButton({
  children,
  pendingText,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn('inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed', className)}
      {...props}
    >
      {pending && <Spinner />}
      {pending ? (pendingText ?? children) : children}
    </button>
  )
}
