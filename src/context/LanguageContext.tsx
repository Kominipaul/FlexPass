import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { storage } from '@/lib/storage'
import { en, type Dictionary } from '@/lib/i18n/en'
import { el } from '@/lib/i18n/el'

export type Language = 'en' | 'el'

const DICTIONARIES: Record<Language, Dictionary> = { en, el }

const KEY = 'language'

/** A dotted path into the dictionary, e.g. 'checkin.savePin' — not every string, just the keys `en.ts` actually declares. */
type DotPath<T, Prefix extends string = ''> = T extends Record<string, unknown>
  ? {
      [K in keyof T & string]: T[K] extends string
        ? `${Prefix}${K}`
        : DotPath<T[K], `${Prefix}${K}.`>
    }[keyof T & string]
  : never

export type TranslationKey = DotPath<Dictionary>

function lookup(dict: Dictionary, path: string): string | undefined {
  return path.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[part]
    }
    return undefined
  }, dict) as string | undefined
}

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  /** Translates `key`, substituting any `{name}` tokens from `vars`. Falls back to the English string if a key is somehow missing from the active dictionary. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

/**
 * A device-level preference, like kiosk mode and notification prefs — not
 * account data. One browser can hold a member session in one tab and a
 * staff session in another (see auth.ts), and both read the same language
 * choice, since it describes how *this device* wants FlexPass to talk to
 * whoever's using it right now, not a fact about either account.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => storage.get<Language>(KEY, 'en'))

  const setLanguage = useCallback((lang: Language) => {
    storage.set(KEY, lang)
    setLanguageState(lang)
  }, [])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const raw = lookup(DICTIONARIES[language], key) ?? lookup(en, key) ?? key
      if (!vars) return raw
      return Object.entries(vars).reduce(
        (str, [name, value]) => str.split(`{${name}}`).join(String(value)),
        raw,
      )
    },
    [language],
  )

  const value = useMemo<LanguageContextValue>(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
