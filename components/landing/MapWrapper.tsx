'use client'

import dynamic from 'next/dynamic'
import type { ShopPin } from './CoffeeMap'

const CoffeeMap = dynamic(() => import('./CoffeeMap'), {
  ssr: false,
  loading: () => (
    <div
      className="h-72 md:h-96 rounded-2xl bg-muted animate-pulse"
      style={{ border: '1px solid var(--border)' }}
    />
  ),
})

export default function MapWrapper({ shops }: { shops: ShopPin[] }) {
  return <CoffeeMap shops={shops} />
}
