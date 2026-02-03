export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="mb-8 h-8 w-40 animate-pulse rounded bg-neutral-200" />

      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({length: 12}).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square rounded bg-neutral-200" />

            <div className="mt-3 h-4 w-3/4 rounded bg-neutral-200" />

            <div className="mt-2 h-4 w-1/2 rounded bg-neutral-200" />
          </div>
        ))}
      </div>
    </main>
  )
}
