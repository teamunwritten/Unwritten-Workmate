"use client";

export default function BulkActionBar({
  count,
  onClear,
  actions,
}: {
  count: number;
  onClear: () => void;
  actions: { label: string; onClick: () => void; variant?: "default" | "danger"; disabled?: boolean }[];
}) {
  if (count === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-2.5 bg-brand-soft border-b border-border">
      <div className="flex items-center gap-3 text-[13px]">
        <span className="font-medium text-ink">{count} selected</span>
        <button onClick={onClear} className="text-brand hover:underline">
          Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`text-[12.5px] font-medium rounded-md px-3 py-1.5 disabled:opacity-50 ${
              action.variant === "danger" ? "bg-danger text-white hover:bg-danger/90" : "bg-brand text-white hover:bg-brand-hover"
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
