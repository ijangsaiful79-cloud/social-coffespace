import { Coffee } from 'lucide-react'

export default function ShopLoading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Coffee size={36} strokeWidth={1.5} className="mx-auto mb-4 animate-pulse text-primary" />
        <div className="w-48 h-5 bg-muted rounded mx-auto mb-2 animate-pulse" />
        <div className="w-36 h-4 bg-muted rounded mx-auto animate-pulse" />
      </div>
    </main>
  )
}
