export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong'
  checks: {
    length: boolean
    upper: boolean
    lower: boolean
    number: boolean
    symbol: boolean
  }
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
  const passed = Object.values(checks).filter(Boolean).length
  const score = (Math.max(0, passed - 1) as 0 | 1 | 2 | 3 | 4)
  const labels: PasswordStrength['label'][] = [
    'Very weak',
    'Weak',
    'Fair',
    'Strong',
    'Very strong',
  ]
  return { score, label: labels[score], checks }
}

export function isValidPassword(password: string): boolean {
  return checkPasswordStrength(password).score >= 2 && password.length >= 8
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

export function isValidCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}

export type FieldErrors<T extends string> = Partial<Record<T, string>>
