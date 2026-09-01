import { createContext, useContext } from 'react'
import type { Bilingual } from '../api/types'

export type Lang = 'el' | 'en'

export const STR: Record<Lang, Record<string, string>> = {
  el: {
    brandTag: 'Καλαμάτα · 2 χώροι, 1 κάρτα', memberPortal: 'Πύλη μέλους', greeting: 'Καλησπέρα',
    pass: 'Κάρτα', classes: 'Μαθήματα', account: 'Συνδρομή',

    loginTitle: 'Σύνδεση', registerTitle: 'Εγγραφή', email: 'Email', password: 'Κωδικός πρόσβασης',
    firstName: 'Όνομα', lastName: 'Επώνυμο', phone: 'Τηλέφωνο (προαιρετικό)', homeLocation: 'Βασικός χώρος',
    choosePlan: 'Επιλέξτε πακέτο', signIn: 'Σύνδεση', createAccount: 'Δημιουργία λογαριασμού',
    noAccount: 'Δεν έχετε λογαριασμό;', haveAccount: 'Έχετε ήδη λογαριασμό;',
    signUp: 'Εγγραφή', signInInstead: 'Σύνδεση', signingIn: 'Σύνδεση…', creatingAccount: 'Δημιουργία…',
    logout: 'Αποσύνδεση', loadingSession: 'Φόρτωση…',

    doorPass: 'Κάρτα εισόδου', accessPass: 'Power Life Gym — Κάρτα Εισόδου', activeBranch: 'Ενεργός χώρος',
    membershipLabel: 'Συνδρομή', memberSince: 'μέλος από', rotatesIn: 'Ανανέωση σε', tapRefresh: 'ζωντανή κάρτα',
    visits: 'Επισκέψεις', daysLeftShort: 'Ημέρες',

    searchClasses: 'Αναζήτηση μαθήματος ή προπονητή', bothClubs: 'Και οι δύο χώροι', all: 'Όλα',
    today: 'Σήμερα', spotsFilled: 'θέσεις', left: 'ελεύθερες', waitlistOnly: 'Λίστα αναμονής', waitlist: 'Αναμονή',
    book: 'Κράτηση', cancel: 'Ακύρωση', bookedTag: 'Κρατημένο', upgrade: 'Αναβάθμιση',
    noClasses: 'Κανένα μάθημα', loading: 'Φόρτωση…',

    currentPlan: 'Τρέχον πακέτο', perMonth: 'τον μήνα', daysRemaining: 'Υπόλοιπο ημερών',
    renews: 'Ανανέωση', renew30: 'Ανανέωση 30 ημερών', freezeAccount: 'Παύση συνδρομής', unfreeze: 'Επανενεργοποίηση',
    frozenTitle: 'Η συνδρομή είναι σε παύση', billing: 'Ιστορικό πληρωμών', paid: 'Πληρώθηκε',
    refunded: 'Επιστροφή', pending: 'Εκκρεμεί',
    freezeTitle: 'Παύση συνδρομής', keepActive: 'Διατήρηση', freezeFor: 'Παύση για', weeks: 'εβδομάδες',
    days: 'ημέρες', close: 'Κλείσιμο',

    announcements: 'Ανακοινώσεις', offerTag: 'Προσφορά', newsTag: 'Νέο',

    upgradeTitle: 'Αναβαθμίστε το πακέτο σας', changePlan: 'Αλλαγή πακέτου', later: 'Άλλη φορά',
    upgradeCta: 'Αναβάθμιση τώρα',

    errINVALID_CREDENTIALS: 'Λάθος email ή κωδικός.', errEMAIL_TAKEN: 'Υπάρχει ήδη λογαριασμός με αυτό το email.',
    errWEAK_PASSWORD: 'Ο κωδικός πρέπει να έχει τουλάχιστον 10 χαρακτήρες.',
    errTOO_MANY_ATTEMPTS: 'Πολλές προσπάθειες — δοκιμάστε ξανά σε λίγο.', errNETWORK: 'Πρόβλημα σύνδεσης.',
  },
  en: {
    brandTag: 'Kalamata · 2 spaces, 1 pass', memberPortal: 'Member portal', greeting: 'Good evening',
    pass: 'Pass', classes: 'Classes', account: 'Membership',

    loginTitle: 'Sign in', registerTitle: 'Create account', email: 'Email', password: 'Password',
    firstName: 'First name', lastName: 'Last name', phone: 'Phone (optional)', homeLocation: 'Home space',
    choosePlan: 'Choose a plan', signIn: 'Sign in', createAccount: 'Create account',
    noAccount: "Don't have an account?", haveAccount: 'Already have an account?',
    signUp: 'Sign up', signInInstead: 'Sign in', signingIn: 'Signing in…', creatingAccount: 'Creating…',
    logout: 'Log out', loadingSession: 'Loading…',

    doorPass: 'Door pass', accessPass: 'Power Life Gym — Access Pass', activeBranch: 'Active branch',
    membershipLabel: 'Membership', memberSince: 'member since', rotatesIn: 'Rotates in', tapRefresh: 'live pass',
    visits: 'Visits', daysLeftShort: 'Days left',

    searchClasses: 'Search classes or trainers', bothClubs: 'Both spaces', all: 'All',
    today: 'Today', spotsFilled: 'spots filled', left: 'left', waitlistOnly: 'Waitlist only', waitlist: 'Waitlist',
    book: 'Book spot', cancel: 'Cancel', bookedTag: 'Booked', upgrade: 'Upgrade',
    noClasses: 'No classes match', loading: 'Loading…',

    currentPlan: 'Current plan', perMonth: 'per month', daysRemaining: 'Days remaining',
    renews: 'Renews', renew30: 'Renew 30 days', freezeAccount: 'Freeze membership', unfreeze: 'Unfreeze',
    frozenTitle: 'Membership frozen', billing: 'Billing history', paid: 'Paid',
    refunded: 'Refunded', pending: 'Pending',
    freezeTitle: 'Freeze membership', keepActive: 'Keep active', freezeFor: 'Freeze for', weeks: 'weeks',
    days: 'days', close: 'Close',

    announcements: 'Announcements', offerTag: 'Offer', newsTag: 'New',

    upgradeTitle: 'Upgrade your plan', changePlan: 'Switch plan', later: 'Maybe later',
    upgradeCta: 'Upgrade now',

    errINVALID_CREDENTIALS: 'Wrong email or password.', errEMAIL_TAKEN: 'An account with this email already exists.',
    errWEAK_PASSWORD: 'Password must be at least 10 characters.',
    errTOO_MANY_ATTEMPTS: 'Too many attempts — try again shortly.', errNETWORK: 'Connection problem.',
  },
}

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
  tx: (v: Bilingual) => string
}

export const LangContext = createContext<LangCtx>({
  lang: 'el', setLang: () => {}, t: (k) => k, tx: (v) => v.el,
})

export const useL = () => useContext(LangContext)
