export default function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="h-4 w-40 rounded bg-border animate-pulse" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-5 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-3.5 rounded bg-border animate-pulse"
                style={{ width: c === 0 ? "22%" : `${100 / cols - 8}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
