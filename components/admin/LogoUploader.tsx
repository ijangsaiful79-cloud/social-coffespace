'use client'

import { useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Props {
  currentLogoUrl?: string | null
  onUpload: (url: string) => void
}

export default function LogoUploader({ currentLogoUrl, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      // Compress to max 300px square
      const blob = await new Promise<Blob>((resolve, reject) => {
        const img = new window.Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          const MAX = 300
          let { width, height } = img
          if (width > MAX || height > MAX) {
            if (width >= height) { height = Math.round(height * MAX / width); width = MAX }
            else { width = Math.round(width * MAX / height); height = MAX }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)
          URL.revokeObjectURL(url)
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error('canvas failed')), 'image/jpeg', 0.85)
        }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
        img.src = url
      })

      const form = new FormData()
      form.append('file', blob, 'logo.jpg')
      const res = await fetch('/api/admin/coffee-shops/upload-logo', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload gagal')
      const { url } = await res.json()
      setPreview(url)
      onUpload(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload gagal')
    } finally {
      setUploading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleRemove() {
    setPreview(null)
    onUpload('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Logo Coffee Shop</label>
      <div className="flex items-center gap-4">
        <div
          className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition"
          onClick={() => !uploading && inputRef.current?.click()}
        >
          {preview ? (
            <Image src={preview} alt="logo" fill className="object-cover" sizes="80px" />
          ) : uploading ? (
            <Loader2 size={22} className="text-muted-foreground animate-spin" />
          ) : (
            <ImagePlus size={22} className="text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition disabled:opacity-60"
          >
            {uploading ? 'Mengupload...' : preview ? 'Ganti Logo' : 'Upload Logo'}
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition"
            >
              <X size={12} strokeWidth={2.5} /> Hapus logo
            </button>
          )}
          <p className="text-xs text-muted-foreground">PNG/JPG, maks 300×300px</p>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,image/heic,image/heif"
        onChange={handleChange}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
      />
    </div>
  )
}
