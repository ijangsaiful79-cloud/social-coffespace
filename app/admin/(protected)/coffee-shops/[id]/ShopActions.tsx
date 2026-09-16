'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ToggleActiveButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    await fetch(`/api/admin/coffee-shops/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
        isActive
          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
          : 'bg-green-100 text-green-700 hover:bg-green-200'
      }`}
    >
      {loading ? '...' : isActive ? 'Nonaktifkan' : 'Aktifkan'}
    </button>
  )
}

export function DeleteShopButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Hapus coffee shop ini? Semua sesi aktif akan berakhir.')) return
    setLoading(true)
    await fetch(`/api/admin/coffee-shops/${id}`, { method: 'DELETE' })
    router.push('/admin/coffee-shops')
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition disabled:opacity-50"
    >
      {loading ? '...' : 'Hapus'}
    </button>
  )
}
