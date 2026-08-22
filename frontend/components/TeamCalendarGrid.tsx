import { CalendarEntry } from "@/lib/types";
import Avatar from "@/components/Avatar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const KIND_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  LEAVE: { bg: "bg-danger-soft", border: "border-danger/60", text: "text-danger" },
  WFH: { bg: "bg-brand-soft", border: "border-brand/60", text: "text-brand" },
  OD: { bg: "bg-[#f1eafe]", border: "border-[#7c3aed]/60", text: "text-[#7c3aed]" },
};

const MAX_VISIBLE = 4;

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function TeamCalendarGrid({ entries, year, month }: { entries: CalendarEntry[]; year: number; month: number }) {
  const total = daysInMonth(year, month);
  const byDate: Record<string, CalendarEntry[]> = {};
  for (const e of entries) {
    byDate[e.date] = byDate[e.date] || [];
    byDate[e.date].push(e);
  }

  const firstOfMonth = new Date(year, month, 1);
  const leadingBlanks = firstOfMonth.getDay();
  const cells: (number | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-3 py-2 text-xs font-semibold text-muted text-center border-r border-border last:border-r-0">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className="min-h-[120px] border-r border-b border-border last:border-r-0 bg-canvas/40" />;
          }
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEntries = byDate[dateStr] || [];
          const isToday = dateStr === todayIso;

          return (
            <div key={idx} className="min-h-[120px] border-r border-b border-border last:border-r-0 p-1.5">
              <div
                className={`text-xs font-medium mb-1.5 h-6 w-6 flex items-center justify-center rounded-full ${
                  isToday ? "bg-brand text-white" : "text-ink"
                }`}
              >
                {day}
              </div>
              <div className="space-y-1">
                {dayEntries.slice(0, MAX_VISIBLE).map((e, i) => {
                  const style = KIND_STYLE[e.request_kind] || KIND_STYLE.LEAVE;
                  return (
                    <div
                      key={i}
                      title={`${e.employee_name} — ${e.leave_type_code || e.display_status}`}
                      className={`flex items-center gap-1.5 rounded-md border-l-2 ${style.bg} ${style.border} px-1.5 py-1`}
                    >
                      <Avatar name={e.employee_name} size={16} pictureUrl={e.picture_url} />
                      <span className={`text-[11px] font-medium truncate ${style.text}`}>
                        {e.employee_code} - {e.employee_name}
                      </span>
                    </div>
                  );
                })}
                {dayEntries.length > MAX_VISIBLE && (
                  <div className="text-[11px] text-muted px-1.5">+{dayEntries.length - MAX_VISIBLE} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
