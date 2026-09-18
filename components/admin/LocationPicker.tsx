'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Link as LinkIcon, X } from 'lucide-react'

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}

function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  try {
    // @lat,lng (most common share format)
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
    // q=lat,lng
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }
    // ll=lat,lng
    const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) }
    return null
  } catch {
    return null
  }
}

export default function LocationPicker({ lat, lng, onChange }: Props) {
  const [mode, setMode] = useState<'link' | 'map'>('link')
  const [linkInput, setLinkInput] = useState('')
  const [linkError, setLinkError] = useState('')
  const mapRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<unknown>(null)
  const markerRef = useRef<unknown>(null)

  function handleLinkPaste(value: string) {
    setLinkInput(value)
    setLinkError('')
    if (!value.trim()) return
    const result = parseGoogleMapsUrl(value.trim())
    if (result) {
      onChange(result.lat, result.lng)
      setLinkError('')
    } else {
      setLinkError('Format link tidak dikenali. Coba link share langsung dari Google Maps.')
    }
  }

  useEffect(() => {
    if (mode !== 'map') {
      if (instanceRef.current) {
        ;(instanceRef.current as { remove: () => void }).remove()
        instanceRef.current = null
        markerRef.current = null
      }
      return
    }

    if (!mapRef.current || instanceRef.current) return

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (!mapRef.current || instanceRef.current) return

      const center: [number, number] = lat && lng ? [lat, lng] : [-2.5, 118.0]
      const zoom = lat && lng ? 15 : 5

      const map = L.map(mapRef.current, { center, zoom, scrollWheelZoom: true })
      instanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      const pinIcon = L.divIcon({
        html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z" fill="#C57A6E" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"/>
          <circle cx="14" cy="14" r="6" fill="white" fill-opacity="0.95"/>
          <circle cx="14" cy="14" r="3.5" fill="#C57A6E"/>
        </svg>`,
        className: '',
        iconSize: [28, 36],
        iconAnchor: [14, 36],
      })

      if (lat && lng) {
        markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map)
      }

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        const { lat: newLat, lng: newLng } = e.latlng
        onChange(newLat, newLng)
        if (markerRef.current) {
          ;(markerRef.current as { setLatLng: (ll: [number, number]) => void }).setLatLng([newLat, newLng])
        } else {
          markerRef.current = L.marker([newLat, newLng], { icon: pinIcon }).addTo(map)
        }
      })
    }

    initMap()

    return () => {
      if (instanceRef.current) {
        ;(instanceRef.current as { remove: () => void }).remove()
        instanceRef.current = null
        markerRef.current = null
      }
    }
  }, [mode])

  // Update marker when lat/lng changes externally (from link input while map is open)
  useEffect(() => {
    if (!instanceRef.current || !lat || !lng) return
    const map = instanceRef.current as { panTo: (ll: [number, number]) => void }
    map.panTo([lat, lng])
    // marker update handled via map click handler
  }, [lat, lng])

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Lokasi <span className="text-red-400">*</span>
      </label>

      {/* Mode toggle */}
      <div className="flex gap-2 bg-muted/50 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${mode === 'link' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <LinkIcon size={14} strokeWidth={2} /> Tempel Link Maps
        </button>
        <button
          type="button"
          onClick={() => setMode('map')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${mode === 'map' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <MapPin size={14} strokeWidth={2} /> Pilih di Peta
        </button>
      </div>

      {/* Link mode */}
      {mode === 'link' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Buka Google Maps → cari lokasi → klik <strong>Share</strong> → copy link → tempel di sini
          </p>
          <div className="relative">
            <input
              type="url"
              value={linkInput}
              onChange={(e) => handleLinkPaste(e.target.value)}
              placeholder="https://maps.app.goo.gl/... atau https://www.google.com/maps/..."
              className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
            {linkInput && (
              <button type="button" onClick={() => { setLinkInput(''); setLinkError('') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </div>
          {linkError && <p className="text-xs text-red-500">{linkError}</p>}
        </div>
      )}

      {/* Map mode */}
      {mode === 'map' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Klik pada peta untuk menandai lokasi coffee shop</p>
          <div
            ref={mapRef}
            className="w-full rounded-xl overflow-hidden border border-border"
            style={{ height: 300 }}
          />
        </div>
      )}

      {/* Koordinat preview */}
      {lat && lng ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 border border-border">
          <MapPin size={14} strokeWidth={2} className="text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-primary hover:underline"
          >
            Cek di Maps
          </a>
        </div>
      ) : (
        <div className="px-4 py-3 rounded-xl bg-muted/30 border border-dashed border-border">
          <p className="text-xs text-muted-foreground text-center">Belum ada lokasi dipilih</p>
        </div>
      )}
    </div>
  )
}
