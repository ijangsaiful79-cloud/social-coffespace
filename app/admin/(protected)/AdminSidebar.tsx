'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin', label: '📊 Dashboard' },
  { href: '/admin/coffee-shops', label: '☕ Coffee Shops' },
  { href: '/admin/users', label: '👥 Users' },
  { href: '/admin/reports', label: '🚩 Reports' },
]

export default function AdminSidebar() {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside className="w-full md:w-52 md:shrink-0 border-b md:border-b-0 md:border-r border-border bg-card px-4 py-4 md:py-6 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
      <div className="hidden md:flex items-center gap-2 mb-6 px-2">
        <span className="text-xl">☕</span>
        <span className="font-bold text-sm">Coffee Dating</span>
      </div>

      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 px-3 py-2 rounded-lg text-sm transition whitespace-nowrap ${
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {item.label}
          </Link>
        )
      })}

      <div className="hidden md:block mt-auto pt-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition text-left"
        >
          🚪 Logout
        </button>
      </div>
      <button
        onClick={handleLogout}
        className="md:hidden shrink-0 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition whitespace-nowrap"
      >
        🚪 Logout
      </button>
    </aside>
  )
}
