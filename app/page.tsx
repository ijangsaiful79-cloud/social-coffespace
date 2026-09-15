export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">☕</div>
        <h1 className="text-3xl font-bold mb-3">Coffee Dating</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Meet people who are sharing your coffee moment, right now, in this coffee shop.
        </p>
        <p className="text-sm text-muted-foreground border border-border rounded-xl px-4 py-3 bg-muted">
          Scan the QR code or tap the NFC tag at your coffee shop to get started.
        </p>
      </div>
    </main>
  );
}
