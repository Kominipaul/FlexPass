import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className = '', rows = 3, ...rest },
  ref,
) {
  const autoId = useId()
  const textareaId = id ?? autoId

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-ink-800">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={!!error}
        className={`w-full resize-none rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-slate-400 transition-shadow focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 ${
          error
            ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
            : 'border-slate-200 focus:border-brand-400 focus:ring-brand-100'
        } ${className}`}
        {...rest}
      />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
})
