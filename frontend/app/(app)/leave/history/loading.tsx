import TableSkeleton from "@/components/skeletons/TableSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-40 rounded bg-border animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-border animate-pulse" />
        ))}
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
