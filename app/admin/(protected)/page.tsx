import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createAdminClient()

  const [{ count: shopCount }, { count: userCount }, { count: sessionCount }] = await Promise.all([
    supabase.from('coffee_shops').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('coffee_shop_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString()),
  ])

  const stats = [
    { label: 'Active Coffee Shops', value: shopCount ?? 0 },
    { label: 'Registered Users', value: userCount ?? 0 },
    { label: 'Active Sessions', value: sessionCount ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-6">
            <p className="text-3xl font-bold mb-1">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
