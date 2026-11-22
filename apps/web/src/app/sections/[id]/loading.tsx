export default function SectionLoading() {
  return (
    <div role="status" aria-label="Завантаження">
      <div className="skeleton-shimmer h-64 bg-muted sm:h-80" />
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="skeleton-shimmer h-8 w-2/3 rounded-full bg-muted" />
          <div className="skeleton-shimmer h-4 w-full rounded-full bg-muted" />
          <div className="skeleton-shimmer h-4 w-5/6 rounded-full bg-muted" />
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton-shimmer h-20 rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="skeleton-shimmer h-48 rounded-3xl bg-muted" />
      </div>
    </div>
  );
}
