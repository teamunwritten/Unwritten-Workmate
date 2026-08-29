import TableSkeleton from "@/components/skeletons/TableSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-40 rounded bg-border animate-pulse" />
      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}
