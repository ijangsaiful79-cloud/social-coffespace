'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'

interface Props { params: Promise<{ id: string }> }

export default function EditCoffeeShopPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
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
        setLatitude(String(shop.latitude))
        setLongitude(String(shop.longitude))
        setRadius(String(shop.radius_meter))
        setLoading(false)
      })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/admin/coffee-shops/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        address: address.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
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

  if (loading) return <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Latitude <span className="text-red-400">*</span></label>
            <input type="number" required step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Longitude <span className="text-red-400">*</span></label>
            <input type="number" required step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Radius (meter)</label>
          <input type="number" required min={50} max={500} value={radius} onChange={(e) => setRadius(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition">
            Batal
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-60">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  )
}
