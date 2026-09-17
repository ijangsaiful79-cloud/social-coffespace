'use client'

interface Props {
  shopName: string
  onExit: () => void
  loading?: boolean
}

export default function LocationExitAlert({ shopName, onExit, loading = false }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] px-6">
      <div className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
        <div className="text-5xl mb-4">📍</div>
        <h2 className="font-bold text-lg mb-2">Kamu sudah meninggalkan area</h2>
        <p className="text-sm font-semibold mb-1">{shopName}</p>
        <p className="text-sm text-muted-foreground mb-6">
          Sesi berakhir otomatis karena kamu sudah tidak berada di dalam area coffee shop ini.
        </p>
        <button
          onClick={onExit}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-60"
        >
          {loading ? 'Keluar...' : 'OK, Keluar'}
        </button>
      </div>
    </div>
  )
}
