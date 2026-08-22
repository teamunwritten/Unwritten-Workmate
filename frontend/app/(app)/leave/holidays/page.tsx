import { backendFetch } from "@/lib/session";
import { UpcomingHoliday } from "@/lib/types";
import LeaveSectionTabs from "@/components/LeaveSectionTabs";
import Icon from "@/components/Icon";

async function getHolidays(year: number): Promise<UpcomingHoliday[]> {
  const res = await backendFetch(`/leave/holidays?year=${year}`);
  if (!res.ok) return [];
  return res.json();
}

export default async function HolidaysPage({ searchParams }: { searchParams: { year?: string } }) {
  const year = Number(searchParams.year) || new Date().getFullYear();
  const holidays = await getHolidays(year);

  const statutory = holidays.filter((h) => h.holiday_type === "STATUTORY");
  const optional = holidays.filter((h) => h.holiday_type === "OPTIONAL");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight mb-1">Leave</h1>
      </div>
      <LeaveSectionTabs />

      <div>
        <h2 className="text-sm font-semibold mb-3">Holidays {year}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Icon name="holiday" className="h-4 w-4 text-brand" />
              <span className="text-sm font-semibold">Statutory</span>
            </div>
            {statutory.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted">No statutory holidays.</div>
            ) : (
              <ul>
                {statutory.map((h) => (
                  <li key={h.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0 text-sm">
                    <span className="font-medium">{h.name}</span>
                    <span className="text-muted">
                      {new Date(h.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Icon name="sun" className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold">Optional / Floating</span>
            </div>
            {optional.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted">No optional holidays.</div>
            ) : (
              <ul>
                {optional.map((h) => (
                  <li key={h.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0 text-sm">
                    <span className="font-medium">{h.name}</span>
                    <span className="text-muted">
                      {new Date(h.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="text-xs text-muted mt-3">
          Apply for an optional holiday via "Leave Application" using the Optional Holiday leave type on that date.
        </p>
      </div>
    </div>
  );
}
