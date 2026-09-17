import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import ShopListActions from './ShopListActions'

export default async function CoffeeShopsPage() {
  const supabase = createAdminClient()

  const { data: shops } = await supabase
    .from('coffee_shops')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Coffee Shops</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {shops?.length ?? 0} lokasi terdaftar
          </p>
        </div>
        <Link
          href="/admin/coffee-shops/new"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
        >
          + Tambah Coffee Shop
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nama</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Alamat</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Radius</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {shops?.map((shop) => (
              <tr key={shop.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                <td className="px-4 py-3 font-medium">{shop.name}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{shop.address}</td>
                <td className="px-4 py-3 text-muted-foreground">{shop.radius_meter}m</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      shop.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
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
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
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
