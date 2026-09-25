'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import LocationPicker from '@/components/admin/LocationPicker'

type Plan = 'starter' | 'business' | 'pro'

const PLANS: { key: Plan; label: string; nfc: number }[] = [
  { key: 'starter',  label: 'Starter',  nfc: 5  },
  { key: 'business', label: 'Business', nfc: 10 },
  { key: 'pro',      label: 'Pro',      nfc: 20 },
]

const PLAN_STYLE: Record<Plan, string> = {
  starter:  'border-border bg-muted text-foreground',
  business: 'border-primary bg-primary/5 text-primary',
  pro:      'border-amber-400 bg-amber-50 text-amber-700',
}

interface Props { params: Promise<{ id: string }> }

export default function EditCoffeeShopPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [radius, setRadius] = useState('100')
  const [plan, setPlan] = useState<Plan>('starter')
  const [expiresAt, setExpiresAt] = useState('')
  const [ownerContact, setOwnerContact] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/coffee-shops/${id}`)
      .then((r) => r.json())
      .then((shop) => {
        setName(shop.name)
        setAddress(shop.address)
        setLat(shop.latitude)
        setLng(shop.longitude)
        setRadius(String(shop.radius_meter))
        setPlan((shop.plan ?? 'starter') as Plan)
        setExpiresAt(shop.expires_at ? shop.expires_at.split('T')[0] : '')
        setOwnerContact(shop.owner_contact ?? '')
        setLoading(false)
      })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lat || !lng) { setError('Pilih lokasi terlebih dahulu.'); return }
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/admin/coffee-shops/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        radius_meter: parseInt(radius),
        plan,
        expires_at: expiresAt || null,
        owner_contact: ownerContact.trim() || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Gagal menyimpan')
      setSaving(false)
      return
    }

    router.push(`/admin/coffee-shops/${id}`)
    router.refresh()
  }

  if (loading) return <div className="text-muted-foreground text-sm animate-pulse">Memuat...</div>

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Edit Coffee Shop</h1>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Plan selector */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm font-semibold mb-3">Paket</p>
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((p) => (
              <button key={p.key} type="button" onClick={() => setPlan(p.key)}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  plan === p.key ? PLAN_STYLE[p.key] : 'border-border hover:bg-muted/50 text-muted-foreground'
                }`}>
                <p className="text-xs font-bold">{p.label}</p>
                <p className="text-[10px] mt-0.5">{p.nfc} NFC Card</p>
              </button>
            ))}
          </div>
        </div>

        {/* Data shop */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold">Data Coffee Shop</p>

          <div>
            <label className="block text-sm font-medium mb-1">Nama <span className="text-red-400">*</span></label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Alamat <span className="text-red-400">*</span></label>
            <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kontak Pemilik</label>
            <input type="text" value={ownerContact} onChange={(e) => setOwnerContact(e.target.value)}
              placeholder="Nama / No. WA pemilik"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tanggal Akses Berakhir</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
          </div>

          <LocationPicker lat={lat} lng={lng}
            onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng) }} />

          <div>
            <label className="block text-sm font-medium mb-1">Radius GPS (meter)</label>
            <input type="number" required min={50} max={500} value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition">
            Batal
          </button>
          <button type="submit" disabled={saving || !lat || !lng}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-60">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  )
}
