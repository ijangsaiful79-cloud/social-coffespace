export default function ShopLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4 animate-pulse">☕</div>
        <div className="w-48 h-6 bg-muted rounded mx-auto mb-2 animate-pulse" />
        <div className="w-36 h-4 bg-muted rounded mx-auto animate-pulse" />
      </div>
    </main>
  )
}
