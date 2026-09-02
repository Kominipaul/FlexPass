import { useRef } from 'react'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: boolean
}

export function OtpInput({ length = 6, value, onChange, disabled, error }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  function setDigitAt(index: number, digit: string) {
    const next = digits.slice()
    next[index] = digit
    onChange(next.join(''))
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    setDigitAt(index, digit)
    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    e.preventDefault()
    onChange(pasted.padEnd(length, '').slice(0, length).trimEnd())
    const lastIndex = Math.min(pasted.length, length) - 1
    inputsRef.current[Math.max(lastIndex, 0)]?.focus()
  }

  return (
    <div className="flex justify-between gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el
          }}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          aria-label={`Digit ${index + 1}`}
          className={`font-mono h-14 w-full max-w-[3rem] rounded-[8px] border bg-sunk text-center text-xl font-bold text-ink transition-colors focus:outline-none disabled:opacity-50 ${
            error ? 'border-bad focus:border-bad' : 'border-line focus:border-volt'
          }`}
        />
      ))}
    </div>
  )
}
