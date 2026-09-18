'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Coffee, Users, Flag, LogOut } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/coffee-shops', label: 'Coffee Shops', icon: Coffee },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
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
        <Coffee size={16} strokeWidth={2} style={{ color: '#c06c2e' }} />
        <span className="font-bold text-sm">Coffee Dating</span>
      </div>

      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition whitespace-nowrap ${
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon size={15} strokeWidth={2} />
            {label}
          </Link>
        )
      })}

      <div className="hidden md:block mt-auto pt-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition text-left"
        >
          <LogOut size={15} strokeWidth={2} />
          Logout
        </button>
      </div>
      <button
        onClick={handleLogout}
        className="md:hidden shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition whitespace-nowrap"
      >
        <LogOut size={15} strokeWidth={2} />
        Logout
      </button>
    </aside>
  )
}
