import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Building2, Dumbbell, LogOut, Menu, ShieldCheck, X } from 'lucide-react'
import { ADMIN_NAV_ITEMS, adminPageTitle } from '@/lib/adminNav'
import { useStaffAuth } from '@/context/StaffAuthContext'
import { useAdminData } from '@/context/AdminDataContext'
import { Avatar } from '@/components/ui/Avatar'
import { Select } from '@/components/ui/Select'

export function AdminLayout() {
  const { staff } = useStaffAuth()
  const { locations, atLocationId, setAtLocationId } = useAdminData()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  if (!staff) return null

  const activeLocation = locations.find((l) => l.id === atLocationId)

  const navList = (
    <nav className="flex flex-col gap-0.5">
      {ADMIN_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/admin'}
          onClick={() => setNavOpen(false)}
          className={({ isActive }) =>
            `relative flex h-10 items-center gap-2.5 rounded-[6px] px-3 text-[13px] transition-colors ${
              isActive ? 'bg-voltsoft text-volt' : 'text-dim hover:bg-raised hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-volt" />}
              <item.icon className="h-4 w-4" />
              <span className="font-display flex-1 text-left text-[11.5px] font-bold uppercase tracking-[.05em]">
                {item.label}
              </span>
              <span className="text-[10px] text-mute">{item.hint}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <aside className="hidden w-[236px] shrink-0 flex-col gap-4 border-r border-line bg-surface p-3 lg:flex">
        <SidebarHeader />
        <div>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Operations</p>
          {navList}
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <div>
            <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Desk location</p>
            <Select value={atLocationId} onChange={(e) => setAtLocationId(e.target.value)} aria-label="Desk location">
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          {activeLocation && (
            <div className="rounded-[9px] border border-line bg-raised p-3">
              <p className="font-display flex items-center gap-1.5 text-[11.5px] font-bold text-ink">
                <Building2 className="h-3.5 w-3.5 text-volt" />
                {activeLocation.name}
              </p>
              <p className="mt-1.5 text-[11px] text-dim">{activeLocation.address}</p>
              <p className="text-[11px] text-dim">Open {activeLocation.hours}</p>
            </div>
          )}
          <StaffFooter />
        </div>
      </aside>

      {/* Mobile topbar + drawer */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            className="rounded-[6px] p-1.5 text-dim hover:bg-raised hover:text-ink"
            aria-label="Toggle menu"
          >
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-display text-[13px] font-bold uppercase tracking-[.04em] text-ink">
            {adminPageTitle(location.pathname)}
          </span>
          <div className="ml-auto w-40">
            <Select value={atLocationId} onChange={(e) => setAtLocationId(e.target.value)} aria-label="Desk location">
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {navOpen && (
          <div className="a-fade border-b border-line bg-surface p-3 lg:hidden">
            {navList}
            <div className="mt-3 border-t border-linesoft pt-3">
              <StaffFooter />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarHeader() {
  return (
    <div className="flex items-center gap-2.5 px-1 py-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-volt text-voltink">
        <Dumbbell className="h-4 w-4" />
      </span>
      <div className="leading-none">
        <p className="font-display text-[13px] font-extrabold uppercase tracking-[.04em] text-ink">FlexPass</p>
        <p className="mt-1 text-[10px] text-mute">Staff dashboard</p>
      </div>
    </div>
  )
}

function StaffFooter() {
  const { staff, logout } = useStaffAuth()
  if (!staff) return null
  return (
    <div>
      <div className="flex items-center gap-3 rounded-[9px] border border-line bg-raised p-2.5">
        <Avatar name={staff.name} tone={staff.avatarColor} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-ink">{staff.name}</p>
          <p className="flex items-center gap-1 truncate text-[10.5px] text-mute">
            <ShieldCheck className="h-3 w-3" />
            {staff.role === 'manager' ? 'Manager' : 'Front desk'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={logout}
        className="mt-2 flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-[12.5px] font-medium text-dim transition-colors hover:bg-raised hover:text-ink"
      >
        <LogOut className="h-[17px] w-[17px]" />
        Log out
      </button>
    </div>
  )
}
