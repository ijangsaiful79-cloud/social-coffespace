import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import QRGenerator from './QRGenerator'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CoffeeShopDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: shop } = await supabase
    .from('coffee_shops')
    .select('*')
    .eq('id', id)
    .single()

  if (!shop) return notFound()

  const shopUrl = `${process.env.NEXT_PUBLIC_APP_URL}/c/${shop.access_token}`

  const { count: activeSessions } = await supabase
    .from('coffee_shop_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('coffee_shop_id', id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/coffee-shops" className="text-muted-foreground hover:text-foreground text-sm">
          ← Coffee Shops
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{shop.name}</span>
      </div>

      <div className="grid gap-4">
        {/* Info */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">{shop.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{shop.address}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              shop.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {shop.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Latitude</p>
              <p className="text-sm font-medium mt-0.5">{shop.latitude}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Longitude</p>
              <p className="text-sm font-medium mt-0.5">{shop.longitude}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Radius</p>
              <p className="text-sm font-medium mt-0.5">{shop.radius_meter}m</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Active Sessions Now</p>
            <p className="text-2xl font-bold text-primary">{activeSessions ?? 0}</p>
          </div>
        </div>

        {/* QR & NFC URL */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold mb-4">QR Code & NFC URL</h2>

          <div className="bg-muted rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-muted-foreground mb-1">Permanent URL (untuk QR & NFC)</p>
            <p className="text-sm font-mono break-all">{shopUrl}</p>
          </div>

          <QRGenerator url={shopUrl} shopName={shop.name} />
        </div>
      </div>
    </div>
  )
}
