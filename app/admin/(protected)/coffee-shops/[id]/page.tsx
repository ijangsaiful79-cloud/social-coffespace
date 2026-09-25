import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/server'
import { ToggleActiveButton, DeleteShopButton } from './ShopActions'

interface Props {
  params: Promise<{ id: string }>
}

const PLAN_BADGE: Record<string, string> = {
  starter:  'bg-muted text-muted-foreground',
  business: 'bg-primary/10 text-primary',
  pro:      'bg-amber-100 text-amber-700',
}

export default async function CoffeeShopDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: shop } = await supabase.from('coffee_shops').select('*').eq('id', id).single()
  if (!shop) return notFound()

  const plan = (shop.plan ?? 'starter') as string
  const nfcCount = plan === 'pro' ? 20 : plan === 'business' ? 10 : 5

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

      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {shop.logo_url && (plan === 'business' || plan === 'pro') ? (
              <Image src={shop.logo_url} alt={shop.name} width={48} height={48}
                className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-muted border border-border shrink-0 flex items-center justify-center text-lg font-bold text-muted-foreground">
                {shop.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{shop.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{shop.address}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              shop.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {shop.is_active ? 'Active' : 'Inactive'}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${PLAN_BADGE[plan]}`}>
              {plan}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Sesi Aktif</p>
            <p className="text-2xl font-bold text-primary mt-0.5">{activeSessions ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">NFC Card</p>
            <p className="text-lg font-bold mt-0.5">{nfcCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Radius GPS</p>
            <p className="text-lg font-bold mt-0.5">{shop.radius_meter}m</p>
          </div>
        </div>

        {/* Plan features */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Fitur Paket {plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2 text-sm">
              <span className="text-primary font-bold">✓</span> QR Code & NFC URL
            </li>
            <li className="flex items-center gap-2 text-sm">
              <span className="text-primary font-bold">✓</span> {nfcCount} NFC Card
            </li>
            <li className={`flex items-center gap-2 text-sm ${plan === 'starter' ? 'text-muted-foreground line-through' : ''}`}>
              <span className={plan === 'starter' ? 'text-muted-foreground' : 'text-primary font-bold'}>
                {plan === 'starter' ? '✗' : '✓'}
              </span>
              Logo coffee shop di app
            </li>
            <li className={`flex items-center gap-2 text-sm ${plan === 'starter' ? 'text-muted-foreground line-through' : ''}`}>
              <span className={plan === 'starter' ? 'text-muted-foreground' : 'text-primary font-bold'}>
                {plan === 'starter' ? '✗' : '✓'}
              </span>
              Nama coffee shop custom di header app
            </li>
            <li className={`flex items-center gap-2 text-sm ${plan !== 'pro' ? 'text-muted-foreground line-through' : ''}`}>
              <span className={plan !== 'pro' ? 'text-muted-foreground' : 'text-amber-600 font-bold'}>
                {plan !== 'pro' ? '✗' : '✓'}
              </span>
              Custom design card
            </li>
          </ul>
        </div>

        {/* Subscription info */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Akses Berakhir</p>
            <p className="text-sm font-medium mt-0.5">
              {shop.expires_at
                ? new Date(shop.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
            </p>
          </div>
          {shop.owner_contact && (
            <div>
              <p className="text-xs text-muted-foreground">Kontak Pemilik</p>
              <p className="text-sm font-medium mt-0.5">{shop.owner_contact}</p>
            </div>
          )}
        </div>

        {/* Koordinat */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Latitude</p>
            <p className="text-sm font-mono mt-0.5">{shop.latitude}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Longitude</p>
            <p className="text-sm font-mono mt-0.5">{shop.longitude}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Link href={`/admin/coffee-shops/${id}/edit`}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition">
            Edit
          </Link>
          <ToggleActiveButton id={id} isActive={shop.is_active} />
          <DeleteShopButton id={id} />
        </div>
      </div>
    </div>
  )
}
