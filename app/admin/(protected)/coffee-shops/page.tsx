import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import ShopListActions from './ShopListActions'
import UniversalQR from '@/components/admin/UniversalQR'

const PLAN_BADGE: Record<string, string> = {
  starter:  'bg-muted text-muted-foreground',
  business: 'bg-primary/10 text-primary',
  pro:      'bg-amber-100 text-amber-700',
}

function planLabel(plan: string) {
  return plan === 'business' ? 'Business' : plan === 'pro' ? 'Pro' : 'Starter'
}

function expiryDisplay(expiresAt: string | null) {
  if (!expiresAt) return <span className="text-muted-foreground text-xs">—</span>
  const d = new Date(expiresAt)
  const now = new Date()
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000)
  const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })
  if (days < 0) return <span className="text-xs font-semibold text-red-500">Expired</span>
  if (days <= 30) return <span className="text-xs font-semibold text-amber-600">{label} ({days}h)</span>
  return <span className="text-xs text-muted-foreground">{label}</span>
}

export default async function CoffeeShopsPage() {
  const supabase = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { data: shops } = await supabase
    .from('coffee_shops')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <UniversalQR appUrl={appUrl} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Coffee Shops</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{shops?.length ?? 0} lokasi terdaftar</p>
        </div>
        <Link href="/admin/coffee-shops/new"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition">
          + Tambah Coffee Shop
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nama</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Alamat</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paket</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Akses Berakhir</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {shops?.map((shop) => (
              <tr key={shop.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted border border-border shrink-0 flex items-center justify-center text-muted-foreground text-xs font-bold">
                      {shop.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link href={`/admin/coffee-shops/${shop.id}`} className="hover:text-primary transition">
                        {shop.name}
                      </Link>
                      {shop.owner_contact && (
                        <p className="text-xs text-muted-foreground">{shop.owner_contact}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{shop.address}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${PLAN_BADGE[shop.plan ?? 'starter']}`}>
                    {planLabel(shop.plan ?? 'starter')}
                  </span>
                </td>
                <td className="px-4 py-3">{expiryDisplay(shop.expires_at)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    shop.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {shop.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ShopListActions id={shop.id} isActive={shop.is_active} />
                </td>
              </tr>
            ))}
            {(!shops || shops.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Belum ada coffee shop. Tambah yang pertama.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
