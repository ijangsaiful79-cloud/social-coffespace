export default function PeopleLoading() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="w-32 h-5 bg-muted rounded animate-pulse" />
          <div className="w-24 h-4 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-24 h-9 bg-muted rounded-xl animate-pulse" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-28 h-4 bg-muted rounded animate-pulse" />
              <div className="w-20 h-3 bg-muted rounded animate-pulse" />
            </div>
            <div className="w-20 h-9 bg-muted rounded-xl animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </main>
  )
}
