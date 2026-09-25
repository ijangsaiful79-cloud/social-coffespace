'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Action = 'resolve' | 'disable_chat' | 'delete_user'

export default function ResolveButton({ reportId, reportedUserId }: { reportId: string; reportedUserId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAction(action: Action) {
    if (action === 'delete_user' && !confirm('Hapus user ini permanen? Tidak bisa dibatalkan.')) return
    setLoading(true)
    await fetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reported_user_id: reportedUserId }),
    })
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="px-3 py-1 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? '...' : 'Aksi'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-52 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => handleAction('resolve')}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition"
            >
              ✅ Resolve saja
            </button>
            <button
              onClick={() => handleAction('disable_chat')}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition border-t border-border"
            >
              🔇 Resolve + Nonaktifkan Chat
            </button>
            <button
              onClick={() => handleAction('delete_user')}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition border-t border-border"
            >
              🗑️ Resolve + Hapus User
            </button>
          </div>
        </>
      )}
    </div>
  )
}
