import Icon from "@/components/Icon";
import { LeaveBalance } from "@/lib/types";

const TYPE_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  CL: { icon: "calendar", color: "#2e6fe8", bg: "#e8f0fe" },
  SL: { icon: "medkit", color: "#e0a930", bg: "#fdf1e0" },
  OL: { icon: "sun", color: "#0f9d58", bg: "#e4f6ec" },
  WFH: { icon: "home", color: "#d33a6a", bg: "#fbe6ee" },
  OD: { icon: "badge", color: "#7c3aed", bg: "#f1eafe" },
  LOP: { icon: "adjustment", color: "#c4271e", bg: "#fbe9e8" },
};

export default function LeaveTypeIconCard({ balance, label }: { balance: LeaveBalance; label: string }) {
  const style = TYPE_STYLE[balance.leave_type_code] || { icon: "leaveType", color: "#67707c", bg: "#f5f6f8" };
  return (
    <div className="card p-4">
      <div className="text-sm font-semibold mb-3 truncate">{label}</div>
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center mb-4"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        <Icon name={style.icon as any} className="h-5 w-5" />
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Available</span>
          <span className="font-medium tabular-nums">{balance.available_days}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Taken</span>
          <span className="font-medium tabular-nums">{balance.used_days}</span>
        </div>
      </div>
    </div>
  );
}
