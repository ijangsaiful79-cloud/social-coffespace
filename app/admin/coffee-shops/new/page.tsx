'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateCoffeeShopToken } from '@/lib/utils/token'

export default function NewCoffeeShopPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [radius, setRadius] = useState('100')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const accessToken = generateCoffeeShopToken(name)

    const res = await fetch('/api/admin/coffee-shops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        address: address.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius_meter: parseInt(radius),
        access_token: accessToken,
        slug: accessToken.split('-').slice(0, -1).join('-'),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create coffee shop')
      setLoading(false)
      return
    }

    router.push('/admin/coffee-shops')
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Add Coffee Shop</h1>

      <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-2xl p-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kopi Senja"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Address <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Jl. Sudirman No. 1, Jakarta"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Latitude <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              required
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="-6.200000"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Longitude <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              required
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="106.816666"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Radius (meters)
          </label>
          <input
            type="number"
            required
            min={50}
            max={500}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? 'Creating...' : 'Create & Generate QR'}
          </button>
        </div>
      </form>
    </div>
  )
}
