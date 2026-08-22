import { LeaveBalance } from "@/lib/types";

export default function BalanceCard({ balance }: { balance: LeaveBalance }) {
  const pctUsed = balance.entitled_days > 0 ? Math.min(100, (balance.used_days / balance.entitled_days) * 100) : 0;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">{balance.leave_type_code}</span>
        <span className="text-xs text-muted">{balance.year}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums">{balance.available_days}</div>
      <div className="text-xs text-muted mb-3">day(s) available</div>
      <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
        <div className="h-full bg-brand" style={{ width: `${pctUsed}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted mt-2">
        <span>Used {balance.used_days}</span>
        <span>Entitled {balance.entitled_days}</span>
      </div>
    </div>
  );
}
