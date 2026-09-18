import { createAdminClient } from '@/lib/supabase/server'

const PLAN_CONFIG = {
  starter:  { label: 'Starter',  color: 'bg-muted text-muted-foreground',          nfc: 5  },
  business: { label: 'Business', color: 'bg-primary/10 text-primary',              nfc: 10 },
  pro:      { label: 'Pro',      color: 'bg-amber-100 text-amber-700',             nfc: 20 },
}

export default async function AdminDashboard() {
  const supabase = createAdminClient()

  const [
    { count: shopCount },
    { count: userCount },
    { count: sessionCount },
    { data: shops },
  ] = await Promise.all([
    supabase.from('coffee_shops').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('coffee_shop_sessions').select('*', { count: 'exact', head: true })
      .eq('status', 'active').gt('expires_at', new Date().toISOString()),
    supabase.from('coffee_shops').select('plan, expires_at, name').eq('is_active', true),
  ])

  const planCounts = { starter: 0, business: 0, pro: 0 }
  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const expiringSoon = shops?.filter((s) => s.expires_at && new Date(s.expires_at) <= in30Days && new Date(s.expires_at) >= now) ?? []

  shops?.forEach((s) => {
    const p = (s.plan ?? 'starter') as keyof typeof planCounts
    if (p in planCounts) planCounts[p]++
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Coffee Shop Aktif', value: shopCount ?? 0 },
          { label: 'Total User',        value: userCount ?? 0 },
          { label: 'Sesi Aktif',        value: sessionCount ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-6">
            <p className="text-3xl font-bold mb-1">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Plan breakdown */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Breakdown Paket</h2>
        <div className="grid grid-cols-3 gap-4">
          {(Object.entries(PLAN_CONFIG) as [keyof typeof PLAN_CONFIG, typeof PLAN_CONFIG[keyof typeof PLAN_CONFIG]][]).map(([key, cfg]) => (
            <div key={key} className="border border-border rounded-xl p-4 text-center">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mb-3 ${cfg.color}`}>
                {cfg.label}
              </span>
              <p className="text-2xl font-bold">{planCounts[key]}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{cfg.nfc} NFC / shop</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold mb-1">Langganan Segera Berakhir</h2>
          <p className="text-xs text-muted-foreground mb-4">Dalam 30 hari ke depan</p>
          <div className="space-y-2">
            {expiringSoon.map((s, i) => {
              const days = Math.ceil((new Date(s.expires_at!).getTime() - now.getTime()) / 86400000)
              const cfg = PLAN_CONFIG[(s.plan ?? 'starter') as keyof typeof PLAN_CONFIG]
              return (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-amber-600">{days}h lagi</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
