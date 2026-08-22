const ACCENTS: Record<string, string> = {
  danger: "border-t-danger",
  brand: "border-t-brand",
  success: "border-t-success",
  warning: "border-t-warning",
  purple: "border-t-[#7c3aed]",
};

export default function DashboardWidget({
  title,
  accent = "brand",
  action,
  children,
}: {
  title: string;
  accent?: keyof typeof ACCENTS;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`card border-t-2 ${ACCENTS[accent]} flex flex-col h-full`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      <div className="p-4 flex-1 overflow-y-auto max-h-72">{children}</div>
    </div>
  );
}

export function WidgetEmpty({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted text-center py-6">{children}</div>;
}
