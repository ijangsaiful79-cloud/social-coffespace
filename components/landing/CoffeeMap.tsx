'use client'

import { useEffect, useRef } from 'react'

export interface ShopPin {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
}

export default function CoffeeMap({ shops }: { shops: ShopPin[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || instanceRef.current || shops.length === 0) return

    async function init() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      if (!mapRef.current || instanceRef.current) return

      const center: [number, number] =
        shops.length === 1
          ? [shops[0].latitude, shops[0].longitude]
          : [
              shops.reduce((s, p) => s + p.latitude, 0) / shops.length,
              shops.reduce((s, p) => s + p.longitude, 0) / shops.length,
            ]

      const map = L.map(mapRef.current, {
        center,
        zoom: shops.length === 1 ? 15 : 12,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      })
      instanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      const pin = (color: string) =>
        L.divIcon({
          html: `<svg width="26" height="34" viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 21 13 21S26 22.75 26 13C26 5.82 20.18 0 13 0z" fill="${color}" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"/>
            <circle cx="13" cy="13" r="6" fill="white" fill-opacity="0.95"/>
            <circle cx="13" cy="13" r="3.5" fill="${color}"/>
          </svg>`,
          className: '',
          iconSize: [26, 34],
          iconAnchor: [13, 34],
          popupAnchor: [0, -36],
        })

      shops.forEach((shop) => {
        L.marker([shop.latitude, shop.longitude], { icon: pin('#c06c2e') })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:system-ui,sans-serif;min-width:160px;">
              <p style="font-weight:700;font-size:14px;margin:0 0 4px;">${shop.name}</p>
              <p style="color:#8a7468;font-size:12px;margin:0;">${shop.address}</p>
            </div>`,
            { closeButton: false, maxWidth: 220 }
          )
      })

      if (shops.length > 1) {
        const bounds = L.latLngBounds(shops.map((s) => [s.latitude, s.longitude]))
        map.fitBounds(bounds, { padding: [40, 40] })
      }
    }

    init()

    return () => {
      if (instanceRef.current) {
        ;(instanceRef.current as { remove: () => void }).remove()
        instanceRef.current = null
      }
    }
  }, [shops])

  if (shops.length === 0) {
    return (
      <div className="h-72 rounded-2xl bg-muted flex flex-col items-center justify-center gap-2">
        <p className="text-sm text-muted-foreground">Belum ada coffee shop terdaftar.</p>
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      className="h-72 md:h-96 w-full rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    />
  )
}
