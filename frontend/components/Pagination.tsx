"use client";

import Icon from "@/components/Icon";

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-border text-[12.5px] text-muted">
      <div>
        {total === 0 ? "No results" : `Showing ${start}–${end} of ${total}`}
      </div>
      <div className="flex items-center gap-3">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-7 rounded-md border border-border bg-surface px-1.5 text-[12px]"
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-7 w-7 rounded-md border border-border flex items-center justify-center disabled:opacity-40 hover:bg-canvas"
          >
            <Icon name="chevronLeft" className="h-3.5 w-3.5" />
          </button>
          <span className="px-1.5 text-ink font-medium">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-7 w-7 rounded-md border border-border flex items-center justify-center disabled:opacity-40 hover:bg-canvas"
          >
            <Icon name="chevronRight" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
