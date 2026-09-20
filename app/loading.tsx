export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-5xl flex-col gap-5 p-5" aria-label="Memuat aplikasi">
      <div className="h-8 w-52 animate-pulse rounded-xl bg-[var(--color-bg-elevated)]" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-2xl bg-[var(--color-bg-elevated)]" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-[var(--color-bg-elevated)]" />
    </main>
  );
}
