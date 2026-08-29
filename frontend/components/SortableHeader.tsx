"use client";

export default function SortableHeader({
  label,
  sortKey,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string;
  sortKey: string;
  sortBy: string | null;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
}) {
  const active = sortBy === sortKey;
  return (
    <th>
      <button onClick={() => onSort(sortKey)} className={`flex items-center gap-1 select-none hover:text-ink ${active ? "text-ink" : ""}`}>
        {label}
        <span className={`text-[10px] w-2.5 inline-block ${active ? "opacity-100" : "opacity-0"}`}>{sortDir === "asc" ? "▲" : "▼"}</span>
      </button>
    </th>
  );
}
