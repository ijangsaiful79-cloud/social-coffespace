import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

export default async function CoffeeShopsPage() {
  const supabase = await createAdminClient()

  const { data: shops } = await supabase
    .from('coffee_shops')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Coffee Shops</h1>
        <Link
          href="/admin/coffee-shops/new"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
        >
          + Add Coffee Shop
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Address</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Radius</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shops?.map((shop) => (
              <tr key={shop.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{shop.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{shop.address}</td>
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
                  <Link
                    href={`/admin/coffee-shops/${shop.id}`}
                    className="text-primary text-sm hover:underline"
                  >
                    Detail / QR
                  </Link>
                </td>
              </tr>
            ))}
            {(!shops || shops.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No coffee shops yet. Add your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
