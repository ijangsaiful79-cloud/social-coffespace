'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import LocationPicker from '@/components/admin/LocationPicker'

interface Props { params: Promise<{ id: string }> }

export default function EditCoffeeShopPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [radius, setRadius] = useState('100')
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

      <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-2xl p-6">
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

        <LocationPicker
          lat={lat}
          lng={lng}
          onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng) }}
        />

        <div>
          <label className="block text-sm font-medium mb-1">Radius GPS (meter)</label>
          <input type="number" required min={50} max={500} value={radius} onChange={(e) => setRadius(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
          <p className="text-xs text-muted-foreground mt-1">Jarak maksimal dari coffee shop agar pengguna bisa check-in (50–500m)</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
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
