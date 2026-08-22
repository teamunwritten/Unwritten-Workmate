const STYLES: Record<string, { bg: string; dot: string; text: string }> = {
  PENDING: { bg: "bg-warning-soft", dot: "bg-warning", text: "text-warning" },
  PENDING_APPROVAL: { bg: "bg-warning-soft", dot: "bg-warning", text: "text-warning" },
  APPROVED: { bg: "bg-success-soft", dot: "bg-success", text: "text-success" },
  REJECTED: { bg: "bg-danger-soft", dot: "bg-danger", text: "text-danger" },
  BLOCKED: { bg: "bg-danger-soft", dot: "bg-danger", text: "text-danger" },
  CANCELLED: { bg: "bg-canvas", dot: "bg-muted", text: "text-muted" },
  LOP_CONVERTED: { bg: "bg-brand-soft", dot: "bg-brand", text: "text-brand" },
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] || { bg: "bg-canvas", dot: "bg-muted", text: "text-muted" };
  return (
    <span className={`badge ${style.bg} ${style.text}`}>
      <span className={`status-dot ${style.dot}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}
