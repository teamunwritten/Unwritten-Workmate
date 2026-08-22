import { CurrentUser, roleLabel } from "@/lib/types";
import Avatar from "@/components/Avatar";

function StatCircle({ value, label, tone }: { value: number; label: string; tone: "warning" | "success" | "brand" }) {
  const toneClass = { warning: "border-warning text-warning", success: "border-success text-success", brand: "border-brand text-brand" }[tone];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`h-11 w-11 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${toneClass}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted whitespace-nowrap">{label}</div>
    </div>
  );
}

export default function ProfileHeader({
  user,
  stats,
}: {
  user: CurrentUser;
  stats: { pending: number; approved: number; daysTaken: number };
}) {
  return (
    <div className="card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
      <div className="flex items-center gap-4 min-w-0">
        <Avatar name={user.full_name} size={64} pictureUrl={user.picture_url} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold tracking-tight truncate">{user.full_name}</h1>
            <span className="text-xs text-muted">{user.employee_code}</span>
          </div>
          <div className="text-sm text-muted">
            {user.position || roleLabel(user.role)}
            {user.department_name ? ` · ${user.department_name}` : ""}
          </div>
          <div className="text-xs text-muted mt-0.5">{user.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-6 shrink-0 pl-1">
        <StatCircle value={stats.pending} label="Pending" tone="warning" />
        <StatCircle value={stats.approved} label="Approved" tone="success" />
        <StatCircle value={stats.daysTaken} label="Days taken" tone="brand" />
      </div>
    </div>
  );
}
