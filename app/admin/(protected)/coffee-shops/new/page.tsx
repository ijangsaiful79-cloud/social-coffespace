'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateCoffeeShopToken } from '@/lib/utils/token'
import LocationPicker from '@/components/admin/LocationPicker'

type Plan = 'starter' | 'business' | 'pro'

const PLANS: { key: Plan; label: string; price: string; nfc: number; features: string[] }[] = [
  {
    key: 'starter', label: 'Starter', price: 'Rp 599.000', nfc: 5,
    features: ['5 NFC Card', 'QR Code', '1 Tahun Akses'],
  },
  {
    key: 'business', label: 'Business', price: 'Rp 899.000', nfc: 10,
    features: ['10 NFC Card', 'QR Code', 'Custom nama shop'],
  },
  {
    key: 'pro', label: 'Pro', price: 'Rp 1.399.000', nfc: 20,
    features: ['20 NFC Card', 'QR Code', 'Custom design card'],
  },
]

export default function NewCoffeeShopPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [radius, setRadius] = useState('100')
  const [plan, setPlan] = useState<Plan>('starter')
  const [expiresAt, setExpiresAt] = useState('')
  const [ownerContact, setOwnerContact] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lat || !lng) { setError('Pilih lokasi terlebih dahulu.'); return }
    setLoading(true)
    setError(null)

    const accessToken = generateCoffeeShopToken(name)

    const res = await fetch('/api/admin/coffee-shops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        radius_meter: parseInt(radius),
        access_token: accessToken,
        slug: accessToken.split('-').slice(0, -1).join('-'),
        plan,
        expires_at: expiresAt || null,
        owner_contact: ownerContact.trim() || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Gagal membuat coffee shop')
      setLoading(false)
      return
    }

    router.push('/admin/coffee-shops')
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Tambah Coffee Shop</h1>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Plan selector */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm font-semibold mb-3">Pilih Paket</p>
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPlan(p.key)}
                className={`rounded-xl border p-3 text-left transition ${
                  plan === p.key
                    ? p.key === 'pro'
                      ? 'border-amber-400 bg-amber-50'
                      : p.key === 'business'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-muted'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <p className={`text-xs font-bold mb-1 ${
                  plan === p.key
                    ? p.key === 'pro' ? 'text-amber-600' : p.key === 'business' ? 'text-primary' : 'text-foreground'
                    : 'text-muted-foreground'
                }`}>{p.label}</p>
                <p className="text-[11px] font-semibold text-foreground">{p.price}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{p.nfc} NFC Card</p>
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-1">
            {PLANS.find((p) => p.key === plan)?.features.map((f) => (
              <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="text-primary">✓</span> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Data shop */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold">Data Coffee Shop</p>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nama <span className="text-red-400">*</span>
            </label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Kopi Senja"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Alamat <span className="text-red-400">*</span>
            </label>
            <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. Sudirman No. 1, Jakarta"
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
            <p className="text-xs text-muted-foreground mt-1">50–500m dari titik coffee shop</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition">
            Batal
          </button>
          <button type="submit" disabled={loading || !lat || !lng}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-60">
            {loading ? 'Membuat...' : 'Buat & Generate QR'}
          </button>
        </div>
      </form>
    </div>
  )
}
