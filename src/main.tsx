import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ensureSeeded } from '@/lib/db'
import './index.css'

// Seed the mock backend before anything renders so every component can
// assume data already exists (see src/lib/db.ts and src/lib/seedData.ts).
ensureSeeded()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
