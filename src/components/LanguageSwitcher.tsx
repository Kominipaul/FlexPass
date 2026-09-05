import { useLanguage, type Language } from '@/context/LanguageContext'
import { Tabs } from '@/components/ui/Tabs'

/**
 * The one control that reads in both languages regardless of which one is
 * currently active — an English speaker who fat-fingers into Greek still
 * needs to be able to read their way back out, and vice versa. Shared
 * between the member Settings page and the staff sidebar rather than two
 * separate copies, since it's the same device-level preference either way
 * (see LanguageContext).
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage()

  return (
    <Tabs
      items={[
        { key: 'en', label: 'English' },
        { key: 'el', label: 'Ελληνικά' },
      ]}
      active={language}
      onChange={(key) => setLanguage(key as Language)}
      className={className}
    />
  )
}
