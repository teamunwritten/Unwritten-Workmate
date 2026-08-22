import Link from "next/link";
import { backendFetch } from "@/lib/session";
import { CalendarEntry } from "@/lib/types";
import TeamCalendarGrid from "@/components/TeamCalendarGrid";
import Icon from "@/components/Icon";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

async function getCalendar(dateFrom: string, dateTo: string): Promise<CalendarEntry[]> {
  const res = await backendFetch(`/calendar/team?date_from=${dateFrom}&date_to=${dateTo}`);
  if (!res.ok) return [];
  return res.json();
}

export default async function CalendarPage({ searchParams }: { searchParams: { year?: string; month?: string } }) {
  const now = new Date();
  const year = Number(searchParams.year) || now.getFullYear();
  const month = searchParams.month !== undefined ? Number(searchParams.month) : now.getMonth();

  const dateFrom = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const dateTo = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const entries = await getCalendar(dateFrom, dateTo);

  const prev = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const next = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">Team calendar</h1>
        <p className="text-sm text-muted">
          Who's away across the org this month. Peers see "On Leave"; managers and HR see the leave type.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Link
          href={`/calendar?year=${prev.year}&month=${prev.month}`}
          className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-canvas"
        >
          <Icon name="chevronLeft" className="h-4 w-4 text-muted" />
        </Link>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-surface">
          <Icon name="calendar" className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold">
            {MONTH_NAMES[month]} {year}
          </span>
        </div>
        <Link
          href={`/calendar?year=${next.year}&month=${next.month}`}
          className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-canvas"
        >
          <Icon name="chevronRight" className="h-4 w-4 text-muted" />
        </Link>
      </div>

      <TeamCalendarGrid entries={entries} year={year} month={month} />
    </div>
  );
}
