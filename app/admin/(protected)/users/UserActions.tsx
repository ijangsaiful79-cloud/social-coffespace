'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ToggleChatButton({ userId, chatEnabled }: { userId: string; chatEnabled: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_enabled: !chatEnabled }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-3 py-1 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
        chatEnabled
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {loading ? '...' : chatEnabled ? 'On' : 'Off'}
    </button>
  )
}

export function BanUserButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleBan() {
    if (!confirm('Hapus user ini? Aksi ini tidak bisa dibatalkan.')) return
    setLoading(true)
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleBan}
      disabled={loading}
      className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition disabled:opacity-50"
    >
      {loading ? '...' : 'Hapus'}
    </button>
  )
}
