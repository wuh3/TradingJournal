import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/pnl', label: 'Profit & Loss', end: false },
  { to: '/calculator', label: 'Entry Quality Calculator', end: false },
]

export function Layout({ children }: { children: ReactNode }) {
  const { username, logout } = useAuth()

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-4 py-6">
        <div>
          <div className="mb-8 px-2">
            <h1 className="text-lg font-semibold text-slate-900">Trading Journal</h1>
            {username && <p className="mt-0.5 text-sm text-slate-500">{username}</p>}
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="space-y-1 border-t border-slate-200 pt-4">
          <button
            type="button"
            disabled
            title="Not implemented yet"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-400"
          >
            Settings
          </button>
          <button
            type="button"
            disabled
            title="Not implemented yet"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-400"
          >
            Manage Profile
          </button>
          <button
            type="button"
            disabled
            title="Not implemented yet"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-400"
          >
            Manage Account
          </button>
          <button
            type="button"
            onClick={logout}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
