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
        <label htmlFor={textareaId} className="text-[11px] font-semibold uppercase tracking-[.08em] text-mute">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={!!error}
        className={`w-full resize-none rounded-[6px] border bg-sunk px-3 py-2.5 text-[13px] text-ink placeholder:text-mute transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? 'border-bad focus:border-bad' : 'border-line focus:border-volt'
        } ${className}`}
        {...rest}
      />
      {error && <p className="text-[11px] font-medium text-bad">{error}</p>}
      {!error && hint && <p className="text-[11px] text-mute">{hint}</p>}
    </div>
  )
})
