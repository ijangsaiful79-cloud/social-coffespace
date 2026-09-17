'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  id: string
  isActive: boolean
}

export default function ShopListActions({ id, isActive }: Props) {
  const router = useRouter()
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function toggle() {
    setToggling(true)
    await fetch(`/api/admin/coffee-shops/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    router.refresh()
    setToggling(false)
  }

  async function handleDelete() {
    if (!confirm('Hapus coffee shop ini? Semua sesi aktif akan berakhir.')) return
    setDeleting(true)
    await fetch(`/api/admin/coffee-shops/${id}`, { method: 'DELETE' })
    router.refresh()
    setDeleting(false)
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Link
        href={`/admin/coffee-shops/${id}`}
        className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium hover:bg-muted transition"
      >
        Detail
      </Link>
      <Link
        href={`/admin/coffee-shops/${id}/edit`}
        className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium hover:bg-muted transition"
      >
        Edit
      </Link>
      <button
        onClick={toggle}
        disabled={toggling}
        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
          isActive
            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        }`}
      >
        {toggling ? '...' : isActive ? 'Nonaktif' : 'Aktifkan'}
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition disabled:opacity-50"
      >
        {deleting ? '...' : 'Hapus'}
      </button>
    </div>
  )
}
